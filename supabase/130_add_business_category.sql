-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 130: Add "Business Supplies" category.
--
-- The header navigation links to /shop?category=business for the
-- "Business Supplies" category.  This migration adds the corresponding DB row
-- so the slug can be resolved to a UUID by the ShopPage.
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, description, "order", "isActive") VALUES
  ('Business Supplies', 'business', 'Office, safety, cleaning and business essentials', 20, TRUE)
ON CONFLICT (slug) DO NOTHING;
