-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 444: Re-create proof-of-delivery storage bucket
--
-- The bucket was defined in 30_storage_buckets.sql but was found missing
-- in the live database (verification 2026-04-24).
--
-- This migration re-creates the bucket and its RLS policies using the same
-- specification as 30_storage_buckets.sql.  All statements are idempotent
-- (ON CONFLICT DO UPDATE, DROP POLICY IF EXISTS before CREATE POLICY).
--
-- Bucket characteristics:
--   • private (public = FALSE)
--   • 10 MB per-file limit
--   • Accepted MIME types: jpeg, jpg, png, webp, pdf
--   • Uploads are performed server-side via the upload-proof-of-delivery
--     Netlify function using the service-role key (bypasses RLS).
--   • Direct client writes restricted to admins only (emergency fallback).
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proof-of-delivery',
  'proof-of-delivery',
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

-- ── RLS POLICIES: proof-of-delivery ─────────────────────────────────────────

-- Authenticated users can read proof-of-delivery files
DROP POLICY IF EXISTS "pod_select" ON storage.objects;
CREATE POLICY "pod_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'proof-of-delivery'
    AND auth.role() = 'authenticated'
  );

-- No direct client insert — uploads go through the service-role
-- Netlify function (upload-proof-of-delivery).
-- Admins may upload manually in emergencies.
DROP POLICY IF EXISTS "pod_insert" ON storage.objects;
CREATE POLICY "pod_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'proof-of-delivery'
    AND auth.role() = 'authenticated'
    AND is_admin()
  );

DROP POLICY IF EXISTS "pod_delete" ON storage.objects;
CREATE POLICY "pod_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'proof-of-delivery'
    AND is_admin()
  );

DO $$ BEGIN
  RAISE NOTICE '444_add_proof_of_delivery_bucket: proof-of-delivery bucket created/updated + RLS policies applied.';
END $$;
