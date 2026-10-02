import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  if (!params.id)
    return new Response(JSON.stringify({ code: 'invalid_request' }), {
      status: 400,
    });
  const { data, error } = await locals.supabase
    .from('inventory_movements')
    .select(
      'id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_at',
    )
    .eq('product_id', params.id)
    .order('created_at', { ascending: false });
  return new Response(
    JSON.stringify(error ? { code: 'load_failed' } : { movements: data ?? [] }),
    {
      status: error ? 503 : 200,
      headers: { 'content-type': 'application/json' },
    },
  );
};
