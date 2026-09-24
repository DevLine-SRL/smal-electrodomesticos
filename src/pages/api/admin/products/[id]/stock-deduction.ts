import type { APIRoute } from 'astro';

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);
  const body = await request.json().catch(() => null);
  const quantity = typeof body?.quantity === 'number' ? body.quantity : Number.NaN;
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  if (!Number.isInteger(quantity) || quantity <= 0) return json({ code: 'invalid_deduction' }, 422);

  const { data, error } = await locals.supabase.rpc('deduct_product_stock', {
    p_product_id: productId,
    p_quantity: quantity,
    p_reason: reason || undefined,
  });
  if (!error) return json({ product: data }, 200);
  const stock = error.message.match(/insufficient_stock:(\d+)/)?.[1];
  if (stock) return json({ code: 'insufficient_stock', available: Number(stock) }, 422);
  if (error.message.includes('not_found')) return json({ code: 'not_found' }, 404);
  if (error.message.includes('forbidden')) return json({ code: 'forbidden' }, 403);
  return json({ code: 'update_failed' }, 422);
};
