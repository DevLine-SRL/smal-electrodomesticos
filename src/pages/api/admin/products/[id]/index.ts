import type { APIRoute } from 'astro';

export const prerender = false;

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

  return `${base || 'producto'}`;
};

// El middleware ya garantizo que hay un admin activo antes de llegar aqui.
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
  const description = String(formData.get('description') ?? '').trim();
  const priceText = String(formData.get('price') ?? '').trim();
  const quantityText = String(formData.get('quantity') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '').trim();
  const price = Number(priceText);
  const quantity = Number(quantityText);

  const errors: FieldErrors = {};
  if (!name) errors.name = 'El nombre es obligatorio.';
  if (name.length > 160)
    errors.name = 'El nombre no puede superar 160 caracteres.';
  if (!priceText || !Number.isFinite(price) || price <= 0) {
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

  if (Object.keys(errors).length > 0) {
    return json({ errors, message: 'Revisa los campos marcados.' }, 422);
  }

  // Verificar que el producto existe y esta activo
  const { data: existing } = await locals.supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle();

  if (!existing) {
    return json({ message: 'El producto no existe o fue eliminado.' }, 404);
  }

  // Verificar que la categoría existe y esta activa
  const { data: category } = await locals.supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('active', true)
    .maybeSingle();

  if (!category) {
    return json(
      {
        errors: { categoryId: 'La categoría seleccionada no está disponible.' },
      },
      422,
    );
  }

  // Construir slug solo si el nombre cambio
  const updates: {
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    category_id: string;
    slug?: string;
  } = {
    name,
    description: description || null,
    price,
    quantity,
    category_id: category.id,
  };

  if (name !== existing.name) {
    updates.slug = toSlug(name);
  }

  const { error } = await locals.supabase
    .from('products')
    .update(updates)
    .eq('id', productId);

  if (error) {
    return json(
      { message: 'No pudimos guardar los cambios. Inténtalo nuevamente.' },
      503,
    );
  }

  return json({ productId }, 200);
};
