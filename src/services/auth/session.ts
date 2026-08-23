import type { ServerSupabaseClient } from '../../db/supabase-server';

export interface AdminProfile {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Devuelve el perfil solo si el usuario es administrador y esta activo.
 *
 * La policy "Read own or admin read all" deja que cada usuario lea su propia
 * fila, asi que basta con el cliente del propio usuario.
 */
export const getAdminProfile = async (
  client: ServerSupabaseClient,
  userId: string,
): Promise<AdminProfile | null> => {
  const { data, error } = await client
    .from('profiles')
    .select('id, email, name, role, active')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.role !== 'admin' || !data.active) return null;

  return { id: data.id, email: data.email, name: data.name };
};

export const ADMIN_LOGIN_PATH = '/admin/login';

export const buildLoginRedirect = (nextPath: string): string => {
  const params = new URLSearchParams();
  if (nextPath && nextPath !== '/admin') params.set('next', nextPath);
  const query = params.toString();
  return query ? `${ADMIN_LOGIN_PATH}?${query}` : ADMIN_LOGIN_PATH;
};

/**
 * Solo se aceptan rutas internas para el redirect posterior al login: evita
 * que `?next=https://otro-sitio` convierta el login en un open redirect.
 */
export const sanitizeNextPath = (
  value: string | null,
  fallback = '/admin',
): string => {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
};
