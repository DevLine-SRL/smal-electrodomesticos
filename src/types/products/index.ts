export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  categoryName: string;
  imageUrl: string | null;
}

export interface ProductCatalogParams {
  searchTermn: string;
  categorySlug: string;
  page: number;
}

export interface ProductCatalogResult {
  categories: Category[];
  products: ProductListItem[];
  selectedCategorySlug: string;
  searchTerm: string;
  page: number;
  totalPages: number;
  totalProducts: number;
  paginationPages: number[];
  buildPageHref: (targetPage: number) => string;
}

export type ProductStatus = 'available' | 'out_of_stock' | 'sold';

export type StatusChangeSource = 'automatic' | 'manual';

/** Filtro de estado del listado admin. `todos` no filtra. */
export type ProductStatusFilter = ProductStatus | 'todos';

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  status: ProductStatus;
  categoryName: string;
  imageUrl: string | null;
  /** Origen del ultimo cambio de estado. `null` si nunca cambio. */
  lastStatusSource: StatusChangeSource | null;
  lastStatusChangeAt: string | null;
}

export interface AdminProductsResult {
  products: AdminProductListItem[];
  selectedStatus: ProductStatusFilter;
  searchTerm: string;
  page: number;
  totalPages: number;
  totalProducts: number;
  paginationPages: number[];
  buildPageHref: (targetPage: number) => string;
}
