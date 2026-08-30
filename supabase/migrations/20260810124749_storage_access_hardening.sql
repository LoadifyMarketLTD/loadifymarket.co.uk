DROP POLICY IF EXISTS pod_select ON storage.objects;
CREATE POLICY pod_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'proof-of-delivery'
  AND EXISTS (
    SELECT 1
    FROM public.shipments s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        (select auth.uid()) = s.seller_id
        OR (select auth.uid()) = s.buyer_id
        OR public.is_admin()
      )
  )
);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS product_images_seller_insert ON storage.objects;
CREATE POLICY product_images_seller_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (public.is_seller() OR public.is_admin())
);

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp']::text[]
WHERE id = 'product-images';;
