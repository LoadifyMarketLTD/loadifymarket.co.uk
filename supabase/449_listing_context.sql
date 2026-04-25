-- ================================================================
-- 449_listing_context.sql
-- Loadify Market — Service vs Goods Listing Context
-- ================================================================
-- Adds a listingContext discriminator to the products table.
--   'service' → service listing (no stock, no shipping, no weight)
--   'goods'   → physical product (stock tracking active)
--
-- Default is 'service' to match the platform's primary business model.
-- Existing physical-goods listing types are back-filled to 'goods'.
--
-- Safe to run multiple times (idempotent).
-- ================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "listingContext" TEXT NOT NULL DEFAULT 'service'
    CHECK ("listingContext" IN ('service', 'goods'));

-- Back-fill: physical-goods product types
UPDATE products
SET "listingContext" = 'goods'
WHERE type IN ('pallet', 'lot', 'clearance', 'wholesale', 'logistics');

CREATE INDEX IF NOT EXISTS idx_products_listing_context
  ON products ("listingContext");

DO $$ BEGIN
  RAISE NOTICE '449_listing_context: listingContext column added to products.';
END $$;
