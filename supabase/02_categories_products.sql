-- ============================================================
-- 02_categories_products.sql
-- Loadify Market — Categories, Products & Analytics
-- ============================================================
-- Covers: categories, products, product_analytics,
--         recently_viewed
-- ============================================================
-- Depends on: 01_users_profiles.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- CATEGORIES
-- Supports unlimited depth via parentId self-reference.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  description TEXT,
  parent_id   UUID        REFERENCES categories(id) ON DELETE SET NULL,
  image_url   TEXT,
  icon        TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug      ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent    ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active    ON categories (is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort      ON categories (sort_order);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- PRODUCTS
-- Central listing entity.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  description         TEXT        NOT NULL,
  -- Classification
  type                TEXT        NOT NULL DEFAULT 'product'
                        CHECK (type IN ('product','pallet','lot','clearance','retail','handmade','wholesale','logistics')),
  listing_type        TEXT        CHECK (listing_type IN ('pallet','wholesale','retail','handmade','logistics')),
  condition           TEXT        NOT NULL DEFAULT 'new'
                        CHECK (condition IN ('new','used','refurbished')),
  -- Category
  category_id         UUID        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id      UUID        REFERENCES categories(id) ON DELETE SET NULL,
  -- Pricing
  price               DECIMAL(12,2) NOT NULL,
  price_ex_vat        DECIMAL(12,2),
  vat_rate            DECIMAL(5,4) NOT NULL DEFAULT 0.2000,   -- 0.20 = 20 %
  -- Inventory
  stock_quantity      INTEGER     NOT NULL DEFAULT 0,
  stock_status        TEXT        NOT NULL DEFAULT 'in_stock'
                        CHECK (stock_status IN ('in_stock','low_stock','out_of_stock','clearance')),
  -- Media
  images              TEXT[]      NOT NULL DEFAULT '{}',
  -- Physical attributes
  weight              DECIMAL(10,2),        -- kg
  dimensions          JSONB,                -- {length, width, height}
  specifications      JSONB,
  -- Type-specific info
  pallet_info         JSONB,                -- {palletCount, itemsPerPallet, palletType}
  logistics_info      JSONB,                -- {pickupLocation, deliveryLocation, vehicleType, pickupDate}
  -- Handmade flags
  is_handmade         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_unique           BOOLEAN     NOT NULL DEFAULT FALSE,
  artist_name         TEXT,
  -- Status
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  is_approved         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured         BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Metrics (maintained by triggers)
  views               INTEGER     NOT NULL DEFAULT 0,
  add_to_cart_count   INTEGER     NOT NULL DEFAULT 0,
  rating              DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count        INTEGER     NOT NULL DEFAULT 0,
  last_viewed_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_seller      ON products (seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category    ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_type        ON products (type);
CREATE INDEX IF NOT EXISTS idx_products_listing_type ON products (listing_type);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products (is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_products_featured    ON products (is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_stock       ON products (stock_status);
CREATE INDEX IF NOT EXISTS idx_products_price       ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_rating      ON products (rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_trending    ON products (add_to_cart_count DESC, views DESC);
CREATE INDEX IF NOT EXISTS idx_products_created     ON products (created_at DESC);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- PRODUCT ANALYTICS
-- Daily aggregated stats per product.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_analytics (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date                DATE        NOT NULL DEFAULT CURRENT_DATE,
  views               INTEGER     NOT NULL DEFAULT 0,
  add_to_cart_count   INTEGER     NOT NULL DEFAULT 0,
  purchase_count      INTEGER     NOT NULL DEFAULT 0,
  unique_visitors     INTEGER     NOT NULL DEFAULT 0,
  revenue             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  UNIQUE (product_id, date)
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_date     ON product_analytics (date DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product  ON product_analytics (product_id);

-- ──────────────────────────────────────────────────────────────
-- RECENTLY VIEWED
-- Supports both authenticated users and anonymous sessions.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT,                 -- for guest users
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id),
  UNIQUE (session_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user     ON recently_viewed (user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_session  ON recently_viewed (session_id, viewed_at DESC);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: track product view (increments counts + recently_viewed)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION track_product_view(
  p_product_id UUID,
  p_user_id    UUID    DEFAULT NULL,
  p_session_id TEXT    DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Bump product-level counter
  UPDATE products
  SET views = COALESCE(views, 0) + 1, last_viewed_at = NOW()
  WHERE id = p_product_id;

  -- Recently viewed
  IF p_user_id IS NOT NULL THEN
    INSERT INTO recently_viewed (user_id, product_id, viewed_at)
    VALUES (p_user_id, p_product_id, NOW())
    ON CONFLICT (user_id, product_id) DO UPDATE SET viewed_at = NOW();
  ELSIF p_session_id IS NOT NULL THEN
    INSERT INTO recently_viewed (session_id, product_id, viewed_at)
    VALUES (p_session_id, p_product_id, NOW())
    ON CONFLICT (session_id, product_id) DO UPDATE SET viewed_at = NOW();
  END IF;

  -- Daily analytics
  INSERT INTO product_analytics (product_id, date, views, unique_visitors)
  VALUES (p_product_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (product_id, date) DO UPDATE SET
    views           = product_analytics.views + 1,
    unique_visitors = product_analytics.unique_visitors + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: track add-to-cart
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION track_add_to_cart(p_product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET add_to_cart_count = COALESCE(add_to_cart_count, 0) + 1
  WHERE id = p_product_id;

  INSERT INTO product_analytics (product_id, date, add_to_cart_count)
  VALUES (p_product_id, CURRENT_DATE, 1)
  ON CONFLICT (product_id, date) DO UPDATE SET
    add_to_cart_count = product_analytics.add_to_cart_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
