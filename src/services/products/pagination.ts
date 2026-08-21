export const computeTotalPages = (
  totalProducts: number,
  pageSize: number,
): number => {
  return Math.max(1, Math.ceil(totalProducts / pageSize));
};

export const computePaginationPages = (
  page: number,
  totalPages: number,
): number[] => {
  return Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (num) =>
      num === 1 || num === totalPages || (num >= page - 1 && num <= page + 1),
  );
};

export const buildPageHrefFactory = (
  basePath: string,
  searchTerm: string,
  categorySlug: string,
) => {
  return function buildPageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (categorySlug !== 'todas') params.set('categoria', categorySlug);
    if (targetPage > 1) params.set('page', String(targetPage));

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
};
