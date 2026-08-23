DELETE FROM public.product_images;
DELETE FROM public.product_interests;
DELETE FROM public.product_status_history;
DELETE FROM public.product_price_history;
DELETE FROM public.inventory_movements;
DELETE FROM public.products;
DELETE FROM public.categories;

INSERT INTO public.categories (name, slug)
VALUES
  ('Refrigeradoras', 'refrigeradoras'),
  ('Televisores', 'televisores'),
  ('Cocinas', 'cocinas'),
  ('Lavadoras', 'lavadoras'),
  ('Licuadoras', 'licuadoras'),
  ('Microondas', 'microondas'),
  ('Cafeteras', 'cafeteras'),
  ('Pequeños electrodomésticos', 'pequenos-electrodomesticos')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    active = true;

INSERT INTO public.products (name, slug, description, price, quantity, category_id, status)
VALUES
  ('Refrigeradora LG 420L Inverter', 'refrigeradora-lg-420l-inverter', 'Refrigeradora no frost con compresor inverter y bajo consumo energético.', 6499, 6, (SELECT id FROM public.categories WHERE slug = 'refrigeradoras'), 'available'),
  ('Refrigeradora Mabe 300L', 'refrigeradora-mabe-300l', 'Modelo familiar con amplio congelador superior y bandejas de vidrio templado.', 4899, 4, (SELECT id FROM public.categories WHERE slug = 'refrigeradoras'), 'available'),
  ('Refrigeradora Samsung 520L Side by Side', 'refrigeradora-samsung-520l-side-by-side', 'Side by side con dispenser de agua y control digital externo.', 9899, 2, (SELECT id FROM public.categories WHERE slug = 'refrigeradoras'), 'available'),
  ('Smart TV Samsung 55" 4K', 'smart-tv-samsung-55-4k', 'Televisor UHD con HDR, apps de streaming y sonido envolvente.', 4299, 9, (SELECT id FROM public.categories WHERE slug = 'televisores'), 'available'),
  ('Smart TV TCL 43" Google TV', 'smart-tv-tcl-43-google-tv', 'Televisor 4K compacto con control por voz y Google TV integrado.', 2799, 11, (SELECT id FROM public.categories WHERE slug = 'televisores'), 'available'),
  ('Smart TV LG 65" NanoCell', 'smart-tv-lg-65-nanocell', 'Pantalla 65 pulgadas con colores intensos y sistema webOS.', 7399, 3, (SELECT id FROM public.categories WHERE slug = 'televisores'), 'available'),
  ('Cocina Bosch 5 Hornillas', 'cocina-bosch-5-hornillas', 'Cocina a gas con horno de gran capacidad y encendido electrónico.', 3599, 5, (SELECT id FROM public.categories WHERE slug = 'cocinas'), 'available'),
  ('Cocina Electrolux 4 Hornillas', 'cocina-electrolux-4-hornillas', 'Cocina compacta con tapa de vidrio y horno esmaltado fácil de limpiar.', 2899, 7, (SELECT id FROM public.categories WHERE slug = 'cocinas'), 'available'),
  ('Lavadora Samsung 19Kg Digital Inverter', 'lavadora-samsung-19kg-digital-inverter', 'Lavadora de alta capacidad con tecnología de ahorro energético.', 5199, 4, (SELECT id FROM public.categories WHERE slug = 'lavadoras'), 'available'),
  ('Lavadora Mabe 15Kg Automática', 'lavadora-mabe-15kg-automatica', 'Lavadora automática con múltiples programas para toda la familia.', 3299, 8, (SELECT id FROM public.categories WHERE slug = 'lavadoras'), 'available'),
  ('Licuadora Oster 600W', 'licuadora-oster-600w', 'Licuadora de vaso de vidrio con cuchillas de acero inoxidable y 3 velocidades.', 1299, 16, (SELECT id FROM public.categories WHERE slug = 'licuadoras'), 'available'),
  ('Licuadora Ninja Power Crush', 'licuadora-ninja-power-crush', 'Licuadora potente para jugos, salsas y mezclas con hielo.', 1699, 6, (SELECT id FROM public.categories WHERE slug = 'licuadoras'), 'available'),
  ('Microondas Panasonic 32L', 'microondas-panasonic-32l', 'Microondas de 32 litros con panel digital y función grill.', 1799, 10, (SELECT id FROM public.categories WHERE slug = 'microondas'), 'available'),
  ('Microondas Daewoo 20L', 'microondas-daewoo-20l', 'Modelo práctico para uso diario con descongelado rápido.', 999, 12, (SELECT id FROM public.categories WHERE slug = 'microondas'), 'available'),
  ('Cafetera Mr. Coffee 12 tazas', 'cafetera-mr-coffee-12-tazas', 'Cafetera programable con jarra de vidrio, plato caliente y apagado automático.', 899, 15, (SELECT id FROM public.categories WHERE slug = 'cafeteras'), 'available'),
  ('Cafetera Oster PrimaLatte', 'cafetera-oster-primalatte', 'Cafetera espresso con espumador y depósito de leche integrado.', 2199, 5, (SELECT id FROM public.categories WHERE slug = 'cafeteras'), 'available'),
  ('Batidora KitchenAid Artisan', 'batidora-kitchenaid-artisan', 'Batidora de pedestal con bowl de 4.8 litros, 10 velocidades y múltiples accesorios.', 15999, 0, (SELECT id FROM public.categories WHERE slug = 'pequenos-electrodomesticos'), 'out_of_stock'),
  ('Secadora Whirlpool 20Kg', 'secadora-whirlpool-20kg', 'Secadora de tambor con sensores de humedad y ciclos automáticos.', 5999, 0, (SELECT id FROM public.categories WHERE slug = 'lavadoras'), 'out_of_stock'),
  ('Televisor Sony 50" Bravia', 'televisor-sony-50-bravia', 'Televisor vendido de temporada anterior.', 3899, 0, (SELECT id FROM public.categories WHERE slug = 'televisores'), 'sold')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  quantity = EXCLUDED.quantity,
  category_id = EXCLUDED.category_id,
  status = EXCLUDED.status,
  active = true;

