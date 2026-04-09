-- ================================================================
-- 30_storage_buckets.sql
-- Loadify Market — SUPABASE STORAGE BUCKET SETUP
-- ================================================================
-- Run this in the Supabase SQL Editor AFTER the main schema
-- (00_consolidated_schema.sql) has been applied.
--
-- Creates the two buckets required by the application:
--   1. product-images  — seller product photo uploads (public)
--   2. proof-of-delivery — shipment proof uploads (private/service-role)
-- ================================================================

-- ──────────────────────────────────────────────────────────────
-- BUCKET 1: product-images (public read, seller write)
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  5242880,  -- 5 MB per file
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

-- ──────────────────────────────────────────────────────────────
-- BUCKET 2: proof-of-delivery (private, service-role write)
-- ──────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────
-- RLS POLICIES: product-images
-- ──────────────────────────────────────────────────────────────

-- Anyone can read public product images
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- Authenticated sellers/admins/owners can upload images
-- Path convention: sellers/{sellerId}/{timestamp}-{random}.{ext}
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (
      -- The path must start with sellers/{user's own id}/
      (storage.foldername(name))[1] = 'sellers'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Sellers can update/replace their own images; admins can update any
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
CREATE POLICY "product_images_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR is_admin()
    )
  );

-- Sellers can delete their own images; admins can delete any
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR is_admin()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- RLS POLICIES: proof-of-delivery
-- ──────────────────────────────────────────────────────────────
-- These are intentionally restrictive — uploads happen via the
-- Netlify serverless function using the service-role key, which
-- bypasses RLS entirely. Direct client access is denied.

-- Authenticated users can read proof-of-delivery files
-- (order buyers, involved sellers, and admins)
DROP POLICY IF EXISTS "pod_select" ON storage.objects;
CREATE POLICY "pod_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'proof-of-delivery'
    AND auth.role() = 'authenticated'
  );

-- No direct client insert — uploads go through the service-role
-- Netlify function (upload-proof-of-delivery).
-- Admins/owners may need manual uploads in emergencies.
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
