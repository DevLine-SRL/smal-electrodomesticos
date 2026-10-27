-- Store the product brand independently from its display name.
ALTER TABLE public.products
  ADD COLUMN brand text;

UPDATE public.products
SET brand = 'Sin marca'
WHERE brand IS NULL OR btrim(brand) = '';

ALTER TABLE public.products
  ALTER COLUMN brand SET DEFAULT 'Sin marca',
  ALTER COLUMN brand SET NOT NULL,
  ADD CONSTRAINT products_brand_valid
    CHECK (char_length(brand) <= 80 AND btrim(brand) <> '');

COMMENT ON COLUMN public.products.brand IS
  'Marca comercial del producto, mantenida separada del nombre.';
