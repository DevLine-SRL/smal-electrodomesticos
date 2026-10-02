import type { APIRoute } from 'astro';

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const loadUserNames = async (
  client: Parameters<APIRoute>[0]['locals']['supabase'],
  ids: string[],
) => {
  if (ids.length === 0) return new Map<string, string | null>();

  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map<string, string | null>();

  const { data, error } = await client
    .from('profiles')
    .select('id, name')
    .in('id', unique);

  const users = new Map<string, string | null>();
  if (!error && data) {
    for (const row of data) users.set(row.id, row.name ?? 'Administrador');
  }
  for (const id of unique) {
    if (!users.has(id)) users.set(id, null);
  }
  return users;
};

export const GET: APIRoute = async ({ params, locals }) => {
  const productId = params.id;
  if (!productId) return json({ code: 'invalid_request' }, 400);

  const [stockResult, priceResult, statusResult] = await Promise.all([
    locals.supabase
      .from('inventory_movements')
      .select(
        'id, movement_type, quantity_before, quantity_after, quantity_change, reason, created_at, changed_by',
      )
      .eq('product_id', productId)
      .order('created_at', { ascending: false }),
    locals.supabase
      .from('product_price_history')
      .select('id, old_price, new_price, created_at, changed_by')
      .eq('product_id', productId)
      .order('created_at', { ascending: false }),
    locals.supabase
      .from('product_status_history')
      .select('id, old_status, new_status, source, created_at, changed_by')
      .eq('product_id', productId)
      .order('created_at', { ascending: false }),
  ]);

  const userIds = new Set<string>();
  const toHistoryEntry = (
    kind: 'stock' | 'price' | 'status',
    entry: {
      id: string;
      created_at: string;
      changed_by?: string | null;
      [key: string]: unknown;
    },
    title: string,
    detail: string,
  ) => ({
    id: entry.id,
    kind,
    created_at: entry.created_at,
    userName: null as string | null,
    title,
    detail,
    __userId: entry.changed_by ?? null,
  });

  const inventory = (stockResult.data ?? []).map((row) => {
    const before = Number(row.quantity_before);
    const after = Number(row.quantity_after);
    const change = Number(row.quantity_change);
    const reason = typeof row.reason === 'string' ? row.reason.trim() : '';
    if (row.changed_by) userIds.add(row.changed_by);
    return toHistoryEntry(
      'stock',
      row,
      row.movement_type === 'deduction' ? 'Resta de stock' : 'Ajuste de stock',
      `${before} → ${after} (${change >= 0 ? '+' : ''}${change} u)${reason ? ` · ${reason}` : ''}`,
    );
  });

  const prices = (priceResult.data ?? []).map((row) => {
    const oldPrice = Number(row.old_price);
    const newPrice = Number(row.new_price);
    if (row.changed_by) userIds.add(row.changed_by);
    return toHistoryEntry(
      'price',
      row,
      'Precio actualizado',
      `Bs ${oldPrice.toLocaleString('es-BO', { minimumFractionDigits: 2 })} → Bs ${newPrice.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
    );
  });

  const statuses = (statusResult.data ?? []).map((row) => {
    if (row.changed_by) userIds.add(row.changed_by);
    return toHistoryEntry(
      'status',
      row,
      'Cambio de estado',
      `${row.old_status} → ${row.new_status}${row.source ? ` (${row.source})` : ''}`,
    );
  });

  const usersById = await loadUserNames(locals.supabase, [...userIds]);

  const history = [...inventory, ...prices, ...statuses]
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      created_at: item.created_at,
      userName: item.__userId ? usersById.get(item.__userId) ?? null : null,
      title: item.title,
      detail: item.detail,
    }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  if (stockResult.error || priceResult.error || statusResult.error) {
    return json({ code: 'load_failed' }, 503);
  }

  return json({ history }, 200);
};
