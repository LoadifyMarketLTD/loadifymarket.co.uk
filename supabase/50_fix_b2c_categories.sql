-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 50: Ensure all B2C category slugs expected by the frontend exist.
--
-- The ShopPage uses these exact slugs in its B2C_CATEGORIES constant:
--   electronics, fashion, home-garden, tools, vehicles, handmade
--
-- home-garden and handmade were already in the schema seed (migration 00).
-- This migration adds the remaining four with ON CONFLICT (slug) DO NOTHING
-- so it is safe to run multiple times.
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, description, "order", "isActive") VALUES
  ('Electronics',   'electronics', 'Consumer electronics, gadgets and devices',  5,  TRUE),
  ('Fashion',       'fashion',     'Clothing, shoes and accessories for all',     17, TRUE),
  ('Tools',         'tools',       'Hand tools, power tools and hardware',        18, TRUE),
  ('Vehicles',      'vehicles',    'Cars, motorcycles and vehicle accessories',   19, TRUE)
ON CONFLICT (slug) DO NOTHING;
