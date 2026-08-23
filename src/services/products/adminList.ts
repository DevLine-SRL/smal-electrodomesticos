import type { ServerSupabaseClient } from '../../db/supabase-server';
import { computePaginationPages, computeTotalPages } from './pagination';
import type {
  AdminProductListItem,
  AdminProductsResult,
  ProductStatus,
  ProductStatusFilter,
  StatusChangeSource,
} from '../../types/products';

const PAGE_SIZE = 15;

const STATUS_FILTERS: ProductStatusFilter[] = [
  'todos',
  'available',
  'out_of_stock',
  'sold',
];

export const isStatusFilter = (value: string): value is ProductStatusFilter =>
  (STATUS_FILTERS as string[]).includes(value);

const buildAdminPageHref =
  (searchTerm: string, status: ProductStatusFilter) =>
  (targetPage: number): string => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (status !== 'todos') params.set('estado', status);
    if (targetPage > 1) params.set('page', String(targetPage));

    const query = params.toString();
    return query ? `/admin/products?${query}` : '/admin/products';
  };

interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  status: ProductStatus;
  categories: { name: string } | { name: string }[] | null;
  product_images: { url: string; position: number }[] | null;
}

interface LastStatusChange {
  source: StatusChangeSource;
  createdAt: string;
}

const mapAdminProductRow = (
  row: AdminProductRow,
  lastChange: LastStatusChange | undefined,
): AdminProductListItem => {
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
    quantity: row.quantity,
    status: row.status,
    categoryName: category?.name ?? 'Sin categoría',
    imageUrl: images[0]?.url ?? null,
    lastStatusSource: lastChange?.source ?? null,
    lastStatusChangeAt: lastChange?.createdAt ?? null,
  };
};

/**
 * Ultimo cambio de estado por producto.
 *
 * Se resuelve en una segunda consulta acotada a los ids de la pagina y se
 * reduce en JS: PostgREST no expone `DISTINCT ON`, y una vista solo para esto
 * seria mas schema del necesario.
 */
const fetchLastStatusChanges = async (
  client: ServerSupabaseClient,
  productIds: string[],
): Promise<Map<string, LastStatusChange>> => {
  const result = new Map<string, LastStatusChange>();
  if (productIds.length === 0) return result;

  const { data, error } = await client
    .from('product_status_history')
    .select('product_id, source, created_at')
    .in('product_id', productIds)
    .order('created_at', { ascending: false });

  if (error || !data) return result;

  for (const row of data) {
    if (result.has(row.product_id)) continue;
    result.set(row.product_id, {
      source: row.source,
      createdAt: row.created_at,
    });
  }

  return result;
};

export const getAdminProducts = async (
  client: ServerSupabaseClient,
  requestUrl: URL,
): Promise<AdminProductsResult> => {
  const searchTerm = requestUrl.searchParams.get('q')?.trim() ?? '';
  const requestedStatus = requestUrl.searchParams.get('estado') ?? 'todos';
  const selectedStatus: ProductStatusFilter = isStatusFilter(requestedStatus)
    ? requestedStatus
    : 'todos';

  const requestedPage = Number.parseInt(
    requestUrl.searchParams.get('page') ?? '1',
    10,
  );
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  let countQuery = client
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('active', true);
  if (searchTerm) countQuery = countQuery.ilike('name', `%${searchTerm}%`);
  if (selectedStatus !== 'todos') {
    countQuery = countQuery.eq('status', selectedStatus);
  }

  const { count } = await countQuery;
  const totalProducts = count ?? 0;
  const totalPages = computeTotalPages(totalProducts, PAGE_SIZE);
  const page = Math.min(currentPage, totalPages);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let listQuery = client
    .from('products')
    .select(
      'id, name, slug, price, quantity, status, product_images(url, position), categories(name)',
    )
    .eq('active', true)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (searchTerm) listQuery = listQuery.ilike('name', `%${searchTerm}%`);
  if (selectedStatus !== 'todos') {
    listQuery = listQuery.eq('status', selectedStatus);
  }

  const { data } = await listQuery;
  const rows = (data ?? []) as AdminProductRow[];
  const lastChanges = await fetchLastStatusChanges(
    client,
    rows.map((row) => row.id),
  );

  return {
    products: rows.map((row) =>
      mapAdminProductRow(row, lastChanges.get(row.id)),
    ),
    selectedStatus,
    searchTerm,
    page,
    totalPages,
    totalProducts,
    paginationPages: computePaginationPages(page, totalPages),
    buildPageHref: buildAdminPageHref(searchTerm, selectedStatus),
  };
};

export { PAGE_SIZE, STATUS_FILTERS };
