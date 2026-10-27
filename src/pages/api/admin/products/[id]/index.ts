import type { APIRoute } from 'astro';

export const prerender = false;

type FieldErrors = Record<string, string>;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// The middleware has already checked for an active administrator session.
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ message: 'No pudimos leer el formulario.' }, 400);
  }

  const name = String(formData.get('name') ?? '').trim();
  const brand = String(formData.get('brand') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '').trim();
  const errors: FieldErrors = {};

  if (!name) errors.name = 'El nombre es obligatorio.';
  else if (name.length > 160)
    errors.name = 'El nombre no puede superar 160 caracteres.';
  if (!brand) errors.brand = 'La marca es obligatoria.';
  else if (brand.length > 80)
    errors.brand = 'La marca no puede superar 80 caracteres.';
  if (description.length > 2000)
    errors.description = 'La descripción no puede superar 2000 caracteres.';
  if (!categoryId) errors.categoryId = 'Selecciona una categoría.';

  if (Object.keys(errors).length) {
    return json({ errors, message: 'Revisa los campos marcados.' }, 422);
  }

  const { data: product, error: productError } = await locals.supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle();

  if (productError) {
    return json({ message: 'No pudimos consultar el producto.' }, 503);
  }
  if (!product) {
    return json({ message: 'El producto no existe o fue eliminado.' }, 404);
  }

  const { data: category, error: categoryError } = await locals.supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('active', true)
    .maybeSingle();

  if (categoryError) {
    return json({ message: 'No pudimos validar la categoría.' }, 503);
  }
  if (!category) {
    return json(
      {
        errors: { categoryId: 'La categoría seleccionada no está disponible.' },
      },
      422,
    );
  }

  // Keep the original slug so previously shared product links remain stable.
  // Price and stock have dedicated RPCs that atomically record their history.
  const { data: updated, error: updateError } = await locals.supabase
    .from('products')
    .update({
      name,
      brand,
      description: description || null,
      category_id: category.id,
    })
    .eq('id', productId)
    .eq('active', true)
    .select('id')
    .maybeSingle();

  if (updateError) {
    return json(
      { message: 'No pudimos guardar los cambios. Inténtalo nuevamente.' },
      503,
    );
  }
  if (!updated) {
    return json({ message: 'El producto ya no existe.' }, 404);
  }

  return json({ productId }, 200);
};
