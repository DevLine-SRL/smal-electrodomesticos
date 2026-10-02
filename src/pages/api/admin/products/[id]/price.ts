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
  const price = typeof body?.price === 'number' ? body.price : Number.NaN;
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    Math.round(price * 100) !== price * 100
  ) {
    return json({ code: 'invalid_price' }, 422);
  }

  const { data, error } = await locals.supabase.rpc('change_product_price', {
    p_product_id: productId,
    p_new_price: price,
  });
  if (!error) return json({ product: data }, 200);
  if (error.message.includes('not_found'))
    return json({ code: 'not_found' }, 404);
  if (error.message.includes('forbidden'))
    return json({ code: 'forbidden' }, 403);
  return json({ code: 'update_failed' }, 422);
};
