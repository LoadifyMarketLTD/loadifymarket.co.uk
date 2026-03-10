-- ================================================================
-- 02_categories_products.sql
-- Loadify Market — Categories & Products
-- ================================================================
-- Naming convention: camelCase quoted identifiers.
-- Depends on: 01_users_profiles.sql
-- ================================================================

-- ── CATEGORIES ──────────────────────────────────────────────────
-- CREATE creates the table on a fresh install.
-- The ALTER TABLE block below safely adds any columns that may be
-- missing when upgrading from an older snake_case schema.
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  description TEXT,
  "parentId"  UUID        REFERENCES categories(id) ON DELETE SET NULL,
  "imageUrl"  TEXT,
  icon        TEXT,
  "order"     INTEGER     NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MIGRATE EXISTING CATEGORIES TABLE ───────────────────────────
-- Safe to run even when upgrading from the old seeded schema.
-- Each statement is a no-op if the column already exists.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "parentId"  UUID        REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "imageUrl"  TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon        TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "order"     INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "isActive"  BOOLEAN     NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_categories_slug   ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories ("parentId");
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories ("isActive");
DROP TRIGGER IF EXISTS trg_categories_updatedAt ON categories; -- idempotent: recreate if already exists
CREATE TRIGGER trg_categories_updatedAt BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── PRODUCTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId"       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  description      TEXT         NOT NULL,
  type             TEXT         NOT NULL DEFAULT 'product'
                     CHECK (type IN ('product','pallet','lot','clearance','retail','handmade','wholesale','logistics')),
  "listingType"    TEXT         CHECK ("listingType" IN ('pallet','wholesale','retail','handmade','logistics')),
  condition        TEXT         NOT NULL DEFAULT 'new'
                     CHECK (condition IN ('new','used','refurbished')),
  "categoryId"     UUID         NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  "subcategoryId"  UUID         REFERENCES categories(id) ON DELETE SET NULL,
  price            DECIMAL(12,2) NOT NULL,
  "priceExVat"     DECIMAL(12,2),
  "vatRate"        DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  "stockQuantity"  INTEGER      NOT NULL DEFAULT 0,
  "stockStatus"    TEXT         NOT NULL DEFAULT 'in_stock'
                     CHECK ("stockStatus" IN ('in_stock','low_stock','out_of_stock','clearance')),
  images           TEXT[]       NOT NULL DEFAULT '{}',
  weight           DECIMAL(10,2),
  dimensions       JSONB,
  specifications   JSONB,
  "palletInfo"     JSONB,
  "logisticsInfo"  JSONB,
  "isHandmade"     BOOLEAN      NOT NULL DEFAULT FALSE,
  "isUnique"       BOOLEAN      NOT NULL DEFAULT FALSE,
  "artistName"     TEXT,
  "isActive"       BOOLEAN      NOT NULL DEFAULT TRUE,
  "isApproved"     BOOLEAN      NOT NULL DEFAULT FALSE,
  "isFeatured"     BOOLEAN      NOT NULL DEFAULT FALSE,
  views            INTEGER      NOT NULL DEFAULT 0,
  "addToCartCount" INTEGER      NOT NULL DEFAULT 0,
  rating           DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "reviewCount"    INTEGER      NOT NULL DEFAULT 0,
  "lastViewedAt"   TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_seller   ON products ("sellerId");
CREATE INDEX IF NOT EXISTS idx_products_category ON products ("categoryId");
CREATE INDEX IF NOT EXISTS idx_products_type     ON products (type);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products ("isActive", "isApproved");
CREATE INDEX IF NOT EXISTS idx_products_featured ON products ("isFeatured") WHERE "isFeatured" = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_stock    ON products ("stockStatus");
CREATE INDEX IF NOT EXISTS idx_products_price    ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_rating   ON products (rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_trending ON products ("addToCartCount" DESC, views DESC);
CREATE INDEX IF NOT EXISTS idx_products_created  ON products ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING gin(to_tsvector('english', title || ' ' || COALESCE(description,'')));
CREATE TRIGGER trg_products_updatedAt BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── PRODUCT ANALYTICS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_analytics (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date             DATE         NOT NULL DEFAULT CURRENT_DATE,
  views            INTEGER      NOT NULL DEFAULT 0,
  "addToCartCount" INTEGER      NOT NULL DEFAULT 0,
  "purchaseCount"  INTEGER      NOT NULL DEFAULT 0,
  "uniqueVisitors" INTEGER      NOT NULL DEFAULT 0,
  revenue          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  UNIQUE ("productId", date)
);
CREATE INDEX IF NOT EXISTS idx_product_analytics_date    ON product_analytics (date DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics ("productId");

-- ── RECENTLY VIEWED ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"    UUID        REFERENCES users(id) ON DELETE CASCADE,
  "sessionId" TEXT,
  "productId" UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "viewedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "productId"),
  UNIQUE ("sessionId", "productId")
);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user    ON recently_viewed ("userId", "viewedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_session ON recently_viewed ("sessionId", "viewedAt" DESC);

-- ── TRACK PRODUCT VIEW RPC ───────────────────────────────────────
CREATE OR REPLACE FUNCTION track_product_view(
  p_product_id UUID,
  p_user_id    UUID  DEFAULT NULL,
  p_session_id TEXT  DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET views = COALESCE(views,0) + 1, "lastViewedAt" = NOW()
  WHERE id = p_product_id;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO recently_viewed ("userId", "productId", "viewedAt")
    VALUES (p_user_id, p_product_id, NOW())
    ON CONFLICT ("userId", "productId") DO UPDATE SET "viewedAt" = NOW();
  ELSIF p_session_id IS NOT NULL THEN
    INSERT INTO recently_viewed ("sessionId", "productId", "viewedAt")
    VALUES (p_session_id, p_product_id, NOW())
    ON CONFLICT ("sessionId", "productId") DO UPDATE SET "viewedAt" = NOW();
  END IF;

  INSERT INTO product_analytics ("productId", date, views, "uniqueVisitors")
  VALUES (p_product_id, CURRENT_DATE, 1, 1)
  ON CONFLICT ("productId", date) DO UPDATE SET
    views            = product_analytics.views + 1,
    "uniqueVisitors" = product_analytics."uniqueVisitors" + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── FEATURED LISTINGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS featured_listings (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  slot         TEXT        NOT NULL DEFAULT 'homepage'
                 CHECK (slot IN ('homepage','catalog','category','sidebar','banner')),
  "sortOrder"  INTEGER     NOT NULL DEFAULT 0,
  "startsAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endsAt"     TIMESTAMPTZ,
  "isActive"   BOOLEAN     NOT NULL DEFAULT TRUE,
  "featuredBy" UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes        TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("productId", slot)
);
CREATE INDEX IF NOT EXISTS idx_featured_listings_active ON featured_listings ("isActive", "startsAt");
CREATE TRIGGER trg_featured_listings_updatedAt BEFORE UPDATE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── BANNERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL,
  subtitle    TEXT,
  "imageUrl"  TEXT        NOT NULL,
  "linkUrl"   TEXT,
  target      TEXT        NOT NULL DEFAULT '_self' CHECK (target IN ('_self','_blank')),
  placement   TEXT        NOT NULL DEFAULT 'homepage'
                CHECK (placement IN ('homepage','catalog','category','sidebar')),
  "sortOrder" INTEGER     NOT NULL DEFAULT 0,
  "startsAt"  TIMESTAMPTZ,
  "endsAt"    TIMESTAMPTZ,
  "isActive"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_active    ON banners ("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners (placement, "isActive");
CREATE TRIGGER trg_banners_updatedAt BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
