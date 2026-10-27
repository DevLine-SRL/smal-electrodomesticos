import { supabase } from '../../db/supabase';
import { mapProductRow } from './mappers';
import type { ProductListItem } from '../../types/products';

const PAGE_SIZE = 9;

interface ProductFilters {
  searchTerm: string;
  categoryId: string | null;
}

const buildSearchFilter = (searchTerm: string) => {
  const escaped = searchTerm.replace(/[\\"(),]/g, ' ').trim();
  return `name.ilike.%${escaped}%,brand.ilike.%${escaped}%`;
};

export const countAvailableProducts = async (
  filters: ProductFilters,
): Promise<number> => {
  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)
    .eq('status', 'available');
  query = query.gt('quantity', 0);

  if (filters.searchTerm) {
    query = query.or(buildSearchFilter(filters.searchTerm));
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  const { count } = await query;
  return count ?? 0;
};

export const fetchAvailableProducts = async (
  filters: ProductFilters,
  page: number,
): Promise<ProductListItem[]> => {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('products')
    .select(
      'id, name, brand, slug, price, product_images(url, position), categories(name, slug)',
    )
    .eq('active', true)
    .eq('status', 'available')
    .gt('quantity', 0)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.searchTerm) {
    query = query.or(buildSearchFilter(filters.searchTerm));
  }
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  const { data } = await query;
  return (data ?? []).map(mapProductRow);
};

export { PAGE_SIZE };
