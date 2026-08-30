-- 609_lock_storage_writes_to_bucket_contracts.sql
--
-- Checkpoint A storage-policy reconciliation.
--
-- Production currently contains three legacy cross-bucket policies that are not
-- represented in migration history:
--   authenticated_insert_own_folder
--   authenticated_update_own_objects
--   authenticated_delete_own_objects
--
-- Those policies weaken the canonical per-bucket contracts by allowing a client
-- write whenever ownership/path rules happen to match, even for private buckets
-- whose intended contract is server-managed or admin-only.
--
-- Canonical rule after this migration:
--   * product-images: public read; new seller uploads only under
--     sellers/{sellerId}/...; seller/admin UPDATE/DELETE remain explicit and
--     bucket-scoped;
--   * existing product-images/uploads/... rows remain UPDATE/DELETE-manageable
--     only by their active seller owner (or admin), but no new legacy-path INSERT
--     capability is preserved;
--   * avatars: existing bucket-specific own-folder policies remain authoritative;
--   * documents / proof-of-delivery: existing server/admin write policies remain
--     authoritative;
--   * seller-documents / order-documents: no generic client-write fallback;
--   * no object rows or commercial history are deleted by this migration.

-- Remove live drift that grants write capability across bucket boundaries.
DROP POLICY IF EXISTS authenticated_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS authenticated_update_own_objects ON storage.objects;
DROP POLICY IF EXISTS authenticated_delete_own_objects ON storage.objects;

-- Restore explicit product-image update/delete capabilities. Canonical objects
-- use sellers/{sellerId}/... and are authorised from the live active-account
-- helpers installed by migration 608. Production also contains historical
-- product-image objects under uploads/...; preserve UPDATE/DELETE for those rows
-- only when the authenticated active seller owns the existing storage object.
-- This is compatibility for existing rows, not a legacy INSERT path: the only
-- product-image INSERT policy remains product_images_seller_insert.
DROP POLICY IF EXISTS product_images_update ON storage.objects;
DROP POLICY IF EXISTS product_images_seller_update ON storage.objects;
CREATE POLICY product_images_seller_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    public.is_admin()
    OR (
      public.is_seller()
      AND (
        (
          (storage.foldername(name))[1] = 'sellers'
          AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
        )
        OR (
          (storage.foldername(name))[1] = 'uploads'
          AND owner = (SELECT auth.uid())
        )
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    public.is_admin()
    OR (
      public.is_seller()
      AND (
        (
          (storage.foldername(name))[1] = 'sellers'
          AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
        )
        OR (
          (storage.foldername(name))[1] = 'uploads'
          AND owner = (SELECT auth.uid())
        )
      )
    )
  )
);

DROP POLICY IF EXISTS product_images_delete ON storage.objects;
DROP POLICY IF EXISTS product_images_seller_delete ON storage.objects;
CREATE POLICY product_images_seller_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    public.is_admin()
    OR (
      public.is_seller()
      AND (
        (
          (storage.foldername(name))[1] = 'sellers'
          AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
        )
        OR (
          (storage.foldername(name))[1] = 'uploads'
          AND owner = (SELECT auth.uid())
        )
      )
    )
  )
);

-- Fail the migration rather than accepting an unexpected policy surface.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename = 'objects'
       AND policyname = ANY (ARRAY[
         'authenticated_insert_own_folder',
         'authenticated_update_own_objects',
         'authenticated_delete_own_objects'
       ])
  ) THEN
    RAISE EXCEPTION 'legacy cross-bucket storage write policy remains installed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename = 'objects'
       AND policyname = 'product_images_seller_update'
       AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'product_images_seller_update policy was not installed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename = 'objects'
       AND policyname = 'product_images_seller_delete'
       AND cmd = 'DELETE'
  ) THEN
    RAISE EXCEPTION 'product_images_seller_delete policy was not installed';
  END IF;
END;
$$;
;
