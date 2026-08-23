declare module 'virtual:icons/*?astro' {
  const component: (props: Record<string, unknown>) => unknown;
  export default component;
}

declare namespace App {
  interface Locals {
    /** Cliente Supabase ligado a las cookies de sesion de esta peticion. */
    supabase: import('./db/supabase-server').ServerSupabaseClient;
    /** Usuario autenticado, validado contra el servidor de Auth. */
    user: import('@supabase/supabase-js').User | null;
    /** Perfil del usuario. Solo se rellena si es un admin activo. */
    profile: import('./services/auth/session').AdminProfile | null;
  }
}
