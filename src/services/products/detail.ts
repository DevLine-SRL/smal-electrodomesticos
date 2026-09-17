import type { ServerSupabaseClient } from '../../db/supabase-server';
import type { ProductDetail, ProductStatus } from '../../types/products';

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  quantity: number;
  status: ProductStatus;
  category_id: string | null;
  categories: { name: string } | { name: string }[] | null;
  product_images: { id: string; url: string; position: number }[] | null;
}

export const getProductDetail = async (
  client: ServerSupabaseClient,
  productId: string,
): Promise<ProductDetail | null> => {
  const { data, error } = await client
    .from('products')
    .select(
      'id, name, slug, description, price, quantity, status, category_id, categories(name), product_images(id, url, position)',
    )
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ProductRow;

  const category = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;

  const images = Array.isArray(row.product_images)
    ? [...row.product_images].sort((a, b) => a.position - b.position)
    : [];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    quantity: row.quantity,
    status: row.status,
    categoryId: row.category_id,
    categoryName: category?.name ?? 'Sin categoría',
    images,
  };
};
