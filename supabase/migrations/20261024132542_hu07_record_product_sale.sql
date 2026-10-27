-- A sale of one unit and a sale of the whole lot have different inventory
-- outcomes. Keep both operations atomic and serialize concurrent sales.
CREATE FUNCTION public.record_product_sale(
  p_product_id uuid,
  p_sale_mode text
)
  RETURNS public.products
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
  AS $function$
declare
  v_product public.products;
  v_new_quantity integer;
  v_new_status public.product_status;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_sale_mode is null or p_sale_mode not in ('unit', 'lot') then
    raise exception 'invalid_sale_mode' using errcode = 'P0001';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and active = true
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_product.status = 'sold' then
    raise exception 'already_sold' using errcode = 'P0001';
  end if;

  if p_sale_mode = 'unit' then
    if v_product.quantity < 1 then
      raise exception 'no_stock' using errcode = 'P0001';
    end if;

    v_new_quantity := v_product.quantity - 1;
    v_new_status := case
      when v_new_quantity = 0 then 'sold'::public.product_status
      else v_product.status
    end;

    if v_new_status = 'sold' then
      perform set_config('app.status_change_source', 'manual', true);
    end if;

    update public.products
    set quantity = v_new_quantity, status = v_new_status
    where id = p_product_id
    returning * into v_product;

    insert into public.inventory_movements
      (product_id, movement_type, quantity_before, quantity_after, quantity_change, reason, changed_by)
    values
      (p_product_id, 'sale', v_new_quantity + 1, v_new_quantity, -1, 'Venta de una unidad', auth.uid());
  else
    v_new_quantity := v_product.quantity;
    perform set_config('app.status_change_source', 'manual', true);

    update public.products
    set quantity = 0, status = 'sold'
    where id = p_product_id
    returning * into v_product;

    if v_new_quantity > 0 then
      insert into public.inventory_movements
        (product_id, movement_type, quantity_before, quantity_after, quantity_change, reason, changed_by)
      values
        (p_product_id, 'sale', v_new_quantity, 0, -v_new_quantity, 'Venta de todo el lote', auth.uid());
    end if;
  end if;

  return v_product;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_product_sale(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_product_sale(uuid, text) TO authenticated;

-- The edit workflow needs to remove image rows as well as their Storage files.
CREATE POLICY "Admin delete product images" ON public.product_images
  FOR DELETE
  TO authenticated
  USING ((select public.is_admin()));
GRANT DELETE ON public.product_images TO authenticated;

-- Keep the persisted amount and its audit record at the same cent precision.
CREATE OR REPLACE FUNCTION public.change_product_price(
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

  if p_new_price is null or p_new_price <= 0
    or p_new_price <> round(p_new_price, 2) then
    raise exception 'invalid_price' using errcode = 'P0001';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and active = true
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  v_old_price := v_product.price;

  if v_old_price = p_new_price then
    return v_product;
  end if;

  update public.products
  set price = p_new_price
  where id = p_product_id
  returning * into v_product;

  insert into public.product_price_history
    (product_id, old_price, new_price, changed_by)
  values
    (p_product_id, v_old_price, v_product.price, auth.uid());

  return v_product;
end;
$function$;

-- Do not let the generic status RPC bypass the explicit sale workflow.
CREATE OR REPLACE FUNCTION public.set_product_status(
  p_product_id uuid,
  p_new_status public.product_status,
  p_force boolean DEFAULT false
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

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_product.status = p_new_status then
    return v_product;
  end if;

  if p_new_status = 'sold' then
    raise exception 'sale_mode_required' using errcode = 'P0001';
  end if;

  if p_new_status = 'available' and v_product.quantity = 0 and not p_force then
    raise exception 'stock_zero' using errcode = 'P0001';
  end if;

  if v_product.status = 'sold' and not p_force then
    raise exception 'reverting_sold' using errcode = 'P0001';
  end if;

  perform set_config('app.status_change_source', 'manual', true);

  update public.products
  set status = p_new_status
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$function$;

-- Public interest logging is limited to a valid channel and a currently
-- purchasable product, even when the endpoint is called directly.
DROP POLICY IF EXISTS "Public can register interest" ON public.product_interests;
CREATE POLICY "Public can register interest" ON public.product_interests
  FOR INSERT
  TO anon
  WITH CHECK (
    channel IN ('whatsapp', 'phone')
    AND EXISTS (
      SELECT 1
      FROM public.products AS product
      WHERE product.id = product_interests.product_id
        AND product.active = true
        AND product.status = 'available'
        AND product.quantity > 0
    )
  );
