import type { APIRoute } from 'astro';

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const productId = params.id;
  if (!productId) {
    return json({ code: 'invalid_request' }, 400);
  }

  const payload = await request.json().catch(() => null);
  const channel = payload?.channel;
  if (channel !== 'whatsapp' && channel !== 'phone') {
    return json({ code: 'invalid_channel' }, 400);
  }

  const { data: product, error: productError } = await locals.supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('active', true)
    .eq('status', 'available')
    .gt('quantity', 0)
    .maybeSingle();

  if (productError) return json({ code: 'interest_unavailable' }, 503);
  if (!product) return json({ code: 'product_unavailable' }, 404);

  const { error } = await locals.supabase.from('product_interests').insert({
    product_id: productId,
    channel,
  });

  if (error) return json({ code: 'interest_unavailable' }, 503);

  return json({ ok: true }, 200);
};