INSERT INTO public.product_images (product_id, url, position)
VALUES
  ((SELECT id FROM public.products WHERE slug = 'refrigeradora-lg-420l-inverter'), 'https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'refrigeradora-mabe-300l'), 'https://images.unsplash.com/photo-1584990347449-a4f2f29f80ff?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'refrigeradora-samsung-520l-side-by-side'), 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'smart-tv-samsung-55-4k'), 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'smart-tv-tcl-43-google-tv'), 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'smart-tv-lg-65-nanocell'), 'https://images.unsplash.com/photo-1577979749830-f1d742b96791?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'cocina-bosch-5-hornillas'), 'https://images.unsplash.com/photo-1556911220-bda9f7f7597e?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'cocina-electrolux-4-hornillas'), 'https://images.unsplash.com/photo-1556909172-8c2da00f76f6?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'lavadora-samsung-19kg-digital-inverter'), 'https://images.unsplash.com/photo-1626806787461-102c1a7f7f80?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'lavadora-mabe-15kg-automatica'), 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'licuadora-oster-600w'), 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'licuadora-ninja-power-crush'), 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'microondas-panasonic-32l'), 'https://images.unsplash.com/photo-1609592340143-a4d02370f2a9?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'cafetera-mr-coffee-12-tazas'), 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', 0),
  ((SELECT id FROM public.products WHERE slug = 'cafetera-oster-primalatte'), 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80', 0)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Administrador de DESARROLLO. Solo para el stack local (`supabase db reset`).
-- `seed.sql` no se ejecuta en la nube: alli el admin se crea desde el Dashboard.
-- Credenciales: admin@smal.local / admin123
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-000000000001',
  'authenticated',
  'authenticated',
  'admin@smal.local',
  extensions.crypt('admin123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Administrador SMAL"}'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Identidad de email: sin esta fila `signInWithPassword` no encuentra al usuario.
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000001',
  'email',
  '{"sub":"00000000-0000-4000-a000-000000000001","email":"admin@smal.local","email_verified":true,"phone_verified":false}'::jsonb,
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- El trigger `on_auth_user_created` ya creo el perfil; esto solo lo normaliza
-- por si el seed se re-ejecuta sobre una base existente.
UPDATE public.profiles
SET role = 'admin', active = true, name = 'Administrador SMAL'
WHERE id = '00000000-0000-4000-a000-000000000001';
