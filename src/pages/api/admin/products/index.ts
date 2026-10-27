import type { APIRoute } from 'astro';
import { isSupportedImage } from '../../../../services/products/imageValidation';

export const prerender = false;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 4;
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type FieldErrors = Record<string, string>;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const toSlug = (name: string) => {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${base || 'producto'}-${crypto.randomUUID().slice(0, 8)}`;
};

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

// El middleware ya comprobó que la petición procede de un administrador activo.
export const POST: APIRoute = async ({ request, locals }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ message: 'No pudimos leer el formulario.' }, 400);
  }

  const name = String(formData.get('name') ?? '').trim();
  const brand = String(formData.get('brand') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const priceText = String(formData.get('price') ?? '').trim();
  const quantityText = String(formData.get('quantity') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '').trim();
  const price = Number(priceText);
  const quantity = Number(quantityText);
  const photos = formData
    .getAll('photos')
    .filter((value): value is File => value instanceof File && value.size > 0);

  const errors: FieldErrors = {};
  if (!name) errors.name = 'El nombre es obligatorio.';
  if (name.length > 160)
    errors.name = 'El nombre no puede superar 160 caracteres.';
  if (!brand) errors.brand = 'La marca es obligatoria.';
  else if (brand.length > 80)
    errors.brand = 'La marca no puede superar 80 caracteres.';
  if (
    !priceText ||
    !Number.isFinite(price) ||
    price <= 0 ||
    Math.abs(price * 100 - Math.round(price * 100)) > 1e-8
  ) {
    errors.price = 'Ingresa un precio mayor a cero.';
  }
  if (
    !quantityText ||
    !Number.isInteger(quantity) ||
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    errors.quantity = 'Ingresa una cantidad entera igual o mayor a cero.';
  }
  if (!categoryId) errors.categoryId = 'Selecciona una categoría.';
  if (!photos.length) {
    errors.photos = 'Agrega al menos una fotografía del producto.';
  } else if (photos.length > MAX_IMAGES) {
    errors.photos = `Un producto puede tener como máximo ${MAX_IMAGES} fotografías.`;
  } else if (photos.some((photo) => !IMAGE_TYPES.has(photo.type))) {
    errors.photos = 'Solo se aceptan imágenes JPG, PNG, WEBP o GIF.';
  } else if (photos.some((photo) => photo.size > MAX_FILE_SIZE)) {
    errors.photos = 'Cada imagen debe pesar como máximo 5 MB.';
  } else if (
    !(await Promise.all(photos.map(isSupportedImage))).every(Boolean)
  ) {
    errors.photos =
      'El contenido de una fotografía no coincide con su formato.';
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors, message: 'Revisa los campos marcados.' }, 422);
  }

  const { data: category, error: categoryError } = await locals.supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('active', true)
    .maybeSingle();
  if (categoryError) {
    return json(
      { message: 'No pudimos validar la categoría. Inténtalo nuevamente.' },
      503,
    );
  }
  if (!category) {
    return json(
      {
        errors: { categoryId: 'La categoría seleccionada no está disponible.' },
      },
      422,
    );
  }

  const { data: existing, error: duplicateCheckError } = await locals.supabase
    .from('products')
    .select('id')
    .ilike('name', name)
    .limit(1);
  if (duplicateCheckError) {
    return json(
      { message: 'No pudimos validar el nombre. Inténtalo nuevamente.' },
      503,
    );
  }
  const duplicateWarning = Boolean(existing?.length);

  const productId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const uploadedImages: { url: string; position: number }[] = [];

  try {
    for (const [position, photo] of photos.entries()) {
      const path = `${productId}/${position + 1}-${crypto.randomUUID()}.${extensionFor(photo)}`;
      const { error: uploadError } = await locals.supabase.storage
        .from('product-images')
        .upload(path, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
      const { data: publicUrl } = locals.supabase.storage
        .from('product-images')
        .getPublicUrl(path);
      uploadedImages.push({ url: publicUrl.publicUrl, position });
    }

    const { error: productError } = await locals.supabase
      .from('products')
      .insert({
        id: productId,
        name,
        brand,
        slug: toSlug(name),
        description: description || null,
        price,
        quantity,
        status: quantity === 0 ? 'out_of_stock' : 'available',
        category_id: category.id,
        created_by: locals.user?.id ?? null,
      });
    if (productError) throw productError;

    const { error: imagesError } = await locals.supabase
      .from('product_images')
      .insert(
        uploadedImages.map((image) => ({ ...image, product_id: productId })),
      );
    if (imagesError) {
      await locals.supabase.from('products').delete().eq('id', productId);
      throw imagesError;
    }

    return json(
      {
        productId,
        warning: duplicateWarning
          ? 'Producto guardado. Ya existe otro producto con el mismo nombre; revisa que sean modelos distintos.'
          : undefined,
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
      {
        message:
          'No pudimos guardar el producto. Tus datos no se han perdido; inténtalo nuevamente.',
      },
      503,
    );
  }
};
