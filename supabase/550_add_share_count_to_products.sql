-- ================================================================
-- 550_add_share_count_to_products.sql
-- Loadify Market — Add shareCount column to products
-- ================================================================
-- The frontend (SellerProducts.tsx, OnboardingChecklist.tsx) references
-- a `shareCount` column on the products table that was never added via a
-- migration.  The missing column causes PostgREST to return PGRST204
-- ("Column 'shareCount' of relation 'products' does not exist"), which
-- makes the SellerProducts page query fail silently and display
-- "0 products listed" even when the seller has active listings.
--
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- ================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "shareCount" INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN products."shareCount" IS
  'Number of times this product listing has been shared by the seller '
  'via the Share buttons in the Seller Products dashboard. '
  'Incremented client-side via SellerProducts.tsx persistShareCount().';

DO $$ BEGIN
  RAISE NOTICE '550_add_share_count_to_products: shareCount column added to products table.';
END $$;
