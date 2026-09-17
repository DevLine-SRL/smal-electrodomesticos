-- HU-10: an active product keeps its public detail after selling out.
-- Catalog queries still explicitly filter status = 'available'.
-- Inactive/deleted products remain inaccessible to anonymous clients.
CREATE POLICY "HU10 public read active product details" ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (active = true);
