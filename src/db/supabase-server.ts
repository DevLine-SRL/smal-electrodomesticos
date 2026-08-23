import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type ServerSupabaseClient = SupabaseClient<Database>;

const IS_PRODUCTION = import.meta.env.PROD;

const cookieDefaults: CookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: IS_PRODUCTION,
};

/**
 * Cliente Supabase ligado a las cookies de una peticion concreta.
 *
 * No reemplaza a `src/db/supabase.ts`: ese singleton anonimo sigue sirviendo al
 * catalogo publico. Este se usa donde hace falta la sesion del administrador,
 * porque las policies RLS de admin dependen de `auth.uid()`.
 */
export const createSupabaseServerClient = (
  cookies: AstroCookies,
): ServerSupabaseClient =>
  createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        getAll: () =>
          cookies
            .getAll()
            .map(({ name, value }) => ({ name, value: value ?? '' })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, { ...cookieDefaults, ...options });
          });
        },
      },
    },
  );
