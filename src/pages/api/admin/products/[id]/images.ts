import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const extensionFor = (file: File) => {
  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  const { data: existing } = await locals.supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle();

  if (!existing) {
    return json({ message: 'El producto no existe o fue eliminado.' }, 404);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ message: 'No pudimos leer el formulario.' }, 400);
  }

  const photos = formData
    .getAll('photos')
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!photos.length) {
    return json({ message: 'No se enviaron imágenes.' }, 422);
  }

  if (photos.some((photo) => !IMAGE_TYPES.has(photo.type))) {
    return json(
      { message: 'Solo se aceptan imágenes JPG, PNG, WEBP o GIF.' },
      422,
    );
  }

  if (photos.some((photo) => photo.size > MAX_FILE_SIZE)) {
    return json({ message: 'Cada imagen debe pesar como máximo 5 MB.' }, 422);
  }

  // Contar imágenes actuales del producto
  const { count: currentCount } = await locals.supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  const existingCount = currentCount ?? 0;
  const totalAfterUpload = existingCount + photos.length;

  if (totalAfterUpload > MAX_IMAGES) {
    return json(
      {
        message: `No puedes tener más de ${MAX_IMAGES} imágenes. Actualmente tienes ${existingCount} y estás intentando agregar ${photos.length}.`,
        code: 'max_images_exceeded',
        currentCount: existingCount,
        maxImages: MAX_IMAGES,
      },
      422,
    );
  }

  // Obtener la posición máxima actual
  const { data: existingImages } = await locals.supabase
    .from('product_images')
    .select('position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1);

  let nextPosition = existingImages?.length
    ? existingImages[0].position + 1
    : 0;

  const uploadedPaths: string[] = [];
  const uploadedImages: {
    url: string;
    position: number;
    product_id: string;
  }[] = [];

  try {
    for (const photo of photos) {
      const path = `${productId}/${nextPosition + 1}-${crypto.randomUUID()}.${extensionFor(photo)}`;
      const { error: uploadError } = await locals.supabase.storage
        .from('product-images')
        .upload(path, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
      const { data: publicUrl } = locals.supabase.storage
        .from('product-images')
        .getPublicUrl(path);
      uploadedImages.push({
        url: publicUrl.publicUrl,
        position: nextPosition,
        product_id: productId,
      });
      nextPosition++;
    }

    const { error: imagesError } = await locals.supabase
      .from('product_images')
      .insert(uploadedImages);
    if (imagesError) {
      await locals.supabase.storage
        .from('product-images')
        .remove(uploadedPaths);
      throw imagesError;
    }

    return json(
      {
        images: uploadedImages.map(({ url, position }) => ({ url, position })),
      },
      201,
    );
  } catch {
    if (uploadedPaths.length) {
      await locals.supabase.storage
        .from('product-images')
        .remove(uploadedPaths);
    }
    return json(
      { message: 'No pudimos subir las imágenes. Inténtalo nuevamente.' },
      503,
    );
  }
};

/** Extrae el path de Storage desde la URL pública de la imagen. */
const extractStoragePath = (publicUrl: string): string | null => {
  try {
    const url = new URL(publicUrl);
    // Formato: /storage/v1/object/public/product-images/{path}
    const marker = '/product-images/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return url.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  let imageIds: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body.imageIds)) {
      imageIds = body.imageIds.filter(
        (id: unknown): id is string => typeof id === 'string',
      );
    }
  } catch {
    return json({ code: 'invalid_request' }, 400);
  }

  if (!imageIds.length) {
    return json(
      { message: 'No se especificaron imágenes para eliminar.' },
      422,
    );
  }

  const { data: images } = await locals.supabase
    .from('product_images')
    .select('id, url')
    .eq('product_id', productId)
    .in('id', imageIds);

  if (!images?.length) {
    return json({ message: 'Las imágenes especificadas no existen.' }, 404);
  }

  const { error: deleteError } = await locals.supabase
    .from('product_images')
    .delete()
    .in('id', imageIds);

  if (deleteError) {
    return json(
      { message: 'No pudimos eliminar las imágenes. Inténtalo nuevamente.' },
      503,
    );
  }

  // Limpiar archivos de Storage (best effort)
  for (const image of images) {
    const path = extractStoragePath(image.url);
    if (path) {
      await locals.supabase.storage.from('product-images').remove([path]);
    }
  }

  return json({ deleted: imageIds.length }, 200);
};
