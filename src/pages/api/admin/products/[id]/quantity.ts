import type { APIRoute } from 'astro';

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);
  const body = await request.json().catch(() => null);
  const quantity = typeof body?.quantity === 'number' ? body.quantity : Number.NaN;
  if (!Number.isInteger(quantity) || quantity < 0) return json({ code: 'invalid_quantity' }, 422);

  const { data, error } = await locals.supabase.rpc('set_product_quantity', {
    p_product_id: productId,
    p_quantity: quantity,
    p_confirm_sold: body?.confirmSold === true,
  });
  if (!error) return json({ product: data }, 200);
  if (error.message.includes('sold_product')) return json({ code: 'sold_product' }, 409);
  if (error.message.includes('not_found')) return json({ code: 'not_found' }, 404);
  if (error.message.includes('forbidden')) return json({ code: 'forbidden' }, 403);
  return json({ code: 'update_failed' }, 422);
};
