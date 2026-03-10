-- ============================================================
-- 09_promotions_featured.sql
-- Loadify Market — Promotions, Featured Listings & Coupons
-- ============================================================
-- Covers: featured_listings, promoted_listings,
--         coupons, coupon_usage
-- ============================================================
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql,
--             03_cart_orders_checkout.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- FEATURED LISTINGS
-- Admin-curated featured products shown on homepage / top of
-- catalog. No payment required; purely editorial.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS featured_listings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- Placement slot
  slot        TEXT        NOT NULL DEFAULT 'homepage'
                CHECK (slot IN ('homepage','catalog','category','sidebar','banner')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  -- Scheduling
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at     TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Attribution
  featured_by UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_featured_listings_product  ON featured_listings (product_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_slot     ON featured_listings (slot, is_active);
CREATE INDEX IF NOT EXISTS idx_featured_listings_active   ON featured_listings (is_active, starts_at, ends_at);

CREATE TRIGGER trg_featured_listings_updated_at
  BEFORE UPDATE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sync is_featured flag on products table
CREATE OR REPLACE FUNCTION sync_product_featured_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.is_active = TRUE THEN
    UPDATE products SET is_featured = TRUE, updated_at = NOW() WHERE id = NEW.product_id;
  ELSE
    -- Check if any active featured entry remains before clearing flag
    UPDATE products
    SET is_featured = EXISTS (
      SELECT 1 FROM featured_listings
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND is_active = TRUE
    ), updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_featured_sync_product_flag
  AFTER INSERT OR UPDATE OR DELETE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION sync_product_featured_flag();

-- ──────────────────────────────────────────────────────────────
-- PROMOTED LISTINGS
-- Paid promotion slots. Sellers pay to boost visibility.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promoted_listings (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Promotion type
  promotion_type      TEXT        NOT NULL DEFAULT 'standard'
                        CHECK (promotion_type IN ('standard','premium','spotlight','category_top')),
  -- Placement
  placement           TEXT        NOT NULL DEFAULT 'catalog'
                        CHECK (placement IN ('catalog','homepage','category','search','sidebar')),
  -- Financials
  daily_budget        DECIMAL(10,2),
  total_spend         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost_per_click      DECIMAL(8,4),
  -- Scheduling
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at             TIMESTAMPTZ,
  -- Status
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','paused','completed','cancelled','rejected')),
  -- Metrics
  impressions         INTEGER     NOT NULL DEFAULT 0,
  clicks              INTEGER     NOT NULL DEFAULT 0,
  conversions         INTEGER     NOT NULL DEFAULT 0,
  -- Admin
  approved_by         UUID        REFERENCES users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoted_listings_product  ON promoted_listings (product_id);
CREATE INDEX IF NOT EXISTS idx_promoted_listings_seller   ON promoted_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_promoted_listings_status   ON promoted_listings (status);
CREATE INDEX IF NOT EXISTS idx_promoted_listings_active   ON promoted_listings (status, starts_at, ends_at)
  WHERE status = 'active';

CREATE TRIGGER trg_promoted_listings_updated_at
  BEFORE UPDATE ON promoted_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- COUPONS / DISCOUNT CODES
-- Platform or seller-issued discount codes.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT        UNIQUE NOT NULL,
  -- Issuer
  created_by          UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id           UUID        REFERENCES users(id) ON DELETE CASCADE,
                                  -- NULL = platform-wide; set = seller-specific
  -- Discount
  discount_type       TEXT        NOT NULL
                        CHECK (discount_type IN ('percentage','fixed_amount','free_shipping')),
  discount_value      DECIMAL(10,2) NOT NULL,
  min_order_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_discount_amount DECIMAL(10,2),  -- cap for percentage discounts
  -- Usage limits
  max_uses            INTEGER,        -- NULL = unlimited
  max_uses_per_user   INTEGER         NOT NULL DEFAULT 1,
  used_count          INTEGER         NOT NULL DEFAULT 0,
  -- Applicability
  applies_to          TEXT        NOT NULL DEFAULT 'all'
                        CHECK (applies_to IN ('all','specific_products','specific_categories','specific_sellers')),
  product_ids         UUID[],
  category_ids        UUID[],
  -- Status / scheduling
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code     ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active   ON coupons (is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_seller   ON coupons (seller_id);

CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- COUPON USAGE
-- Records every redemption to enforce limits.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_usage (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id   UUID        NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount    DECIMAL(10,2) NOT NULL,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user   ON coupon_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order  ON coupon_usage (order_id);

-- Increment coupon used_count on redemption
CREATE OR REPLACE FUNCTION increment_coupon_used_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1, updated_at = NOW()
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coupon_usage_increment
  AFTER INSERT ON coupon_usage
  FOR EACH ROW EXECUTE FUNCTION increment_coupon_used_count();
