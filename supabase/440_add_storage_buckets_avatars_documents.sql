-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 440: Add missing storage buckets — avatars and documents
--
-- Migration 30 (30_storage_buckets.sql) created product-images and
-- proof-of-delivery.  Two additional buckets required by the application
-- were never created:
--
--   • avatars   — user/seller profile pictures (public read)
--   • documents — seller verification documents / KYC uploads (private)
--
-- Both INSERTs are idempotent (ON CONFLICT DO UPDATE).
-- ──────────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- BUCKET: avatars  (public read, authenticated write to own folder)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2097152,   -- 2 MB per file
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone can read public avatars
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar.
-- Path convention: {userId}/avatar.{ext}
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can replace their own avatar; admins can update any
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- Users can delete their own avatar; admins can delete any
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- BUCKET: documents  (private — seller KYC / verification uploads)
-- Uploads are performed server-side (Netlify functions with service-role key).
-- Direct client writes are restricted to admins only.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  FALSE,
  10485760,  -- 10 MB per file
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Authenticated users can read their own documents; admins can read all
DROP POLICY IF EXISTS "documents_select" ON storage.objects;
CREATE POLICY "documents_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- Server-side uploads go via service-role (bypasses RLS).
-- Direct client insert only for admins in emergencies.
DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
CREATE POLICY "documents_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND is_admin()
  );

DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
CREATE POLICY "documents_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND is_admin()
  );
