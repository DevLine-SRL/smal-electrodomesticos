INSERT INTO public.categories (name, slug) VALUES
  ('Licuadoras', 'licuadoras'),
  ('Cafeteras', 'cafeteras'),
  ('Batidoras', 'batidoras')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (name, slug, description, price, quantity, category_id, status) VALUES
  (
    'Licuadora Oster 600W',
    'licuadora-oster-600w',
    'Licuadora de vaso de vidrio con cuchillas de acero inoxidable y 3 velocidades.',
    1299,
    10,
    (select id from public.categories where slug = 'licuadoras'),
    'available'
  ),
  (
    'Cafetera Mr. Coffee 12 tazas',
    'cafetera-mr-coffee-12-tazas',
    'Cafetera programable con jarra de vidrio, plato caliente y apagado automático.',
    899,
    5,
    (select id from public.categories where slug = 'cafeteras'),
    'available'
  ),
  (
    'Batidora KitchenAid Artisan',
    'batidora-kitchenaid-artisan',
    'Batidora de pedestal con bowl de 4.8 litros, 10 velocidades y múltiples accesorios.',
    15999,
    0,
    (select id from public.categories where slug = 'batidoras'),
    'out_of_stock'
  )
ON CONFLICT (slug) DO NOTHING;
