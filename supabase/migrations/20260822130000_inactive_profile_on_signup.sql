-- Endurecimiento de HU-01.
--
-- `handle_new_user()` creaba el perfil con role='admin' y active=true, asi que
-- cualquier alta en `auth.users` se convertia en administrador. Desactivar el
-- registro es la primera linea de defensa, pero vive en la configuracion del
-- proyecto (config.toml / Dashboard) y puede volver a activarse por descuido.
--
-- Aqui el perfil nace inactivo: `is_admin()` exige `active = true`, y la policy
-- restrictiva "Block inactive users" corta el acceso a `profiles`. Un alta nueva
-- queda inerte hasta que un administrador la habilite a proposito.
--
-- Consecuencia operativa: al crear el primer administrador desde el Dashboard de
-- Supabase hay que activarlo a mano una vez:
--   update public.profiles set active = true where email = '<correo>';

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
begin
  insert into public.profiles (id, email, name, active)
  values (new.id, new.email, new.raw_user_meta_data->>'name', false);
  return new;
end;
$function$;
