CREATE TYPE public.app_role AS ENUM (
  'admin'
);

CREATE TYPE public.product_status AS ENUM (
  'available',
  'out_of_stock',
  'sold'
);

CREATE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  name       text,
  role       public.app_role NOT NULL DEFAULT 'admin',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.is_active()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$function$;

CREATE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$function$;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Read own or admin read all" ON public.profiles
  FOR SELECT
  USING ((auth.uid() = id) OR (select public.is_admin()));

CREATE POLICY "Block inactive users" ON public.profiles
  AS RESTRICTIVE
  TO authenticated
  USING ((select public.is_active()));

CREATE TABLE public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active categories" ON public.categories
  FOR SELECT
  TO anon
  USING (active = true);

CREATE POLICY "Admin read all categories" ON public.categories
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()) OR active = true);

CREATE POLICY "Admin insert categories" ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Admin update categories" ON public.categories
  FOR UPDATE
  TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

CREATE TABLE public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  price       numeric(10,2) NOT NULL CHECK (price > 0),
  quantity    integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  status      public.product_status NOT NULL DEFAULT 'available',
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_status ON public.products(status);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read available products" ON public.products
  FOR SELECT
  TO anon
  USING (active = true AND status = 'available');

CREATE POLICY "Admin read all products" ON public.products
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()) OR (active = true AND status = 'available'));

CREATE POLICY "Admin insert products" ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Admin update products" ON public.products
  FOR UPDATE
  TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

CREATE TABLE public.product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url        text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read images" ON public.product_images
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admin read all images" ON public.product_images
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()) OR true);

CREATE POLICY "Admin insert images" ON public.product_images
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Admin update images" ON public.product_images
  FOR UPDATE
  TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

GRANT SELECT ON public.categories, public.products, public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE ON public.categories, public.products, public.product_images TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
