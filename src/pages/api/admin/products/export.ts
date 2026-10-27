import type { APIRoute } from 'astro';
import type { ProductStatus } from '../../../../types/products';

export const prerender = false;

const allowedStatuses = new Set<ProductStatus>([
  'available',
  'out_of_stock',
  'sold',
]);
const csvCell = (value: string | number) => {
  let text = String(value);
  if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@\-]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
};

const statusLabel = (status: ProductStatus) =>
  ({ available: 'Disponible', out_of_stock: 'Agotado', sold: 'Vendido' })[
    status
  ];

export const GET: APIRoute = async ({ request, locals }) => {
  const params = new URL(request.url).searchParams;
  const searchTerm = params.get('q')?.trim().slice(0, 100) ?? '';
  const requestedStatus = params.get('estado') ?? 'todos';
  const categorySlug = params.get('categoria') ?? 'todas';

  if (
    requestedStatus !== 'todos' &&
    !allowedStatuses.has(requestedStatus as ProductStatus)
  ) {
    return Response.json(
      { message: 'El estado seleccionado no es válido.' },
      { status: 400 },
    );
  }

  let categoryId: string | null = null;
  if (categorySlug !== 'todas') {
    const { data: category, error } = await locals.supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .eq('active', true)
      .maybeSingle();
    if (error) {
      return Response.json(
        { message: 'No pudimos consultar las categorías.' },
        { status: 503 },
      );
    }
    if (!category) {
      return Response.json(
        { message: 'No hay productos para los filtros seleccionados.' },
        { status: 404 },
      );
    }
    categoryId = category.id;
  }

  const rows: {
    name: string;
    brand: string;
    price: number;
    quantity: number;
    status: ProductStatus;
    categories: { name: string } | { name: string }[] | null;
  }[] = [];
  const batchSize = 1000;
  for (let from = 0; ; from += batchSize) {
    let query = locals.supabase
      .from('products')
      .select('name, brand, price, quantity, status, categories(name)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(from, from + batchSize - 1);

    if (searchTerm) {
      const safeTerm = searchTerm.replace(/[\\"(),]/g, ' ').trim();
      query = query.or(`name.ilike.%${safeTerm}%,brand.ilike.%${safeTerm}%`);
    }
    if (requestedStatus !== 'todos') {
      query = query.eq('status', requestedStatus as ProductStatus);
    }
    if (categoryId) query = query.eq('category_id', categoryId);

    const { data, error } = await query;
    if (error) {
      return Response.json(
        { message: 'No se pudo exportar el inventario. Inténtalo de nuevo.' },
        { status: 503 },
      );
    }
    const batch = (data ?? []) as typeof rows;
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }

  if (!rows.length) {
    return Response.json(
      {
        message:
          'No hay productos para exportar con los filtros seleccionados.',
      },
      { status: 404 },
    );
  }

  const lines = [
    ['Producto', 'Marca', 'Categoría', 'Precio (Bs)', 'Stock', 'Estado']
      .map(csvCell)
      .join(';'),
    ...rows.map((row) => {
      const category = Array.isArray(row.categories)
        ? row.categories[0]
        : row.categories;
      return [
        csvCell(row.name),
        csvCell(row.brand),
        csvCell(category?.name ?? 'Sin categoría'),
        csvCell(row.price.toFixed(2)),
        csvCell(row.quantity),
        csvCell(statusLabel(row.status)),
      ].join(';');
    }),
  ];
  const date = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFFsep=;\r\n${lines.join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="inventario-${date}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
};
