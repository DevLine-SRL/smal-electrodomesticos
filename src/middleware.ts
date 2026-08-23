import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './db/supabase-server';
import {
  ADMIN_LOGIN_PATH,
  buildLoginRedirect,
  getAdminProfile,
} from './services/auth/session';

const isAdminPage = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');

const isAdminApi = (pathname: string) => pathname.startsWith('/api/admin');

const unauthorized = () =>
  new Response(JSON.stringify({ code: 'unauthorized' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals, url, redirect } = context;
  const supabase = createSupabaseServerClient(cookies);

  locals.supabase = supabase;
  locals.user = null;
  locals.profile = null;

  const pathname = url.pathname;
  const needsAdmin =
    (isAdminPage(pathname) && pathname !== ADMIN_LOGIN_PATH) ||
    isAdminApi(pathname);

  // Solo se paga la llamada a Auth donde importa; el catalogo publico no la usa.
  if (!needsAdmin && pathname !== ADMIN_LOGIN_PATH) {
    return next();
  }

  // getUser() valida el JWT contra el servidor de Auth. getSession() se limita
  // a leer la cookie, que el cliente puede manipular.
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  if (user) {
    locals.user = user;
    locals.profile = await getAdminProfile(supabase, user.id);
  }

  if (!needsAdmin) return next();

  if (!locals.user || !locals.profile) {
    // Sesion expirada, inexistente o de alguien que ya no es admin activo.
    if (locals.user) await supabase.auth.signOut();
    locals.user = null;
    locals.profile = null;

    return isAdminApi(pathname)
      ? unauthorized()
      : redirect(buildLoginRedirect(pathname + url.search));
  }

  return next();
});
