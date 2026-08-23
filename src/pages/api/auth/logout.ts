import type { APIRoute } from 'astro';
import { ADMIN_LOGIN_PATH } from '../../../services/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  // signOut revoca el refresh token en el servidor; el adaptador de cookies de
  // @supabase/ssr borra las cookies de sesion en la misma respuesta.
  await locals.supabase.auth.signOut();
  return redirect(ADMIN_LOGIN_PATH, 303);
};
