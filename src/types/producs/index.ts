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
