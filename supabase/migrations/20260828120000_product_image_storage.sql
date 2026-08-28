-- HU-02: almacenamiento y control de acceso para las fotografías de productos.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (select public.is_admin())
  );

CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (select public.is_admin())
  );

-- Permite deshacer una alta parcial si falla la carga de las imágenes.
CREATE POLICY "Admin delete products" ON public.products
  FOR DELETE
  TO authenticated
  USING ((select public.is_admin()));

GRANT DELETE ON public.products TO authenticated;
