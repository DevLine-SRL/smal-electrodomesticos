CREATE TYPE public.inventory_movement_type AS ENUM (
  'adjustment',
  'deduction',
  'sale',
  'restock'
);

CREATE TYPE public.status_change_source AS ENUM (
  'automatic',
  'manual'
);

CREATE TABLE public.product_price_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_price  numeric(10,2) NOT NULL CHECK (old_price > 0),
  new_price  numeric(10,2) NOT NULL CHECK (new_price > 0),
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_price_history_product_id ON public.product_price_history(product_id);

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read price history" ON public.product_price_history
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

CREATE POLICY "Admin insert price history" ON public.product_price_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_admin()));

CREATE TABLE public.inventory_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type   public.inventory_movement_type NOT NULL,
  quantity_before integer NOT NULL CHECK (quantity_before >= 0),
  quantity_after  integer NOT NULL CHECK (quantity_after >= 0),
  quantity_change integer NOT NULL,
  reason          text,
  changed_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product_id ON public.inventory_movements(product_id);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read inventory movements" ON public.inventory_movements
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

CREATE POLICY "Admin insert inventory movements" ON public.inventory_movements
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_admin()));

CREATE TABLE public.product_status_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_status public.product_status NOT NULL,
  new_status public.product_status NOT NULL,
  source     public.status_change_source NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_status_history_product_id ON public.product_status_history(product_id);

ALTER TABLE public.product_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read status history" ON public.product_status_history
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

CREATE POLICY "Admin insert status history" ON public.product_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_admin()));

CREATE TABLE public.product_interests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel    text NOT NULL DEFAULT 'whatsapp',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_interests_product_id ON public.product_interests(product_id);

ALTER TABLE public.product_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can register interest" ON public.product_interests
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admin read interests" ON public.product_interests
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

GRANT SELECT, INSERT ON public.product_price_history TO authenticated;
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT SELECT, INSERT ON public.product_status_history TO authenticated;
GRANT SELECT ON public.product_interests TO authenticated;
GRANT INSERT ON public.product_interests TO anon;
