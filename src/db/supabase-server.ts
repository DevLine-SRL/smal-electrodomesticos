import {
  createServerClient,
  parseCookieHeader,
  type CookieOptions,
} from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type ServerSupabaseClient = SupabaseClient<Database>;

const cookieDefaults: CookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: import.meta.env.PROD,
};

/**
 * Cliente Supabase ligado a las cookies de una peticion concreta.
 *
 * No reemplaza a `src/db/supabase.ts`: ese singleton anonimo sigue sirviendo al
 * catalogo publico. Este se usa donde hace falta la sesion del administrador,
 * porque las policies RLS de admin dependen de `auth.uid()`.
 *
 * La lectura sale de la cabecera `Cookie` cruda porque `AstroCookies` solo
 * permite consultar nombres conocidos, y los tokens de Supabase van partidos en
 * varias cookies numeradas.
 */
export const createSupabaseServerClient = (
  request: Request,
  cookies: AstroCookies,
): ServerSupabaseClient =>
  createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        getAll: () =>
          parseCookieHeader(request.headers.get('Cookie') ?? '').map(
            ({ name, value }) => ({ name, value: value ?? '' }),
          ),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, { ...cookieDefaults, ...options });
          });
        },
      },
    },
  );
