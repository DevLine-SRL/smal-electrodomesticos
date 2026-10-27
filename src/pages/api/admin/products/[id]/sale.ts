import type { APIRoute } from 'astro';

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  const body = await request.json().catch(() => null);
  const saleMode = body?.saleMode;
  if (saleMode !== 'unit' && saleMode !== 'lot') {
    return json({ code: 'invalid_sale_mode' }, 422);
  }

  try {
    const { data, error } = await locals.supabase.rpc('record_product_sale', {
      p_product_id: productId,
      p_sale_mode: saleMode,
    });

    if (!error) return json({ product: data }, 200);
    if (error.message.includes('forbidden')) {
      return json({ code: 'forbidden' }, 403);
    }
    if (error.message.includes('not_found')) {
      return json({ code: 'not_found' }, 404);
    }
    if (error.message.includes('no_stock')) {
      return json({ code: 'no_stock' }, 409);
    }
    if (error.message.includes('already_sold')) {
      return json({ code: 'already_sold' }, 409);
    }
    return json({ code: 'sale_failed' }, 503);
  } catch {
    return json({ code: 'sale_failed' }, 503);
  }
};
