import type { APIRoute } from 'astro';
import { isSupportedImage } from '../../../../../services/products/imageValidation';

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

const extractStoragePath = (publicUrl: string): string | null => {
  try {
    const url = new URL(publicUrl);
    const marker = '/product-images/';
    const idx = url.pathname.indexOf(marker);
    return idx < 0 ? null : url.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  const { data: product, error: productError } = await locals.supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle();

  if (productError)
    return json({ message: 'No pudimos consultar el producto.' }, 503);
  if (!product) {
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
  const deleteIds = [
    ...new Set(
      formData
        .getAll('deleteImageIds')
        .filter((value): value is string => typeof value === 'string'),
    ),
  ];

  if (!photos.length && !deleteIds.length) {
    return json(
      { message: 'No se indicaron cambios para las fotografías.' },
      422,
    );
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
  if (!(await Promise.all(photos.map(isSupportedImage))).every(Boolean)) {
    return json(
      { message: 'El contenido de una fotografía no coincide con su formato.' },
      422,
    );
  }

  const { data: existingImages, error: imageQueryError } = await locals.supabase
    .from('product_images')
    .select('id, url, position')
    .eq('product_id', productId)
    .order('position');

  if (imageQueryError || !existingImages) {
    return json({ message: 'No pudimos consultar las fotografías.' }, 503);
  }

  const imagesToDelete = existingImages.filter((image) =>
    deleteIds.includes(image.id),
  );
  if (imagesToDelete.length !== deleteIds.length) {
    return json({ message: 'Una o más fotografías ya no existen.' }, 404);
  }

  const remainingImages = existingImages.filter(
    (image) => !deleteIds.includes(image.id),
  );
  const totalAfterChange = remainingImages.length + photos.length;
  if (totalAfterChange < 1) {
    return json(
      { message: 'El producto debe conservar al menos una fotografía.' },
      422,
    );
  }
  if (totalAfterChange > MAX_IMAGES) {
    return json(
      {
        message: `El producto puede tener como máximo ${MAX_IMAGES} fotografías.`,
        code: 'max_images_exceeded',
        currentCount: remainingImages.length,
        maxImages: MAX_IMAGES,
      },
      422,
    );
  }

  let nextPosition = remainingImages.length
    ? Math.max(...remainingImages.map((image) => image.position)) + 1
    : 0;
  const uploadedPaths: string[] = [];
  const insertedImageIds: string[] = [];
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

    if (uploadedImages.length) {
      const { data: inserted, error: insertError } = await locals.supabase
        .from('product_images')
        .insert(uploadedImages)
        .select('id');
      if (insertError || !inserted)
        throw insertError ?? new Error('insert_failed');
      insertedImageIds.push(...inserted.map((image) => image.id));
    }

    if (deleteIds.length) {
      const { error: deleteError } = await locals.supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId)
        .in('id', deleteIds);
      if (deleteError) throw deleteError;
    }

    for (const image of imagesToDelete) {
      const path = extractStoragePath(image.url);
      if (path) {
        await locals.supabase.storage.from('product-images').remove([path]);
      }
    }

    return json(
      {
        images: uploadedImages.map(({ url, position }) => ({ url, position })),
      },
      200,
    );
  } catch {
    if (insertedImageIds.length) {
      await locals.supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId)
        .in('id', insertedImageIds);
    }
    if (uploadedPaths.length) {
      await locals.supabase.storage
        .from('product-images')
        .remove(uploadedPaths);
    }
    return json(
      { message: 'No pudimos guardar las fotografías. Inténtalo nuevamente.' },
      503,
    );
  }
};

// Kept for older clients; the current edit form uses POST to replace and add
// images together so that a failed upload cannot remove the last old photo.
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  let imageIds: string[];
  try {
    const body = await request.json();
    imageIds = Array.isArray(body.imageIds)
      ? [
          ...new Set<string>(
            body.imageIds.filter(
              (id: unknown): id is string => typeof id === 'string',
            ),
          ),
        ]
      : [];
  } catch {
    return json({ code: 'invalid_request' }, 400);
  }
  if (!imageIds.length) {
    return json(
      { message: 'No se especificaron fotografías para eliminar.' },
      422,
    );
  }

  const { data: existing, error: queryError } = await locals.supabase
    .from('product_images')
    .select('id, url')
    .eq('product_id', productId);
  if (queryError || !existing)
    return json({ message: 'No pudimos consultar las fotografías.' }, 503);

  const images = existing.filter((image) => imageIds.includes(image.id));
  if (images.length !== imageIds.length) {
    return json({ message: 'Una o más fotografías ya no existen.' }, 404);
  }
  if (existing.length - images.length < 1) {
    return json(
      { message: 'El producto debe conservar al menos una fotografía.' },
      422,
    );
  }

  const { error: deleteError } = await locals.supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId)
    .in('id', imageIds);
  if (deleteError) {
    return json({ message: 'No pudimos eliminar las fotografías.' }, 503);
  }

  for (const image of images) {
    const path = extractStoragePath(image.url);
    if (path)
      await locals.supabase.storage.from('product-images').remove([path]);
  }
  return json({ deleted: images.length }, 200);
};
