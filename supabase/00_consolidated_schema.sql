-- ================================================================
-- 00_consolidated_schema.sql
-- Loadify Market — COMPLETE DATABASE SCHEMA FOR SUPABASE
-- ================================================================
-- Single-file version. Run in Supabase SQL Editor to bootstrap.
--
-- Owner email: loadifymarket.co.uk@gmail.com
--
-- NAMING CONVENTION:
--   • Most tables: camelCase quoted identifiers matching the
--     React/TypeScript frontend (e.g. "sellerId", "createdAt").
--   • EXCEPTION: shipments & shipment_events use snake_case
--     because they are written by Netlify serverless functions.
--
-- EXECUTION ORDER:
--   1. Extensions + helper functions
--   2. Users & profiles
--   3. Categories & products
--   4. Cart, orders & payments
--   5. Reviews, Q&A, returns, disputes & messaging
--   6. Logistics, transport & RFQ
--   7. Admin, moderation & support
--   8. Notifications, wishlists & saved searches
--   9. Promotions & featured listings
--  10. RLS
-- ================================================================

-- ──────────────────────────────────────────────────────────────
-- SECTION 1: EXTENSIONS + HELPERS
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- camelCase tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- snake_case tables (shipments, shipment_events)
CREATE OR REPLACE FUNCTION update_updated_at_column_snake()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- JWT-first: checks app_metadata.role (set by migration 340 trigger) then
-- falls back to public.users query.  LANGUAGE sql avoids PL/pgSQL BEGIN/END
-- which can be misparsed by the Supabase SQL editor's dollar-quote scanner.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'admin'
        AND "isActive" = TRUE
    )
  );
$$;

-- Backward-compat alias: is_owner() was the old name; removed from role model.
-- Any policy still calling is_owner() will correctly defer to is_admin().
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'seller'
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'seller'
        AND "isActive" = TRUE
    )
  );
$$;

-- Checks whether the calling user owns a product.
-- SECURITY DEFINER so that it bypasses the products RLS policy when
-- called from product_shipping policies, preventing recursive RLS
-- evaluation ("infinite recursion detected in policy for relation products").
CREATE OR REPLACE FUNCTION owns_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.products
    WHERE  id         = p_product_id
      AND  "sellerId" = (SELECT auth.uid())
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- SECTION 2: USERS & PROFILES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        UNIQUE NOT NULL,
  role              TEXT        NOT NULL DEFAULT 'buyer'
                      CHECK (role IN ('buyer','seller','admin')),
  "marketplaceRole" TEXT        CHECK ("marketplaceRole" IN ('carrier','broker','seller')),
  "firstName"       TEXT,
  "lastName"        TEXT,
  phone             TEXT,
  "avatarUrl"       TEXT,
  "isEmailVerified" BOOLEAN     NOT NULL DEFAULT FALSE,
  "isActive"        BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users ("isActive");
