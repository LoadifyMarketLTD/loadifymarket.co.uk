-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 130: Add "Business Supplies" category.
--
-- The header navigation links to /category/business-supplies for the
-- "Business Supplies" category, which resolves to the `business` DB slug
-- via CategoryPage + category-config.ts productFilter.categorySlug.
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, description, "order", "isActive") VALUES
  ('Business Supplies', 'business', 'Office, safety, cleaning and business essentials', 20, TRUE)
ON CONFLICT (slug) DO NOTHING;
