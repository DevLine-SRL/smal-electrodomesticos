-- Operaciones rápidas de inventario: cada función bloquea la fila del producto
-- para que dos administradores nunca calculen sobre un stock desactualizado.

CREATE FUNCTION public.change_product_price(
  p_product_id uuid,
  p_new_price numeric
)
  RETURNS public.products
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
  AS $function$
declare
  v_product public.products;
  v_old_price numeric;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_new_price is null or p_new_price <= 0 then
    raise exception 'invalid_price' using errcode = 'P0001';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and active = true
  for update;

  if v_product is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  v_old_price := v_product.price;

  update public.products
  set price = p_new_price
  where id = p_product_id
  returning * into v_product;

  insert into public.product_price_history (product_id, old_price, new_price, changed_by)
  values (p_product_id, v_old_price, p_new_price, auth.uid());

  return v_product;
end;
$function$;

CREATE FUNCTION public.set_product_quantity(
  p_product_id uuid,
  p_quantity integer,
  p_confirm_sold boolean DEFAULT false
)
  RETURNS public.products
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
  AS $function$
declare
  v_product public.products;
  v_status public.product_status;
  v_old_quantity integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and active = true
  for update;

  if v_product is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_product.status = 'sold' and not p_confirm_sold then
    raise exception 'sold_product' using errcode = 'P0001';
  end if;

  v_old_quantity := v_product.quantity;

  v_status := case
    when p_quantity = 0 then 'out_of_stock'::public.product_status
    when v_product.status = 'out_of_stock' then 'available'::public.product_status
    else v_product.status
  end;

  update public.products
  set quantity = p_quantity, status = v_status
  where id = p_product_id
  returning * into v_product;

  insert into public.inventory_movements
    (product_id, movement_type, quantity_before, quantity_after, quantity_change, changed_by)
  values
    (p_product_id, 'adjustment', v_old_quantity, p_quantity, p_quantity - v_old_quantity, auth.uid());

  return v_product;
end;
$function$;

CREATE FUNCTION public.deduct_product_stock(
  p_product_id uuid,
  p_quantity integer,
  p_reason text DEFAULT null
)
  RETURNS public.products
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
  AS $function$
declare
  v_product public.products;
  v_new_quantity integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid_deduction' using errcode = 'P0001';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and active = true
  for update;

  if v_product is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if p_quantity > v_product.quantity then
    raise exception 'insufficient_stock:%', v_product.quantity using errcode = 'P0001';
  end if;

  v_new_quantity := v_product.quantity - p_quantity;

  update public.products
  set quantity = v_new_quantity,
      status = case when v_new_quantity = 0 then 'out_of_stock'::public.product_status else status end
  where id = p_product_id
  returning * into v_product;

  insert into public.inventory_movements
    (product_id, movement_type, quantity_before, quantity_after, quantity_change, reason, changed_by)
  values
    (p_product_id, 'deduction', v_product.quantity + p_quantity, v_new_quantity, -p_quantity, nullif(trim(p_reason), ''), auth.uid());

  return v_product;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.change_product_price(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_product_quantity(uuid, integer, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deduct_product_stock(uuid, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.change_product_price(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_quantity(uuid, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_product_stock(uuid, integer, text) TO authenticated;
