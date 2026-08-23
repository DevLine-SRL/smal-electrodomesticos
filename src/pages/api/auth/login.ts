import type { APIRoute } from 'astro';
import { getAdminProfile, sanitizeNextPath } from '../../../services/auth/session';

export const prerender = false;

interface LoginLock {
  locked: boolean;
  remaining_seconds: number;
  attempts_left: number;
  max_attempts: number;
  lock_minutes: number;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;

  let email = '';
  let password = '';
  let next: string | null = null;

  try {
    const body = await request.json();
    email = typeof body.email === 'string' ? body.email.trim() : '';
    password = typeof body.password === 'string' ? body.password : '';
    next = typeof body.next === 'string' ? body.next : null;
  } catch {
    return json({ code: 'invalid_request' }, 400);
  }

  // El detalle por campo lo muestra el cliente antes de llegar aqui; esto es
  // la red de seguridad para peticiones que no vengan del formulario.
  if (!email || !password || !EMAIL_PATTERN.test(email)) {
    return json({ code: 'invalid_request' }, 400);
  }

  try {
    const { data: lockData } = await supabase.rpc('get_login_lock', {
      p_email: email,
    });
    const lock = lockData as unknown as LoginLock | null;

    if (lock?.locked) {
      return json(
        { code: 'locked', remainingSeconds: lock.remaining_seconds },
        423,
      );
    }

    const { data: signIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signIn.user) {
      // Un error de red hacia el servidor de Auth no es una credencial mala.
      // supabase-js marca los fallos de fetch como AuthRetryableFetchError y
      // les deja `status` en 0 o sin definir.
      const status = signInError?.status ?? 0;
      if (!status || status >= 500) {
        return json({ code: 'network_error' }, 503);
      }

      const { data: failureData } = await supabase.rpc(
        'register_failed_login',
        { p_email: email },
      );
      const failure = failureData as unknown as LoginLock | null;

      if (failure?.locked) {
        return json(
          { code: 'locked', remainingSeconds: failure.remaining_seconds },
          423,
        );
      }

      return json(
        {
          code: 'invalid_credentials',
          attemptsLeft: failure?.attempts_left ?? null,
        },
        401,
      );
    }

    const profile = await getAdminProfile(supabase, signIn.user.id);

    if (!profile) {
      await supabase.auth.signOut();
      return json({ code: 'not_admin' }, 403);
    }

    await supabase.rpc('reset_login_attempts', { p_email: email });

    return json({ redirectTo: sanitizeNextPath(next) }, 200);
  } catch {
    return json({ code: 'network_error' }, 503);
  }
};
