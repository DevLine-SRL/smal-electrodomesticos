import type { APIRoute } from 'astro';
import { ADMIN_LOGIN_PATH } from '../../../services/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  // signOut revoca el refresh token en el servidor; el adaptador de cookies de
  // @supabase/ssr borra las cookies de sesion en la misma respuesta.
  try {
    const { error } = await locals.supabase.auth.signOut();
    if (error) {
      return new Response(JSON.stringify({ code: 'logout_failed' }), {
        status: 503,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'private, no-store',
        },
      });
    }
    return redirect(ADMIN_LOGIN_PATH, 303);
  } catch {
    return new Response(JSON.stringify({ code: 'logout_failed' }), {
      status: 503,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, no-store',
      },
    });
  }
};
