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

  const contentType = request.headers.get('content-type') ?? '';
  let channel = 'whatsapp';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => ({}));
    if (typeof payload?.channel === 'string' && payload.channel.trim()) {
      channel = payload.channel.trim();
    }
  }

  const { error } = await locals.supabase.from('product_interests').insert({
    product_id: productId,
    channel,
  });

  if (error) {
    return json({ code: 'interest_insert_failed', error: error.message }, 500);
  }

  return json({ ok: true }, 200);
};