CREATE TRIGGER trg_users_updatedAt BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS buyer_profiles (
  "userId"          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "shippingAddress" JSONB,
  "billingAddress"  JSONB,
  preferences       JSONB,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_buyer_profiles_updatedAt BEFORE UPDATE ON buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS seller_profiles (
  "userId"                    UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "fullName"                  TEXT,
  "storeName"                 TEXT,
  phone                       TEXT,
  country                     TEXT,
  "businessName"              TEXT,
  "vatNumber"                 TEXT,
  "companyRegistrationNumber" TEXT,
  "businessAddress"           JSONB,
  "verificationStatus"        TEXT         NOT NULL DEFAULT 'pending'
                                CHECK ("verificationStatus" IN ('pending','verified','rejected','suspended')),
  "verifiedAt"                TIMESTAMPTZ,
  "suspensionReason"          TEXT,
  "stripeAccountId"           TEXT,
  "payoutDetails"             JSONB,
  "isApproved"                BOOLEAN      NOT NULL DEFAULT FALSE,
  commission                  DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  "listingLimit"              INTEGER      DEFAULT 5,
  rating                      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "totalSales"                INTEGER      NOT NULL DEFAULT 0,
  "salesCount"                INTEGER      NOT NULL DEFAULT 0,
  "disputeRate"               DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  "deliverySuccessRate"       DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
  "responseTimeHours"         DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  "onTimeShipmentRate"        DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  "marketplaceRole"           TEXT         CHECK ("marketplaceRole" IN ('carrier','broker','seller')),
  "paymentBehaviour"          TEXT         CHECK ("paymentBehaviour" IN ('pays_on_time','sometimes_late','repeated_delays')),
  "isVerified"                BOOLEAN      NOT NULL DEFAULT FALSE,
  "profileCompleteness"       INTEGER      NOT NULL DEFAULT 0,
  "contactPhone"              TEXT,
  "stripeConnectStatus"       TEXT         CHECK ("stripeConnectStatus" IN ('pending', 'restricted', 'active')),
  "sellerStatus"              TEXT         NOT NULL DEFAULT 'draft'
                                CHECK ("sellerStatus" IN ('draft', 'submitted', 'active', 'suspended')),
  "activatedAt"               TIMESTAMPTZ,
  "isPaused"                  BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdAt"                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_approved     ON seller_profiles ("isApproved");
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification ON seller_profiles ("verificationStatus");
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status       ON seller_profiles ("sellerStatus");
CREATE TRIGGER trg_seller_profiles_updatedAt BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION sync_seller_approval_from_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."sellerStatus" = 'active' THEN
    NEW."isApproved" = TRUE;
    IF NEW."activatedAt" IS NULL THEN
      NEW."activatedAt" = NOW();
    END IF;
  ELSIF NEW."sellerStatus" IN ('draft', 'submitted', 'suspended') THEN
    NEW."isApproved" = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seller_status_sync ON seller_profiles;
CREATE TRIGGER trg_seller_status_sync
  BEFORE UPDATE OF "sellerStatus" ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_seller_approval_from_status();

CREATE TABLE IF NOT EXISTS seller_stores (
  "userId"           UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "storeName"        TEXT,
  "storeSlug"        TEXT        UNIQUE,
  "storeLogo"        TEXT,
  "storeDescription" TEXT,
  "storeBanner"      TEXT,
  "socialLinks"      JSONB,
  "returnPolicy"     TEXT,
  "shippingPolicy"   TEXT,
  "isActive"         BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_stores_slug   ON seller_stores ("storeSlug");
CREATE INDEX IF NOT EXISTS idx_seller_stores_active ON seller_stores ("isActive");
CREATE TRIGGER trg_seller_stores_updatedAt BEFORE UPDATE ON seller_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS seller_verifications (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId"        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "docType"         TEXT        NOT NULL
                      CHECK ("docType" IN ('identity','business_registration','vat_certificate','proof_of_address','other')),
  "fileUrl"         TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
  "reviewedBy"      UUID        REFERENCES users(id) ON DELETE SET NULL,
  "reviewedAt"      TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "uploadedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller ON seller_verifications ("sellerId");
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON seller_verifications (status);
CREATE TRIGGER trg_seller_verifications_updatedAt BEFORE UPDATE ON seller_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'buyer' THEN
    INSERT INTO buyer_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO seller_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO seller_stores ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_user_profile
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

CREATE OR REPLACE FUNCTION handle_seller_verification_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."verificationStatus" = 'verified' AND OLD."verificationStatus" != 'verified' THEN
    NEW."isVerified"   = TRUE;
    NEW."listingLimit" = NULL;
    NEW."verifiedAt"   = NOW();
  END IF;
  IF NEW."verificationStatus" = 'suspended' AND OLD."verificationStatus" != 'suspended' THEN
    NEW."isVerified" = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seller_verification_upgrade
  BEFORE UPDATE OF "verificationStatus" ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_seller_verification_upgrade();

-- ──────────────────────────────────────────────────────────────
-- SECTION 3: CATEGORIES & PRODUCTS
-- ──────────────────────────────────────────────────────────────

-- CREATE creates the table on a fresh install.
-- ALTER TABLE adds missing columns when upgrading from old schema.
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
  ON products USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE TRIGGER trg_products_updatedAt BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FK: products.sellerId → seller_profiles(userId) — enables PostgREST auto-join
ALTER TABLE products
  ADD CONSTRAINT fk_products_seller_profile
  FOREIGN KEY ("sellerId") REFERENCES seller_profiles("userId") ON DELETE CASCADE;

-- FK: products.sellerId → seller_stores(userId) — enables PostgREST auto-join
ALTER TABLE products
  ADD CONSTRAINT fk_products_seller_store
  FOREIGN KEY ("sellerId") REFERENCES seller_stores("userId") ON DELETE CASCADE;

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

CREATE OR REPLACE FUNCTION track_product_view(
  p_product_id UUID,
  p_user_id    UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET views = COALESCE(views, 0) + 1, "lastViewedAt" = NOW()
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

-- ──────────────────────────────────────────────────────────────
-- SECTION 4: CART, ORDERS & PAYMENTS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"    UUID        REFERENCES users(id) ON DELETE CASCADE,
  "sessionId" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId"),
  UNIQUE ("sessionId")
);
CREATE INDEX IF NOT EXISTS idx_carts_user    ON carts ("userId");
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts ("sessionId");
CREATE TRIGGER trg_carts_updatedAt BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "cartId"    UUID         NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  "productId" UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "sellerId"  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity    INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("cartId", "productId")
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart    ON cart_items ("cartId");
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items ("productId");
CREATE TRIGGER trg_cart_items_updatedAt BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 100001 INCREMENT 1;

CREATE TABLE IF NOT EXISTS orders (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderNumber"     TEXT         UNIQUE NOT NULL
                      DEFAULT ('LM-' || LPAD(nextval('order_number_seq')::TEXT, 7, '0')),
  "buyerId"         UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "sellerId"        UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "productId"       UUID         NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity          INTEGER      NOT NULL DEFAULT 1,
  subtotal          DECIMAL(12,2) NOT NULL,
  "vatAmount"       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  "shippingAmount"  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  "discountAmount"  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total             DECIMAL(12,2) NOT NULL,
  commission        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  "couponCode"      TEXT,
  status            TEXT         NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','packed','shipped','delivered','cancelled','refunded')),
  "shippingAddress" JSONB        NOT NULL DEFAULT '{}',
  "billingAddress"  JSONB        NOT NULL DEFAULT '{}',
  "deliveryMethod"  TEXT         NOT NULL DEFAULT 'delivery'
                      CHECK ("deliveryMethod" IN ('pickup','delivery')),
  "shippingMethod"  TEXT,
  "trackingNumber"  TEXT,
  "deliveredAt"     TIMESTAMPTZ,
  "invoiceUrl"      TEXT,
  "proofOfDelivery" JSONB,
  "escrowStatus"    TEXT         NOT NULL DEFAULT 'held'
                      CHECK ("escrowStatus" IN ('held','released','refunded','partial_refund')),
  "escrowReleasedAt" TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer        ON orders ("buyerId");
CREATE INDEX IF NOT EXISTS idx_orders_seller       ON orders ("sellerId");
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders ("orderNumber");
CREATE INDEX IF NOT EXISTS idx_orders_created      ON orders ("createdAt" DESC);
CREATE TRIGGER trg_orders_updatedAt BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS order_items (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId"      UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId"    UUID         NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity       INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  "pricePerUnit" DECIMAL(12,2) NOT NULL,
  "vatRate"      DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  subtotal       DECIMAL(12,2) NOT NULL,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items ("orderId");
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items ("productId");

CREATE TABLE IF NOT EXISTS payment_sessions (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"              UUID         REFERENCES users(id) ON DELETE SET NULL,
  "orderId"             UUID         REFERENCES orders(id) ON DELETE SET NULL,
  "stripeSessionId"     TEXT         UNIQUE NOT NULL,
  amount                DECIMAL(12,2) NOT NULL,
  currency              TEXT         NOT NULL DEFAULT 'GBP',
  status                TEXT         NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  "paymentMethod"       TEXT,
  "stripePaymentIntent" TEXT,
  metadata              JSONB,
  "createdAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user   ON payment_sessions ("userId");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_order  ON payment_sessions ("orderId");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_stripe ON payment_sessions ("stripeSessionId");
CREATE TRIGGER trg_payment_sessions_updatedAt BEFORE UPDATE ON payment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS payouts (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId"         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "orderId"          UUID         REFERENCES orders(id) ON DELETE SET NULL,
  amount             DECIMAL(12,2) NOT NULL,
  currency           TEXT         NOT NULL DEFAULT 'GBP',
  status             TEXT         NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  "stripePayoutId"   TEXT,
  "stripeTransferId" TEXT,
  reference          TEXT,
  notes              TEXT,
  "initiatedBy"      UUID         REFERENCES users(id) ON DELETE SET NULL,
  "paidAt"           TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payouts_seller ON payouts ("sellerId");
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts (status);
CREATE TRIGGER trg_payouts_updatedAt BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS coupons (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT         UNIQUE NOT NULL,
  "createdBy"         UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "sellerId"          UUID         REFERENCES users(id) ON DELETE CASCADE,
  "discountType"      TEXT         NOT NULL
                        CHECK ("discountType" IN ('percentage','fixed_amount','free_shipping')),
  "discountValue"     DECIMAL(10,2) NOT NULL,
  "minOrderAmount"    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "maxDiscountAmount" DECIMAL(10,2),
  "maxUses"           INTEGER,
  "maxUsesPerUser"    INTEGER      NOT NULL DEFAULT 1,
  "usedCount"         INTEGER      NOT NULL DEFAULT 0,
  "appliesTo"         TEXT         NOT NULL DEFAULT 'all'
                        CHECK ("appliesTo" IN ('all','specific_products','specific_categories','specific_sellers')),
  "productIds"        UUID[],
  "categoryIds"       UUID[],
  "isActive"          BOOLEAN      NOT NULL DEFAULT TRUE,
  "startsAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "expiresAt"         TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code   ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons ("isActive", "expiresAt");
CREATE TRIGGER trg_coupons_updatedAt BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS coupon_usage (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "couponId"  UUID         NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  "userId"    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "orderId"   UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount    DECIMAL(10,2) NOT NULL,
  "usedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("couponId", "orderId")
);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage ("couponId");
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user   ON coupon_usage ("userId");

-- ──────────────────────────────────────────────────────────────
-- SECTION 5: REVIEWS, Q&A, RETURNS, DISPUTES & MESSAGING
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"          UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "userId"             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "orderId"            UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating               INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  "sellerRating"       INTEGER      CHECK ("sellerRating" BETWEEN 1 AND 5),
  title                TEXT,
  comment              TEXT,
  images               TEXT[]       NOT NULL DEFAULT '{}',
  "videoUrl"           TEXT,
  "isVerifiedPurchase" BOOLEAN      NOT NULL DEFAULT FALSE,
  "sellerResponse"     JSONB,
  "sellerRespondedAt"  TIMESTAMPTZ,
  status               TEXT         NOT NULL DEFAULT 'published'
                         CHECK (status IN ('published','hidden','removed','flagged')),
  "isAbusive"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "adminNote"          TEXT,
  "helpfulCount"       INTEGER      NOT NULL DEFAULT 0,
  "helpfulVoters"      UUID[]       NOT NULL DEFAULT '{}',
  "createdAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("orderId", "userId")
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews ("productId");
CREATE INDEX IF NOT EXISTS idx_reviews_user    ON reviews ("userId");
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON reviews (status);
CREATE TRIGGER trg_reviews_updatedAt BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- Atomic stock decrement helper — called by the order webhook to
-- reduce stockQuantity and update stockStatus in one statement.
-- Using GREATEST prevents the quantity from going below zero.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET
    "stockQuantity" = GREATEST("stockQuantity" - p_qty, 0),
    "stockStatus"   = CASE
                        WHEN GREATEST("stockQuantity" - p_qty, 0) <= 0  THEN 'out_of_stock'
                        WHEN GREATEST("stockQuantity" - p_qty, 0) <= 10 THEN 'low_stock'
                        ELSE 'in_stock'
                      END,
    "updatedAt"     = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW."productId", OLD."productId");
  UPDATE products SET
    rating        = (SELECT COALESCE(AVG(rating), 0) FROM reviews
                     WHERE "productId" = v_pid AND status = 'published'),
    "reviewCount" = (SELECT COUNT(*) FROM reviews
                     WHERE "productId" = v_pid AND status = 'published'),
    "updatedAt"   = NOW()
  WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();

CREATE TABLE IF NOT EXISTS product_questions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "userId"         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "userName"       TEXT        NOT NULL,
  question         TEXT        NOT NULL CHECK (length(trim(question)) > 0),
  answer           TEXT        CHECK (answer IS NULL OR length(trim(answer)) > 0),
  "answerUserId"   UUID        REFERENCES users(id) ON DELETE SET NULL,
  "answerUserName" TEXT,
  upvotes          INTEGER     NOT NULL DEFAULT 0,
  "isAnswered"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "answeredAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_questions_product ON product_questions ("productId");
CREATE TRIGGER trg_product_questions_updatedAt BEFORE UPDATE ON product_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS product_offers (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "buyerId"        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId"       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "offerPrice"     DECIMAL(12,2) NOT NULL,
  quantity         INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  message          TEXT,
  status           TEXT         NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','rejected','countered','expired','withdrawn')),
  "counterPrice"   DECIMAL(12,2),
  "counterMessage" TEXT,
  "expiresAt"      TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_offers_product ON product_offers ("productId");
CREATE INDEX IF NOT EXISTS idx_product_offers_buyer   ON product_offers ("buyerId");
CREATE INDEX IF NOT EXISTS idx_product_offers_seller  ON product_offers ("sellerId");
CREATE TRIGGER trg_product_offers_updatedAt BEFORE UPDATE ON product_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS returns (
  id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId"              UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "buyerId"              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId"             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason                 TEXT         NOT NULL
                           CHECK (reason IN ('damaged','wrong_item','not_as_described','changed_mind','other')),
  description            TEXT         NOT NULL,
  images                 TEXT[]       NOT NULL DEFAULT '{}',
  status                 TEXT         NOT NULL DEFAULT 'requested'
                           CHECK (status IN ('requested','approved','rejected','completed','cancelled')),
  "refundAmount"         DECIMAL(12,2),
  "buyerTrackingNumber"  TEXT,
  "sellerTrackingNumber" TEXT,
  "resolvedBy"           UUID         REFERENCES users(id) ON DELETE SET NULL,
  "resolvedAt"           TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_returns_order  ON returns ("orderId");
CREATE INDEX IF NOT EXISTS idx_returns_buyer  ON returns ("buyerId");
CREATE INDEX IF NOT EXISTS idx_returns_seller ON returns ("sellerId");
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status);
CREATE TRIGGER trg_returns_updatedAt BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS disputes (
  id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId"                UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "buyerId"                UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId"               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject                  TEXT         NOT NULL,
  description              TEXT         NOT NULL,
  "protectionReason"       TEXT
                             CHECK ("protectionReason" IN (
                               'item_not_received','not_as_described','item_damaged',
                               'defective_product','seller_not_responding','other'
                             )),
  images                   TEXT[]       NOT NULL DEFAULT '{}',
  status                   TEXT         NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','in_review','resolved','closed')),
  resolution               TEXT,
  "resolutionType"         TEXT
                             CHECK ("resolutionType" IN (
                               'full_refund','partial_refund','replacement','rejected','withdrawn'
                             )),
  "refundAmount"           DECIMAL(12,2),
  "resolvedBy"             UUID         REFERENCES users(id) ON DELETE SET NULL,
  "sellerResponseDeadline" TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '48 hours'),
  "adminReviewDeadline"    TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '5 days'),
  "escrowStatus"           TEXT         NOT NULL DEFAULT 'held'
                             CHECK ("escrowStatus" IN ('held','released','refunded','partial_refund')),
  "buyerAbuseFlagged"      BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdAt"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disputes_order  ON disputes ("orderId");
CREATE INDEX IF NOT EXISTS idx_disputes_buyer  ON disputes ("buyerId");
CREATE INDEX IF NOT EXISTS idx_disputes_seller ON disputes ("sellerId");
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE TRIGGER trg_disputes_updatedAt BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- dispute_messages: CRITICAL — was missing from all schemas.
-- DisputesPage.tsx inserts/selects with camelCase keys.
CREATE TABLE IF NOT EXISTS dispute_messages (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "disputeId" UUID        NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  "userId"    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "userRole"  TEXT        CHECK ("userRole" IN ('buyer','seller','admin')),
  message     TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages ("disputeId");
CREATE INDEX IF NOT EXISTS idx_dispute_messages_user    ON dispute_messages ("userId");
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created ON dispute_messages ("createdAt" ASC);

CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user1Id"       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "user2Id"       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "productId"     UUID        REFERENCES products(id) ON DELETE SET NULL,
  "orderId"       UUID        REFERENCES orders(id) ON DELETE SET NULL,
  subject         TEXT,
  "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "isArchived"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("user1Id", "user2Id", "productId")
);
CREATE INDEX IF NOT EXISTS idx_conversations_user1    ON conversations ("user1Id");
CREATE INDEX IF NOT EXISTS idx_conversations_user2    ON conversations ("user2Id");
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations ("lastMessageAt" DESC);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversationId" UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  "senderId"       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "receiverId"     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "productId"      UUID        REFERENCES products(id) ON DELETE SET NULL,
  "orderId"        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  message          TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  "attachmentUrls" TEXT[]      NOT NULL DEFAULT '{}',
  "isRead"         BOOLEAN     NOT NULL DEFAULT FALSE,
  "readAt"         TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages ("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_sender       ON messages ("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver     ON messages ("receiverId");
CREATE INDEX IF NOT EXISTS idx_messages_unread       ON messages ("receiverId", "isRead") WHERE "isRead" = FALSE;
CREATE TRIGGER trg_messages_updatedAt BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET "lastMessageAt" = NEW."createdAt" WHERE id = NEW."conversationId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ──────────────────────────────────────────────────────────────
-- SECTION 6: LOGISTICS, TRANSPORT & RFQ
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS delivery_requests (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "listingId"           UUID        REFERENCES products(id) ON DELETE SET NULL,
  "listingTitle"        TEXT,
  "orderId"             UUID        REFERENCES orders(id) ON DELETE SET NULL,
  "sellerId"            UUID        REFERENCES users(id) ON DELETE SET NULL,
  "sellerName"          TEXT,
  "buyerId"             UUID        REFERENCES users(id) ON DELETE SET NULL,
  "buyerName"           TEXT        NOT NULL,
  "buyerEmail"          TEXT        NOT NULL,
  "pickupPostcode"      TEXT        NOT NULL,
  "dropoffPostcode"     TEXT        NOT NULL,
  "pickupAddress"       JSONB,
  "dropoffAddress"      JSONB,
  "palletCount"         INTEGER,
  "weightKg"            DECIMAL(10,2),
  "itemType"            TEXT,
  category              TEXT,
  quantity              INTEGER,
  "specialInstructions" TEXT,
  status                TEXT        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','submitted','in_review','quoted','accepted','in_transit','delivered','cancelled')),
  "xdriveRef"           TEXT,
  source                TEXT        NOT NULL DEFAULT 'loadify-market',
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_seller ON delivery_requests ("sellerId");
CREATE INDEX IF NOT EXISTS idx_delivery_requests_buyer  ON delivery_requests ("buyerId");
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests (status);
CREATE TRIGGER trg_delivery_requests_updatedAt BEFORE UPDATE ON delivery_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS transport_quotes (
  id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "deliveryRequestId"    UUID         NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  "carrierId"            UUID         REFERENCES users(id) ON DELETE SET NULL,
  "carrierName"          TEXT         NOT NULL DEFAULT 'XDrive Logistics',
  "quotedPrice"          DECIMAL(12,2) NOT NULL,
  currency               TEXT         NOT NULL DEFAULT 'GBP',
  "vatRate"              DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  "estimatedTransitDays" INTEGER,
  "vehicleType"          TEXT,
  "serviceLevel"         TEXT
                           CHECK ("serviceLevel" IN ('economy','standard','express','same_day')),
  notes                  TEXT,
  status                 TEXT         NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','accepted','rejected','expired','superseded')),
  "validUntil"           TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '7 days'),
  "acceptedAt"           TIMESTAMPTZ,
  "xdriveQuoteId"        TEXT,
  "createdAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_quotes_request ON transport_quotes ("deliveryRequestId");
CREATE INDEX IF NOT EXISTS idx_transport_quotes_status  ON transport_quotes (status);
CREATE TRIGGER trg_transport_quotes_updatedAt BEFORE UPDATE ON transport_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SHIPMENTS: snake_case — written by Netlify functions
-- (create-shipment.ts, update-shipment-status.ts, upload-proof-of-delivery.ts)
CREATE TABLE IF NOT EXISTS shipments (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_request_id     UUID        REFERENCES delivery_requests(id) ON DELETE SET NULL,
  seller_id               UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  buyer_id                UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  courier_name            TEXT,
  courier_service         TEXT,
  tracking_number         TEXT,
  tracking_url            TEXT,
  status                  TEXT        NOT NULL DEFAULT 'Pending'
                            CHECK (status IN (
                              'Pending','Processing','Dispatched','In Transit',
                              'Out for Delivery','Delivered','Returned','Delivery Failed'
                            )),
  proof_of_delivery_url   TEXT,
  proof_of_delivery_data  JSONB,
  estimated_delivery_date DATE,
  dispatched_at           TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  admin_notes             TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipments_order    ON shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller   ON shipments (seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer    ON shipments (buyer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments (tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status   ON shipments (status);
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_snake();

-- SHIPMENT_EVENTS: snake_case — written by update-shipment-status.ts
CREATE TABLE IF NOT EXISTS shipment_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL,
  location    TEXT,
  message     TEXT,
  changed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  source      TEXT        NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual','xdrive_webhook','system','courier_api')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_created  ON shipment_events (created_at DESC);

-- RFQ: form fields use snake_case (RFQPage.tsx inserts product_name, quantity etc.)
-- FK/meta fields use camelCase
CREATE TABLE IF NOT EXISTS rfq_requests (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "buyerId"           UUID        REFERENCES users(id) ON DELETE SET NULL,
  buyer_email         TEXT        NOT NULL,
  product_name        TEXT        NOT NULL,
  quantity            TEXT        NOT NULL,
  unit                TEXT,
  destination_country TEXT        NOT NULL,
  estimated_budget    TEXT        NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'GBP',
  message             TEXT,
  "categoryId"        UUID        REFERENCES categories(id) ON DELETE SET NULL,
  "attachmentUrls"    TEXT[]      NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','replied','closed','expired')),
  "expiresAt"         TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_buyer   ON rfq_requests ("buyerId");
CREATE INDEX IF NOT EXISTS idx_rfq_requests_status  ON rfq_requests (status);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_created ON rfq_requests ("createdAt" DESC);
CREATE TRIGGER trg_rfq_requests_updatedAt BEFORE UPDATE ON rfq_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS rfq_responses (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "rfqId"          UUID         NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  "sellerId"       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "quotedPrice"    DECIMAL(12,2) NOT NULL,
  currency         TEXT         NOT NULL DEFAULT 'GBP',
  "leadTimeDays"   INTEGER,
  message          TEXT         NOT NULL,
  "attachmentUrls" TEXT[]       NOT NULL DEFAULT '{}',
  status           TEXT         NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','accepted','rejected','withdrawn')),
  "acceptedAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("rfqId", "sellerId")
);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq    ON rfq_responses ("rfqId");
CREATE INDEX IF NOT EXISTS idx_rfq_responses_seller ON rfq_responses ("sellerId");
CREATE TRIGGER trg_rfq_responses_updatedAt BEFORE UPDATE ON rfq_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SECTION 7: ADMIN, MODERATION & SUPPORT
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reported_listings (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "reportedBy"  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT        NOT NULL
                  CHECK (reason IN ('fake','misleading','prohibited','counterfeit','wrong_category','spam','other')),
  description   TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  "reviewedBy"  UUID        REFERENCES users(id) ON DELETE SET NULL,
  "reviewNotes" TEXT,
  "resolvedAt"  TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reported_listings_product ON reported_listings ("productId");
CREATE INDEX IF NOT EXISTS idx_reported_listings_status  ON reported_listings (status);
CREATE TRIGGER trg_reported_listings_updatedAt BEFORE UPDATE ON reported_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS admin_actions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "adminId"    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "actionType" TEXT        NOT NULL
                 CHECK ("actionType" IN (
                   'approve_seller','reject_seller','suspend_seller',
                   'approve_product','reject_product','remove_product',
                   'resolve_dispute','resolve_return',
                   'suspend_user','unsuspend_user',
                   'approve_payout','reject_payout',
                   'feature_listing','unfeature_listing',
                   'dismiss_report','resolve_report',
                   'close_ticket','respond_ticket',
                   'update_settings','send_notification','other'
                 )),
  "targetType" TEXT        NOT NULL
                 CHECK ("targetType" IN (
                   'user','product','order','dispute','return',
                   'rfq','shipment','payout','ticket','setting','other'
                 )),
  "targetId"   UUID,
  notes        TEXT,
  metadata     JSONB,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin   ON admin_actions ("adminId");
CREATE INDEX IF NOT EXISTS idx_admin_actions_type    ON admin_actions ("actionType");
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "actorId"    UUID        REFERENCES users(id) ON DELETE SET NULL,
  "actorEmail" TEXT,
  action       TEXT        NOT NULL,
  "tableName"  TEXT,
  "recordId"   UUID,
  "oldData"    JSONB,
  "newData"    JSONB,
  "ipAddress"  INET,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs ("actorId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_table   ON audit_logs ("tableName");
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"         UUID        REFERENCES users(id) ON DELETE SET NULL,
  "guestEmail"     TEXT,
  "guestName"      TEXT,
  subject          TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'general'
                     CHECK (category IN (
                       'general','order','payment','returns','dispute',
                       'account','seller','product','delivery','other'
                     )),
  priority         TEXT        NOT NULL DEFAULT 'normal'
                     CHECK (priority IN ('low','normal','high','urgent')),
  "orderId"        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  "productId"      UUID        REFERENCES products(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  "assignedTo"     UUID        REFERENCES users(id) ON DELETE SET NULL,
  "resolvedAt"     TIMESTAMPTZ,
  "resolutionNote" TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user    ON support_tickets ("userId");
CREATE INDEX IF NOT EXISTS idx_support_tickets_status  ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets ("createdAt" DESC);
CREATE TRIGGER trg_support_tickets_updatedAt BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ticketId"       UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  "senderId"       UUID        REFERENCES users(id) ON DELETE SET NULL,
  "senderName"     TEXT        NOT NULL DEFAULT 'Unknown',
  "isStaff"        BOOLEAN     NOT NULL DEFAULT FALSE,
  message          TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  "attachmentUrls" TEXT[]      NOT NULL DEFAULT '{}',
  "isInternal"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket  ON support_ticket_messages ("ticketId");
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON support_ticket_messages ("createdAt" ASC);

CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  description TEXT,
  "updatedBy" UUID        REFERENCES users(id) ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate',         '7.0',                               'Default seller commission %'),
  ('vat_rate',                '0.20',                              'Default UK VAT rate'),
  ('free_listing_limit',      '5',                                 'Max listings for unverified sellers'),
  ('verified_listing_limit',  'null',                              'Unlimited for verified sellers'),
  ('escrow_release_days',     '7',                                 'Days after delivery before escrow releases'),
  ('dispute_seller_response', '48',                                'Hours seller has to respond to dispute'),
  ('dispute_admin_review',    '120',                               'Hours admin has to review dispute'),
  ('rfq_expiry_days',         '30',                                'Days before RFQ expires'),
  ('offer_expiry_hours',      '48',                                'Hours before offer expires'),
  ('maintenance_mode',        'false',                             'Maintenance mode toggle'),
  ('owner_email',             '"loadifymarket.co.uk@gmail.com"',   'Platform owner email')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- SECTION 8: NOTIFICATIONS, WISHLISTS & SAVED SEARCHES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL
                CHECK (type IN (
                  'order','payment','shipment','return','dispute','message','review',
                  'product_question','rfq','delivery','promotion','system','general',
                  'seller_approved','seller_rejected','product_approved','product_rejected',
                  'question_answered','offer_received','offer_accepted','offer_rejected',
                  'support_ticket'
                )),
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  link        TEXT,
  "isRead"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "readAt"    TIMESTAMPTZ,
  metadata    JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications ("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications ("userId","isRead") WHERE "isRead" = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS notification_settings (
  "userId"               UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "orderConfirmation"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "shippingUpdates"      BOOLEAN     NOT NULL DEFAULT TRUE,
  "deliveryConfirmation" BOOLEAN     NOT NULL DEFAULT TRUE,
  "promotionalEmails"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_notification_settings_updatedAt BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Denormalized array approach matching useWishlist.ts
CREATE TABLE IF NOT EXISTS wishlists (
  "userId"     UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "productIds" UUID[]      NOT NULL DEFAULT '{}',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_wishlists_updatedAt BEFORE UPDATE ON wishlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS saved_searches (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "searchQuery"           TEXT        NOT NULL,
  filters                 JSONB,
  "emailNotifications"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "notificationFrequency" TEXT        NOT NULL DEFAULT 'daily'
                            CHECK ("notificationFrequency" IN ('instant','daily','weekly')),
  "lastNotifiedAt"        TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches ("userId");
CREATE TRIGGER trg_saved_searches_updatedAt BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SECTION 9: PROMOTIONS & FEATURED LISTINGS
-- ──────────────────────────────────────────────────────────────

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
CREATE INDEX IF NOT EXISTS idx_featured_listings_active ON featured_listings ("isActive","startsAt");
CREATE TRIGGER trg_featured_listings_updatedAt BEFORE UPDATE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
CREATE INDEX IF NOT EXISTS idx_banners_active    ON banners ("isActive","sortOrder");
CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners (placement,"isActive");
CREATE TRIGGER trg_banners_updatedAt BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS promoted_listings (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "sellerId"       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "promotionType"  TEXT         NOT NULL DEFAULT 'standard'
                     CHECK ("promotionType" IN ('standard','premium','spotlight','category_top')),
  placement        TEXT         NOT NULL DEFAULT 'catalog'
                     CHECK (placement IN ('catalog','homepage','category','search','sidebar')),
  "dailyBudget"    DECIMAL(10,2),
  "totalSpend"     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "costPerClick"   DECIMAL(8,4),
  "startsAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "endsAt"         TIMESTAMPTZ,
  status           TEXT         NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','paused','completed','cancelled','rejected')),
  impressions      INTEGER      NOT NULL DEFAULT 0,
  clicks           INTEGER      NOT NULL DEFAULT 0,
  conversions      INTEGER      NOT NULL DEFAULT 0,
  "approvedBy"     UUID         REFERENCES users(id) ON DELETE SET NULL,
  "approvedAt"     TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promoted_listings_seller ON promoted_listings ("sellerId");
CREATE INDEX IF NOT EXISTS idx_promoted_listings_status ON promoted_listings (status);
CREATE TRIGGER trg_promoted_listings_updatedAt BEFORE UPDATE ON promoted_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SECTION 9b: STRIPE EVENTS (idempotent webhook processing)
-- ──────────────────────────────────────────────────────────────
-- Tracks every Stripe event that has been processed.
-- The UNIQUE constraint on event_id prevents duplicate processing
-- even if Stripe retries delivery of the same event.

CREATE TABLE IF NOT EXISTS stripe_events (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      TEXT         NOT NULL,
  event_type    TEXT         NOT NULL,
  livemode      BOOLEAN      NOT NULL DEFAULT FALSE,
  processed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status        TEXT         NOT NULL DEFAULT 'processed',  -- processed | failed | skipped
  error_message TEXT,
  metadata      JSONB,
  CONSTRAINT stripe_events_event_id_unique UNIQUE (event_id)
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id   ON stripe_events (event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events (event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed  ON stripe_events (processed_at DESC);

COMMENT ON TABLE stripe_events IS
  'Record of every Stripe webhook event processed. event_id is UNIQUE to prevent '
  'duplicate order creation if Stripe retries delivery.';

-- ──────────────────────────────────────────────────────────────
-- SECTION 9c: SELLER PROFILES PUBLIC VIEW
-- ──────────────────────────────────────────────────────────────
-- Safe public projection of seller_profiles — excludes sensitive fields
-- (commission, listingLimit, stripeAccountId, stripeConnectStatus, etc.)
-- Public pages read this view instead of the base table.

CREATE OR REPLACE VIEW seller_profiles_public AS
SELECT
  "userId",
  "businessName",
  "marketplaceRole",
  "isApproved",
  "verificationStatus",
  rating,
  "salesCount",
  "totalSales",
  "deliverySuccessRate",
  "paymentBehaviour",
  "businessAddress",
  "contactPhone",
  "createdAt"
FROM seller_profiles;

GRANT SELECT ON seller_profiles_public TO anon, authenticated;

COMMENT ON VIEW seller_profiles_public IS
  'Safe public projection of seller_profiles. PK is userId. '
  'Excludes commission, listingLimit, stripeAccountId, stripeConnectStatus, '
  'vatNumber, companyRegistrationNumber, disputeRate, and other sensitive fields.';

-- ──────────────────────────────────────────────────────────────
-- SECTION 10: ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed         ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_responses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists               ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoted_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events           ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "users_delete" ON users FOR DELETE USING (is_admin());
-- BUYER PROFILES
CREATE POLICY "buyer_profiles_all" ON buyer_profiles FOR ALL
  USING (auth.uid() = "userId" OR is_admin())
  WITH CHECK (auth.uid() = "userId" OR is_admin());
-- SELLER PROFILES
-- Full table access is restricted to the row owner or admin.
-- Public pages read seller_profiles_public (the safe view) via anon/authenticated.
CREATE POLICY "seller_profiles_select" ON seller_profiles FOR SELECT
  USING (auth.uid() = "userId" OR is_admin());
CREATE POLICY "seller_profiles_update" ON seller_profiles FOR UPDATE
  USING (auth.uid() = "userId" OR is_admin());
CREATE POLICY "seller_profiles_insert" ON seller_profiles FOR INSERT
  WITH CHECK (auth.uid() = "userId" OR is_admin());
CREATE POLICY "seller_profiles_delete" ON seller_profiles FOR DELETE USING (is_admin());
-- SELLER STORES
CREATE POLICY "seller_stores_select" ON seller_stores FOR SELECT
  USING ("isActive" = TRUE OR auth.uid() = "userId" OR is_admin());
CREATE POLICY "seller_stores_manage" ON seller_stores FOR ALL
  USING (auth.uid() = "userId" OR is_admin())
  WITH CHECK (auth.uid() = "userId" OR is_admin());
-- SELLER VERIFICATIONS
CREATE POLICY "seller_verifications_select" ON seller_verifications FOR SELECT
  USING (auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "seller_verifications_insert" ON seller_verifications FOR INSERT
  WITH CHECK (auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "seller_verifications_update" ON seller_verifications FOR UPDATE
  USING (is_admin());
-- CATEGORIES
CREATE POLICY "categories_select" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories_manage" ON categories FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
-- PRODUCTS
-- (SELECT auth.uid()) used instead of bare auth.uid() — evaluated once per query, not per row.
CREATE POLICY "products_select" ON products FOR SELECT
  USING (
    ("isActive" = TRUE AND "isApproved" = TRUE)
    OR (SELECT auth.uid()) = "sellerId"
    OR is_admin()
  );
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    AND is_seller()
  );
-- Explicit WITH CHECK mirrors USING so both old-row and new-row are validated.
CREATE POLICY "products_update" ON products FOR UPDATE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR is_admin()
  )
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    OR is_admin()
  );
CREATE POLICY "products_delete" ON products FOR DELETE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR is_admin()
  );
-- PRODUCT ANALYTICS
CREATE POLICY "product_analytics_all" ON product_analytics FOR ALL USING (TRUE) WITH CHECK (TRUE);
-- RECENTLY VIEWED
CREATE POLICY "recently_viewed_select" ON recently_viewed FOR SELECT
  USING (auth.uid() = "userId" OR "sessionId" IS NOT NULL);
CREATE POLICY "recently_viewed_insert" ON recently_viewed FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "recently_viewed_delete" ON recently_viewed FOR DELETE USING (auth.uid() = "userId");
-- FEATURED LISTINGS
CREATE POLICY "featured_listings_select" ON featured_listings FOR SELECT
  USING ("isActive" = TRUE OR is_admin());
CREATE POLICY "featured_listings_manage" ON featured_listings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
-- BANNERS
CREATE POLICY "banners_select" ON banners FOR SELECT USING ("isActive" = TRUE OR is_admin());
CREATE POLICY "banners_manage" ON banners FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
-- CARTS
CREATE POLICY "carts_own" ON carts FOR ALL
  USING (auth.uid() = "userId" OR is_admin())
  WITH CHECK (auth.uid() = "userId" OR is_admin());
-- CART ITEMS
CREATE POLICY "cart_items_own" ON cart_items FOR ALL
  USING (EXISTS(SELECT 1 FROM carts c WHERE c.id="cartId" AND c."userId"=auth.uid()) OR is_admin())
  WITH CHECK (EXISTS(SELECT 1 FROM carts c WHERE c.id="cartId" AND c."userId"=auth.uid()) OR is_admin());
-- ORDERS
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (auth.uid() = "buyerId" OR is_admin());
CREATE POLICY "orders_update" ON orders FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (is_admin());
-- ORDER ITEMS
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  USING (EXISTS(SELECT 1 FROM orders o WHERE o.id="orderId"
                AND(o."buyerId"=auth.uid() OR o."sellerId"=auth.uid())) OR is_admin());
-- Only the buyer/seller of the parent order (or admin/owner) may insert items.
-- The stripe-webhook uses the service role key which bypasses RLS.
CREATE POLICY "order_items_insert" ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id="orderId"
            AND (o."buyerId"=auth.uid() OR o."sellerId"=auth.uid()))
    OR is_admin()
  );
-- PAYMENT SESSIONS
CREATE POLICY "payment_sessions_select" ON payment_sessions FOR SELECT
  USING (auth.uid() = "userId" OR is_admin());
-- Write operations are handled by the service role (webhook) or admin only.
CREATE POLICY "payment_sessions_admin_write" ON payment_sessions FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
-- PAYOUTS
CREATE POLICY "payouts_seller_select" ON payouts FOR SELECT
  USING (auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "payouts_admin_manage" ON payouts FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
-- COUPONS
CREATE POLICY "coupons_select" ON coupons FOR SELECT
  USING ("isActive" = TRUE OR auth.uid() = "createdBy" OR is_admin());
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (is_seller());
CREATE POLICY "coupons_update" ON coupons FOR UPDATE
  USING (auth.uid() = "createdBy" OR is_admin());
CREATE POLICY "coupons_delete" ON coupons FOR DELETE
  USING (auth.uid() = "createdBy" OR is_admin());
-- COUPON USAGE
CREATE POLICY "coupon_usage_select" ON coupon_usage FOR SELECT
  USING (auth.uid() = "userId" OR is_admin());
CREATE POLICY "coupon_usage_insert" ON coupon_usage FOR INSERT WITH CHECK (TRUE);
-- REVIEWS
CREATE POLICY "reviews_select" ON reviews FOR SELECT
  USING (status = 'published' OR auth.uid() = "userId" OR is_admin());
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "reviews_update" ON reviews FOR UPDATE
  USING (auth.uid() = "userId"
    OR EXISTS(SELECT 1 FROM products p WHERE p.id="productId" AND p."sellerId"=auth.uid())
    OR is_admin());
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (is_admin());
-- PRODUCT QUESTIONS
CREATE POLICY "product_questions_select" ON product_questions FOR SELECT USING (TRUE);
CREATE POLICY "product_questions_insert" ON product_questions FOR INSERT
  WITH CHECK (auth.uid() = "userId");
CREATE POLICY "product_questions_update" ON product_questions FOR UPDATE
  USING (auth.uid() = "userId"
    OR EXISTS(SELECT 1 FROM products p WHERE p.id="productId" AND p."sellerId"=auth.uid())
    OR is_admin());
CREATE POLICY "product_questions_delete" ON product_questions FOR DELETE
  USING (auth.uid() = "userId" OR is_admin());
-- PRODUCT OFFERS
CREATE POLICY "product_offers_select" ON product_offers FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "product_offers_insert" ON product_offers FOR INSERT WITH CHECK (auth.uid() = "buyerId");
CREATE POLICY "product_offers_update" ON product_offers FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
-- RETURNS
CREATE POLICY "returns_select" ON returns FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "returns_insert" ON returns FOR INSERT WITH CHECK (auth.uid() = "buyerId");
CREATE POLICY "returns_update" ON returns FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
-- DISPUTES
CREATE POLICY "disputes_select" ON disputes FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "disputes_insert" ON disputes FOR INSERT WITH CHECK (auth.uid() = "buyerId");
CREATE POLICY "disputes_update" ON disputes FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
-- DISPUTE MESSAGES
CREATE POLICY "dispute_messages_select" ON dispute_messages FOR SELECT
  USING (EXISTS(SELECT 1 FROM disputes d WHERE d.id="disputeId"
                AND(d."buyerId"=auth.uid() OR d."sellerId"=auth.uid())) OR is_admin());
CREATE POLICY "dispute_messages_insert" ON dispute_messages FOR INSERT
  WITH CHECK (auth.uid() = "userId" AND (
    EXISTS(SELECT 1 FROM disputes d WHERE d.id="disputeId"
           AND(d."buyerId"=auth.uid() OR d."sellerId"=auth.uid()))
    OR is_admin()
  ));
-- CONVERSATIONS
CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (auth.uid() = "user1Id" OR auth.uid() = "user2Id" OR is_admin());
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = "user1Id" OR auth.uid() = "user2Id");
CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (auth.uid() = "user1Id" OR auth.uid() = "user2Id" OR is_admin());
-- MESSAGES
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (auth.uid() = "senderId" OR auth.uid() = "receiverId" OR is_admin());
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = "senderId");
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (auth.uid() = "receiverId" OR is_admin());
-- DELIVERY REQUESTS
CREATE POLICY "delivery_requests_select" ON delivery_requests FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "delivery_requests_insert" ON delivery_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "delivery_requests_update" ON delivery_requests FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin());
-- TRANSPORT QUOTES
CREATE POLICY "transport_quotes_select" ON transport_quotes FOR SELECT
  USING (EXISTS(SELECT 1 FROM delivery_requests dr WHERE dr.id="deliveryRequestId"
                AND(dr."buyerId"=auth.uid() OR dr."sellerId"=auth.uid()))
         OR auth.uid() = "carrierId" OR is_admin());
CREATE POLICY "transport_quotes_insert" ON transport_quotes FOR INSERT
  WITH CHECK (auth.uid() = "carrierId" OR is_admin());
CREATE POLICY "transport_quotes_update" ON transport_quotes FOR UPDATE
  USING (auth.uid() = "carrierId" OR is_admin());
-- SHIPMENTS (snake_case columns)
CREATE POLICY "shipments_select" ON shipments FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR is_admin());
CREATE POLICY "shipments_insert" ON shipments FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR is_admin());
CREATE POLICY "shipments_update" ON shipments FOR UPDATE
  USING (auth.uid() = seller_id OR is_admin());
-- SHIPMENT EVENTS (snake_case columns)
CREATE POLICY "shipment_events_select" ON shipment_events FOR SELECT
  USING (EXISTS(SELECT 1 FROM shipments s WHERE s.id=shipment_id
                AND(s.buyer_id=auth.uid() OR s.seller_id=auth.uid())) OR is_admin());
CREATE POLICY "shipment_events_insert" ON shipment_events FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM shipments s WHERE s.id=shipment_id AND s.seller_id=auth.uid())
              OR is_admin());
-- RFQ REQUESTS
CREATE POLICY "rfq_requests_insert" ON rfq_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "rfq_requests_select" ON rfq_requests FOR SELECT
  USING (auth.uid() = "buyerId" OR is_seller() OR is_admin());
CREATE POLICY "rfq_requests_update" ON rfq_requests FOR UPDATE
  USING (is_seller() OR is_admin());
-- RFQ RESPONSES
CREATE POLICY "rfq_responses_select" ON rfq_responses FOR SELECT
  USING (auth.uid() = "sellerId"
    OR EXISTS(SELECT 1 FROM rfq_requests r WHERE r.id="rfqId" AND r."buyerId"=auth.uid())
    OR is_admin());
CREATE POLICY "rfq_responses_insert" ON rfq_responses FOR INSERT
  WITH CHECK (auth.uid() = "sellerId" AND is_seller());
CREATE POLICY "rfq_responses_update" ON rfq_responses FOR UPDATE
  USING (auth.uid() = "sellerId" OR is_admin());
-- REPORTED LISTINGS
CREATE POLICY "reported_listings_select" ON reported_listings FOR SELECT
  USING (auth.uid() = "reportedBy" OR is_admin());
CREATE POLICY "reported_listings_insert" ON reported_listings FOR INSERT
  WITH CHECK (auth.uid() = "reportedBy");
CREATE POLICY "reported_listings_update" ON reported_listings FOR UPDATE
  USING (is_admin());
-- ADMIN ACTIONS
CREATE POLICY "admin_actions_select" ON admin_actions FOR SELECT USING (is_admin());
CREATE POLICY "admin_actions_insert" ON admin_actions FOR INSERT WITH CHECK (is_admin());
-- AUDIT LOGS
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (is_admin());
-- SUPPORT TICKETS
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT
  USING (auth.uid() = "userId" OR is_admin());
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "support_tickets_update" ON support_tickets FOR UPDATE
  USING (auth.uid() = "userId" OR is_admin());
-- SUPPORT TICKET MESSAGES
CREATE POLICY "ticket_messages_select" ON support_ticket_messages FOR SELECT
  USING (EXISTS(SELECT 1 FROM support_tickets t WHERE t.id="ticketId"
                AND(t."userId"=auth.uid() OR is_admin())));
CREATE POLICY "ticket_messages_insert" ON support_ticket_messages FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM support_tickets t WHERE t.id="ticketId"
                     AND(t."userId"=auth.uid() OR is_admin())));
-- PLATFORM SETTINGS
CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT USING (TRUE);
CREATE POLICY "platform_settings_manage" ON platform_settings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (auth.uid() = "userId" OR is_admin());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = "userId");
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  USING (auth.uid() = "userId" OR is_admin());
-- NOTIFICATION SETTINGS
CREATE POLICY "notification_settings_all" ON notification_settings FOR ALL
  USING (auth.uid() = "userId" OR is_admin())
  WITH CHECK (auth.uid() = "userId" OR is_admin());
-- WISHLISTS
CREATE POLICY "wishlists_all" ON wishlists FOR ALL
  USING (auth.uid() = "userId" OR is_admin())
  WITH CHECK (auth.uid() = "userId" OR is_admin());
-- SAVED SEARCHES
CREATE POLICY "saved_searches_all" ON saved_searches FOR ALL
  USING (auth.uid() = "userId" OR is_admin())
  WITH CHECK (auth.uid() = "userId" OR is_admin());
-- PROMOTED LISTINGS
CREATE POLICY "promoted_listings_select" ON promoted_listings FOR SELECT
  USING (status = 'active' OR auth.uid() = "sellerId" OR is_admin());
CREATE POLICY "promoted_listings_insert" ON promoted_listings FOR INSERT
  WITH CHECK (auth.uid() = "sellerId");
CREATE POLICY "promoted_listings_update" ON promoted_listings FOR UPDATE
  USING (auth.uid() = "sellerId" OR is_admin());
-- STRIPE EVENTS — service role (webhook) writes; admin reads
CREATE POLICY "stripe_events_admin_read"  ON stripe_events FOR SELECT USING (is_admin());
CREATE POLICY "stripe_events_admin_write" ON stripe_events FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────
-- SEED: CATEGORIES
-- ──────────────────────────────────────────────────────────────
INSERT INTO categories (id, name, slug, description, "order", "isActive") VALUES
  (uuid_generate_v4(), 'Mixed Job Lots',      'mixed-job-lots',     'Assorted mixed pallet lots',                1,  TRUE),
  (uuid_generate_v4(), 'Clothing',            'clothing',           'Men''s, women''s and children''s clothing', 2,  TRUE),
  (uuid_generate_v4(), 'Shoes',               'shoes',              'Footwear of all types',                     3,  TRUE),
  (uuid_generate_v4(), 'Jewellery',           'jewellery',          'Fashion and fine jewellery',                4,  TRUE),
  (uuid_generate_v4(), 'Media & Electronics', 'media-electronics',  'Consumer electronics and media',            5,  TRUE),
  (uuid_generate_v4(), 'Accessories',         'accessories',        'Fashion and lifestyle accessories',         6,  TRUE),
  (uuid_generate_v4(), 'Toys',                'toys',               'Children''s toys and games',                7,  TRUE),
  (uuid_generate_v4(), 'Health & Beauty',     'health-beauty',      'Personal care and health products',         8,  TRUE),
  (uuid_generate_v4(), 'Pets',                'pets',               'Pet food, supplies and accessories',        9,  TRUE),
  (uuid_generate_v4(), 'Memorabilia',         'memorabilia',        'Sports and entertainment memorabilia',      10, TRUE),
  (uuid_generate_v4(), 'Food & Drink',        'food-drink',         'Food, beverages and consumables',           11, TRUE),
  (uuid_generate_v4(), 'Office Supplies',     'office-supplies',    'Stationery and office equipment',           12, TRUE),
  (uuid_generate_v4(), 'Home & Garden',       'home-garden',        'Furniture, decor and garden',               13, TRUE),
  (uuid_generate_v4(), 'Wholesale Pallets',   'wholesale-pallets',  'Full and part pallets for resale',          14, TRUE),
  (uuid_generate_v4(), 'Logistics Jobs',      'logistics-jobs',     'Transport and haulage listings',            15, TRUE),
  (uuid_generate_v4(), 'Handmade',            'handmade',           'Handcrafted and artisan goods',             16, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- SHIPPING METHODS, RATES & PRODUCT SHIPPING
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_methods (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL UNIQUE,
  courier    TEXT,
  tracking   BOOLEAN     NOT NULL DEFAULT TRUE,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  method_id  UUID          NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
  price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency   TEXT          NOT NULL DEFAULT 'GBP',
  min_weight NUMERIC(10,2),
  max_weight NUMERIC(10,2),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_shipping (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID        NOT NULL REFERENCES products(id)         ON DELETE CASCADE,
  method_id     UUID        NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
  dispatch_time TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, method_id)
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_method_id    ON shipping_rates   (method_id);
CREATE INDEX IF NOT EXISTS idx_product_shipping_product_id ON product_shipping (product_id);
CREATE INDEX IF NOT EXISTS idx_product_shipping_method_id  ON product_shipping (method_id);

ALTER TABLE shipping_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_shipping  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_methods_public_read  ON shipping_methods;
CREATE POLICY shipping_methods_public_read  ON shipping_methods  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS shipping_rates_public_read    ON shipping_rates;
CREATE POLICY shipping_rates_public_read    ON shipping_rates    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS product_shipping_auth_read    ON product_shipping;
CREATE POLICY product_shipping_auth_read    ON product_shipping  FOR SELECT TO authenticated USING (TRUE);

-- owns_product() is SECURITY DEFINER so it checks ownership without re-entering
-- the products RLS evaluation stack (prevents infinite recursion on products).
DROP POLICY IF EXISTS product_shipping_auth_insert  ON product_shipping;
CREATE POLICY product_shipping_auth_insert
  ON product_shipping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owns_product(product_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS product_shipping_auth_update  ON product_shipping;
CREATE POLICY product_shipping_auth_update
  ON product_shipping
  FOR UPDATE
  TO authenticated
  USING (
    owns_product(product_id)
    OR is_admin()
  )
  WITH CHECK (
    owns_product(product_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS product_shipping_auth_delete  ON product_shipping;
CREATE POLICY product_shipping_auth_delete
  ON product_shipping
  FOR DELETE
  TO authenticated
  USING (
    owns_product(product_id)
    OR is_admin()
  );

-- Seed shipping methods
INSERT INTO shipping_methods (name, courier, tracking, active) VALUES
  ('Royal Mail Tracked 48', 'Royal Mail',       TRUE,  TRUE),
  ('Royal Mail Tracked 24', 'Royal Mail',       TRUE,  TRUE),
  ('Evri Standard Delivery','Evri',             TRUE,  TRUE),
  ('Collection in Person',  'Local Collection', FALSE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed shipping rates (idempotent)
INSERT INTO shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 3.99, 'GBP', 0, 2 FROM shipping_methods WHERE name = 'Royal Mail Tracked 48'
  AND NOT EXISTS (SELECT 1 FROM shipping_rates sr WHERE sr.method_id = shipping_methods.id);

INSERT INTO shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 4.99, 'GBP', 0, 2 FROM shipping_methods WHERE name = 'Royal Mail Tracked 24'
  AND NOT EXISTS (SELECT 1 FROM shipping_rates sr WHERE sr.method_id = shipping_methods.id);

INSERT INTO shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 2.99, 'GBP', 0, 2 FROM shipping_methods WHERE name = 'Evri Standard Delivery'
  AND NOT EXISTS (SELECT 1 FROM shipping_rates sr WHERE sr.method_id = shipping_methods.id);

INSERT INTO shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 0.00, 'GBP', NULL, NULL FROM shipping_methods WHERE name = 'Collection in Person'
  AND NOT EXISTS (SELECT 1 FROM shipping_rates sr WHERE sr.method_id = shipping_methods.id);

-- ──────────────────────────────────────────────────────────────
-- SECTION 11: OBJECT-LEVEL PERMISSIONS
--
-- Without these GRANTs, PostgreSQL rejects every API request with
-- "permission denied for table …" before RLS policies are evaluated.
-- The "authenticated" and "anon" roles are used by PostgREST for
-- logged-in and anonymous API requests respectively.
-- ──────────────────────────────────────────────────────────────

-- Authenticated users: full table access (RLS restricts rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anonymous users: read access everywhere (RLS hides private rows)
GRANT SELECT ON ALL TABLES    IN SCHEMA public TO anon;
GRANT USAGE  ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Signup: INSERT into users before email confirmation.
-- When email confirmation is required, the session is null right after
-- supabase.auth.signUp(), so the profile INSERT runs as the anon role.
-- The RLS policy "users_insert" (WITH CHECK (TRUE)) already permits
-- this row — the GRANT below provides the required object-level access.
-- NOTE: Registration now uses the server-side Admin API (register.ts)
-- which runs under the service role and bypasses this requirement.
-- This GRANT is retained for any future client-side anon-role flows.
GRANT INSERT ON public.users             TO anon;

-- Other public-facing write operations that do not require a session
GRANT INSERT ON public.recently_viewed   TO anon;
GRANT INSERT ON public.rfq_requests      TO anon;
GRANT INSERT ON public.delivery_requests TO anon;
GRANT INSERT ON public.coupon_usage      TO anon;
GRANT INSERT ON public.product_analytics TO anon;

-- ──────────────────────────────────────────────────────────────
-- ADMIN SETUP
-- The platform uses three roles: buyer, seller, admin.
-- To grant admin access to the platform owner, run:
--
--   UPDATE users SET role = 'admin'
--   WHERE email = 'loadifymarket.co.uk@gmail.com';
--
-- ──────────────────────────────────────────────────────────────
