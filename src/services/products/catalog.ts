import { getActiveCategories } from './categories';
import {
  countAvailableProducts,
  fetchAvailableProducts,
  PAGE_SIZE,
} from './queries';
import {
  computeTotalPages,
  computePaginationPages,
  buildPageHrefFactory,
} from './pagination';
import type { ProductCatalogResult } from '../../types/products';

export const getProductCatalog = async (
  requestUrl: URL,
): Promise<ProductCatalogResult> => {
  const searchTerm = requestUrl.searchParams.get('q')?.trim() ?? '';
  const requestedCategory = requestUrl.searchParams.get('categoria') ?? 'todas';
  const requestedPage = Number.parseInt(
    requestUrl.searchParams.get('page') ?? '1',
    10,
  );

  const categories = await getActiveCategories();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const selectedCategorySlug =
    requestedCategory === 'todas' || categoryBySlug.has(requestedCategory)
      ? requestedCategory
      : 'todas';

  const selectedCategoryId =
    selectedCategorySlug === 'todas'
      ? null
      : (categoryBySlug.get(selectedCategorySlug)?.id ?? null);

  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const filters = { searchTerm, categoryId: selectedCategoryId };

  const totalProducts = await countAvailableProducts(filters);
  const totalPages = computeTotalPages(totalProducts, PAGE_SIZE);
  const page = Math.min(currentPage, totalPages);

  const products = await fetchAvailableProducts(filters, page);

  return {
    categories,
    products,
    selectedCategorySlug,
    searchTerm,
    page,
    totalPages,
    totalProducts,
    paginationPages: computePaginationPages(page, totalPages),
    buildPageHref: buildPageHrefFactory(
      '/products',
      searchTerm,
      selectedCategorySlug,
    ),
  };
};
