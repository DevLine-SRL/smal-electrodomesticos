-- HU-08: trazabilidad de cambios de estado.
--
-- El trigger registra CUALQUIER cambio de `products.status`, venga de donde
-- venga. El origen se marca como 'manual' solo si la transaccion lo declaro
-- via `set_config('app.status_change_source', 'manual', true)`; en caso
-- contrario queda como 'automatic'. Asi los cambios automaticos por stock 0
-- (HU-05/HU-06) quedan registrados sin que esas historias escriban codigo.

CREATE FUNCTION public.log_product_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
begin
  insert into public.product_status_history
    (product_id, old_status, new_status, source, changed_by)
  values (
    new.id,
    old.status,
    new.status,
    coalesce(
      nullif(current_setting('app.status_change_source', true), '')::public.status_change_source,
      'automatic'
    ),
    auth.uid()
  );

  return new;
end;
$function$;

CREATE TRIGGER trg_products_status_history
  AFTER UPDATE OF status ON public.products
  FOR EACH ROW
  WHEN (old.status IS DISTINCT FROM new.status)
  EXECUTE FUNCTION public.log_product_status_change();

-- Cambio manual de estado, atomico y con las salvaguardas de HU-08.
-- SECURITY INVOKER: la policy "Admin update products" sigue aplicando.
CREATE FUNCTION public.set_product_status(
  p_product_id uuid,
  p_new_status public.product_status,
  p_force      boolean DEFAULT false
)
  RETURNS public.products
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
  AS $function$
declare
  v_product public.products;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  -- FOR UPDATE serializa dos administradores editando el mismo producto.
  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if v_product is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_product.status = p_new_status then
    return v_product;
  end if;

  -- Marcar "disponible" algo sin stock real necesita confirmacion explicita.
  if p_new_status = 'available' and v_product.quantity = 0 and not p_force then
    raise exception 'stock_zero' using errcode = 'P0001';
  end if;

  -- Revertir una venta cerrada necesita confirmacion adicional.
  if v_product.status = 'sold' and not p_force then
    raise exception 'reverting_sold' using errcode = 'P0001';
  end if;

  perform set_config('app.status_change_source', 'manual', true);

  -- Solo se toca `status`: el stock nunca se modifica desde HU-08.
  update public.products
  set status = p_new_status
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_product_status(uuid, public.product_status, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_product_status(uuid, public.product_status, boolean) TO authenticated;
