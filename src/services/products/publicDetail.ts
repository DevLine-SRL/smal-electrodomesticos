import { supabase } from '../../db/supabase';

/** A public lookup never uses the administrator's session or a service key. */
export async function getProductDetail(identifier: string, byId = false) {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, slug, name, description, price, quantity, status, categories(name), product_images(id, url, position)',
    )
    .eq('active', true)
    .eq(byId ? 'id' : 'slug', identifier)
    .maybeSingle();

  if (error)
    throw new Error('Product detail is temporarily unavailable', {
      cause: error,
    });
  if (!data) return null;

  const category = Array.isArray(data.categories)
    ? data.categories[0]
    : data.categories;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    price: data.price,
    status: data.status,
    available: data.status === 'available' && data.quantity > 0,
    category: category?.name ?? 'Electrodomésticos',
    images: [...data.product_images].sort(
      (a, b) => a.position - b.position || a.id.localeCompare(b.id),
    ),
  };
}

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof getProductDetail>>
>;
