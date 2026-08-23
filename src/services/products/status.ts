import type { PostgrestError } from '@supabase/supabase-js';
import type { ServerSupabaseClient } from '../../db/supabase-server';
import type { ProductStatus } from '../../types/products';

export type SetStatusErrorCode =
  'forbidden' | 'not_found' | 'stock_zero' | 'reverting_sold' | 'unknown';

export interface UpdatedProduct {
  id: string;
  status: ProductStatus;
  quantity: number;
}

export type SetStatusResult =
  | { ok: true; product: UpdatedProduct }
  | { ok: false; code: SetStatusErrorCode };

const KNOWN_CODES: SetStatusErrorCode[] = [
  'forbidden',
  'not_found',
  'stock_zero',
  'reverting_sold',
];

/**
 * El RPC señala cada caso con `raise exception '<codigo>'`; PostgREST lo
 * reenvia en `error.message`, asi que aqui se traduce a un resultado tipado.
 */
const toErrorCode = (error: PostgrestError): SetStatusErrorCode => {
  const message = error.message ?? '';
  return KNOWN_CODES.find((code) => message.includes(code)) ?? 'unknown';
};

export const setProductStatus = async (
  client: ServerSupabaseClient,
  productId: string,
  status: ProductStatus,
  force = false,
): Promise<SetStatusResult> => {
  const { data, error } = await client.rpc('set_product_status', {
    p_product_id: productId,
    p_new_status: status,
    p_force: force,
  });

  if (error) return { ok: false, code: toErrorCode(error) };
  if (!data) return { ok: false, code: 'not_found' };

  return {
    ok: true,
    product: { id: data.id, status: data.status, quantity: data.quantity },
  };
};
