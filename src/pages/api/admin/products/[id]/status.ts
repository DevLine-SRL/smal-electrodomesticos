import type { APIRoute } from 'astro';
import { setProductStatus } from '../../../../../services/products/status';
import type { ProductStatus } from '../../../../../types/products';

export const prerender = false;

const VALID_STATUSES: ProductStatus[] = ['available', 'out_of_stock', 'sold'];

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// El middleware ya garantizo que hay un admin activo antes de llegar aqui.
export const POST: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  let status: string | undefined;
  let force = false;

  try {
    const body = await request.json();
    status = typeof body.status === 'string' ? body.status : undefined;
    force = body.force === true;
  } catch {
    return json({ code: 'invalid_request' }, 400);
  }

  if (!status || !VALID_STATUSES.includes(status as ProductStatus)) {
    return json({ code: 'invalid_status' }, 400);
  }

  try {
    const result = await setProductStatus(
      locals.supabase,
      productId,
      status as ProductStatus,
      force,
    );

    if (result.ok) {
      return json({ product: result.product, source: 'manual' }, 200);
    }

    switch (result.code) {
      // Necesitan confirmacion extra del administrador antes de reintentar
      // con `force: true`.
      case 'stock_zero':
      case 'reverting_sold':
        return json({ code: result.code }, 409);
      case 'forbidden':
        return json({ code: result.code }, 403);
      case 'not_found':
        return json({ code: result.code }, 404);
      default:
        return json({ code: 'unknown' }, 500);
    }
  } catch {
    return json({ code: 'network_error' }, 503);
  }
};
