-- ================================================================
-- 180_fk_products_seller_relationships.sql
-- Loadify Market — Add FK constraints: products.sellerId → seller_profiles / seller_stores
-- ================================================================
-- The products.sellerId column holds the seller's user UUID.
-- Both seller_profiles.userId and seller_stores.userId are PKs
-- that equal users.id for that seller.
--
-- Adding these FK constraints lets PostgREST auto-resolve embedded
-- resource joins such as:
--   products!inner(*, seller_profiles!sellerId(...))
--   products!inner(*, seller_stores!sellerId(...))
--
-- Run AFTER all existing migrations (00 → 170).
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. products.sellerId → seller_profiles(userId)
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_products_seller_profile'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT fk_products_seller_profile
      FOREIGN KEY ("sellerId")
      REFERENCES seller_profiles("userId")
      ON DELETE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 2. products.sellerId → seller_stores(userId)
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_products_seller_store'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT fk_products_seller_store
      FOREIGN KEY ("sellerId")
      REFERENCES seller_stores("userId")
      ON DELETE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 3. Update column comment to reflect all FK targets
--    (supersedes the comment set by migration 170)
-- ────────────────────────────────────────────────────────────────
COMMENT ON COLUMN products."sellerId"
  IS 'FK → users.id · seller_profiles.userId · seller_stores.userId (all equal the seller user UUID)';
