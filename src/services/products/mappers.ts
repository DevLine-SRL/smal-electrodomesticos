import type { ProductListItem } from '../../types/products';

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  categories: { name: string } | { name: string }[] | null;
  product_images: { url: string; position: number }[] | null;
}

export const mapProductRow = (row: ProductRow): ProductListItem => {
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
    price: row.price,
    categoryName: category?.name ?? 'Sin categoría',
    imageUrl: images[0]?.url ?? null,
  };
};
