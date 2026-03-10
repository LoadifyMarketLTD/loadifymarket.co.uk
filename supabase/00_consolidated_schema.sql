-- ============================================================
-- 00_consolidated_schema.sql
-- Loadify Market — COMPLETE DATABASE SCHEMA FOR SUPABASE
-- ============================================================
-- Single-file version combining all migration files 01–10.
-- Run this in Supabase SQL Editor to bootstrap the entire
-- database from zero.
--
-- Owner email: loadifymarket.co.uk@gmail.com
-- Last updated: 2026-03-10
-- ============================================================
-- EXECUTION ORDER:
--   1. Extensions
--   2. Helper functions
--   3. Users & profiles
--   4. Categories & products
--   5. Cart, orders & payments
--   6. Reviews, returns & disputes
--   7. RFQ & messaging
--   8. Delivery, transport & shipments
--   9. Admin, moderation & support
--  10. Notifications, wishlists & saved searches
--  11. Promotions & featured listings
--  12. RLS policies
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- SECTION 1: EXTENSIONS
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- SECTION 2: SHARED HELPER FUNCTIONS
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- SECTION 3: USERS & PROFILES
-- ──────────────────────────────────────────────────────────────

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        UNIQUE NOT NULL,
  role                TEXT        NOT NULL DEFAULT 'buyer'
                        CHECK (role IN ('guest','buyer','seller','admin','owner')),
  marketplace_role    TEXT        CHECK (marketplace_role IN ('carrier','broker','seller')),
  first_name          TEXT,
  last_name           TEXT,
  phone               TEXT,
  avatar_url          TEXT,
  is_email_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BUYER PROFILES
CREATE TABLE IF NOT EXISTS buyer_profiles (
  user_id           UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  shipping_address  JSONB,
  billing_address   JSONB,
  preferences       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_buyer_profiles_updated_at BEFORE UPDATE ON buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SELLER PROFILES
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id                     UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name                   TEXT,
  store_name                  TEXT,
  phone                       TEXT,
  country                     TEXT,
  business_name               TEXT,
  vat_number                  TEXT,
  company_registration_number TEXT,
  business_address            JSONB,
  verification_status         TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (verification_status IN ('pending','verified','rejected','suspended')),
  verified_at                 TIMESTAMPTZ,
  suspension_reason           TEXT,
  stripe_account_id           TEXT,
  payout_details              JSONB,
  is_approved                 BOOLEAN     NOT NULL DEFAULT FALSE,
  commission                  DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  listing_limit               INTEGER     DEFAULT 5,
  rating                      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_sales                 INTEGER     NOT NULL DEFAULT 0,
  sales_count                 INTEGER     NOT NULL DEFAULT 0,
  dispute_rate                DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  delivery_success_rate       DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
  response_time_hours         DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  on_time_shipment_rate       DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  marketplace_role            TEXT        CHECK (marketplace_role IN ('carrier','broker','seller')),
  payment_behaviour           TEXT        CHECK (payment_behaviour IN ('pays_on_time','sometimes_late','repeated_delays')),
  is_verified                 BOOLEAN     NOT NULL DEFAULT FALSE,
  profile_completeness        INTEGER     NOT NULL DEFAULT 0,
  contact_phone               TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_approved    ON seller_profiles (is_approved);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification ON seller_profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_rating      ON seller_profiles (rating DESC);
CREATE TRIGGER trg_seller_profiles_updated_at BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SELLER STORES
CREATE TABLE IF NOT EXISTS seller_stores (
  user_id           UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  store_name        TEXT,
  store_slug        TEXT        UNIQUE,
  store_logo        TEXT,
  store_description TEXT,
  store_banner      TEXT,
  social_links      JSONB,
  return_policy     TEXT,
  shipping_policy   TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_stores_slug   ON seller_stores (store_slug);
CREATE INDEX IF NOT EXISTS idx_seller_stores_active ON seller_stores (is_active);
CREATE TRIGGER trg_seller_stores_updated_at BEFORE UPDATE ON seller_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SELLER VERIFICATIONS
CREATE TABLE IF NOT EXISTS seller_verifications (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type         TEXT        NOT NULL
                     CHECK (doc_type IN ('identity','business_registration','vat_certificate','proof_of_address','other')),
  file_url         TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  reviewed_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller ON seller_verifications (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON seller_verifications (status);
CREATE TRIGGER trg_seller_verifications_updated_at BEFORE UPDATE ON seller_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profiles on user insert
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('buyer','guest') THEN
    INSERT INTO buyer_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO seller_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO seller_stores (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_user_profile
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- Auto-upgrade listing limit when seller is verified
CREATE OR REPLACE FUNCTION handle_seller_verification_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
    NEW.is_verified   = TRUE;
    NEW.listing_limit = NULL;
    NEW.verified_at   = NOW();
  END IF;
  IF NEW.verification_status = 'suspended' AND OLD.verification_status != 'suspended' THEN
    NEW.is_verified = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seller_verification_upgrade
  BEFORE UPDATE OF verification_status ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_seller_verification_upgrade();

-- ──────────────────────────────────────────────────────────────
-- SECTION 4: CATEGORIES & PRODUCTS
-- ──────────────────────────────────────────────────────────────

-- CATEGORIES
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
CREATE INDEX IF NOT EXISTS idx_categories_slug   ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories (is_active);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  type              TEXT        NOT NULL DEFAULT 'product'
                      CHECK (type IN ('product','pallet','lot','clearance','retail','handmade','wholesale','logistics')),
  listing_type      TEXT        CHECK (listing_type IN ('pallet','wholesale','retail','handmade','logistics')),
  condition         TEXT        NOT NULL DEFAULT 'new'
                      CHECK (condition IN ('new','used','refurbished')),
  category_id       UUID        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id    UUID        REFERENCES categories(id) ON DELETE SET NULL,
  price             DECIMAL(12,2) NOT NULL,
  price_ex_vat      DECIMAL(12,2),
  vat_rate          DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  stock_quantity    INTEGER     NOT NULL DEFAULT 0,
  stock_status      TEXT        NOT NULL DEFAULT 'in_stock'
                      CHECK (stock_status IN ('in_stock','low_stock','out_of_stock','clearance')),
  images            TEXT[]      NOT NULL DEFAULT '{}',
  weight            DECIMAL(10,2),
  dimensions        JSONB,
  specifications    JSONB,
  pallet_info       JSONB,
  logistics_info    JSONB,
  is_handmade       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_unique         BOOLEAN     NOT NULL DEFAULT FALSE,
  artist_name       TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_approved       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  views             INTEGER     NOT NULL DEFAULT 0,
  add_to_cart_count INTEGER     NOT NULL DEFAULT 0,
  rating            DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count      INTEGER     NOT NULL DEFAULT 0,
  last_viewed_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_seller      ON products (seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category    ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_type        ON products (type);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products (is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_products_featured    ON products (is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_stock       ON products (stock_status);
CREATE INDEX IF NOT EXISTS idx_products_price       ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_rating      ON products (rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_trending    ON products (add_to_cart_count DESC, views DESC);
CREATE INDEX IF NOT EXISTS idx_products_created     ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING gin(to_tsvector('english', title || ' ' || COALESCE(description,'')));
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PRODUCT ANALYTICS
CREATE TABLE IF NOT EXISTS product_analytics (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  views             INTEGER     NOT NULL DEFAULT 0,
  add_to_cart_count INTEGER     NOT NULL DEFAULT 0,
  purchase_count    INTEGER     NOT NULL DEFAULT 0,
  unique_visitors   INTEGER     NOT NULL DEFAULT 0,
  revenue           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  UNIQUE (product_id, date)
);
CREATE INDEX IF NOT EXISTS idx_product_analytics_date    ON product_analytics (date DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics (product_id);

-- RECENTLY VIEWED
CREATE TABLE IF NOT EXISTS recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id),
  UNIQUE (session_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user    ON recently_viewed (user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_session ON recently_viewed (session_id, viewed_at DESC);

-- Track product view (called from app)
CREATE OR REPLACE FUNCTION track_product_view(
  p_product_id UUID,
  p_user_id    UUID  DEFAULT NULL,
  p_session_id TEXT  DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE products SET views = COALESCE(views,0)+1, last_viewed_at = NOW() WHERE id = p_product_id;
  IF p_user_id IS NOT NULL THEN
    INSERT INTO recently_viewed (user_id, product_id, viewed_at)
    VALUES (p_user_id, p_product_id, NOW())
    ON CONFLICT (user_id, product_id) DO UPDATE SET viewed_at = NOW();
  ELSIF p_session_id IS NOT NULL THEN
    INSERT INTO recently_viewed (session_id, product_id, viewed_at)
    VALUES (p_session_id, p_product_id, NOW())
    ON CONFLICT (session_id, product_id) DO UPDATE SET viewed_at = NOW();
  END IF;
  INSERT INTO product_analytics (product_id, date, views, unique_visitors)
  VALUES (p_product_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (product_id, date) DO UPDATE SET
    views = product_analytics.views+1, unique_visitors = product_analytics.unique_visitors+1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- SECTION 5: CART, ORDERS & PAYMENTS
-- ──────────────────────────────────────────────────────────────

-- CARTS
CREATE TABLE IF NOT EXISTS carts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id),
  UNIQUE (session_id)
);
CREATE INDEX IF NOT EXISTS idx_carts_user    ON carts (user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts (session_id);
CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CART ITEMS
CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id     UUID        NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  DECIMAL(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart    ON cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items (product_id);
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ORDERS
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 100001 INCREMENT 1;

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT        UNIQUE NOT NULL DEFAULT ('LM-' || LPAD(nextval('order_number_seq')::TEXT,7,'0')),
  buyer_id            UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id           UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_id          UUID        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity            INTEGER     NOT NULL DEFAULT 1,
  subtotal            DECIMAL(12,2) NOT NULL,
  vat_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  shipping_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total               DECIMAL(12,2) NOT NULL,
  commission          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  coupon_code         TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','packed','shipped','delivered','cancelled','refunded')),
  shipping_address    JSONB       NOT NULL,
  billing_address     JSONB       NOT NULL,
  delivery_method     TEXT        NOT NULL DEFAULT 'delivery'
                        CHECK (delivery_method IN ('pickup','delivery')),
  shipping_method     TEXT,
  tracking_number     TEXT,
  delivered_at        TIMESTAMPTZ,
  invoice_url         TEXT,
  proof_of_delivery   JSONB,
  escrow_status       TEXT        NOT NULL DEFAULT 'held'
                        CHECK (escrow_status IN ('held','released','refunded','partial_refund')),
  escrow_released_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer        ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller       ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created      ON orders (created_at DESC);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity       INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_per_unit DECIMAL(12,2) NOT NULL,
  vat_rate       DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  subtotal       DECIMAL(12,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

-- PAYMENT SESSIONS
CREATE TABLE IF NOT EXISTS payment_sessions (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID        REFERENCES users(id) ON DELETE SET NULL,
  order_id              UUID        REFERENCES orders(id) ON DELETE SET NULL,
  stripe_session_id     TEXT        UNIQUE NOT NULL,
  amount                DECIMAL(12,2) NOT NULL,
  currency              TEXT        NOT NULL DEFAULT 'GBP',
  status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  payment_method        TEXT,
  stripe_payment_intent TEXT,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user   ON payment_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_order  ON payment_sessions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_stripe ON payment_sessions (stripe_session_id);
CREATE TRIGGER trg_payment_sessions_updated_at BEFORE UPDATE ON payment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PAYOUTS
CREATE TABLE IF NOT EXISTS payouts (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id            UUID        REFERENCES orders(id) ON DELETE SET NULL,
  amount              DECIMAL(12,2) NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'GBP',
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  stripe_payout_id    TEXT,
  stripe_transfer_id  TEXT,
  reference           TEXT,
  notes               TEXT,
  initiated_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payouts_seller ON payouts (seller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts (status);
CREATE TRIGGER trg_payouts_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SECTION 6: REVIEWS, RETURNS & DISPUTES
-- ──────────────────────────────────────────────────────────────

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id            UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id              UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating                INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  seller_rating         INTEGER     CHECK (seller_rating BETWEEN 1 AND 5),
  title                 TEXT,
  comment               TEXT,
  images                TEXT[]      NOT NULL DEFAULT '{}',
  video_url             TEXT,
  is_verified_purchase  BOOLEAN     NOT NULL DEFAULT FALSE,
  seller_response_text  TEXT,
  seller_responded_at   TIMESTAMPTZ,
  status                TEXT        NOT NULL DEFAULT 'published'
                          CHECK (status IN ('published','hidden','removed','flagged')),
  is_abusive            BOOLEAN     NOT NULL DEFAULT FALSE,
  admin_note            TEXT,
  helpful_count         INTEGER     NOT NULL DEFAULT 0,
  helpful_voters        UUID[]      NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user    ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON reviews (status);
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-refresh product rating on review change
CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE products SET
    rating       = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id=v_pid AND status='published'),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id=v_pid AND status='published'),
    updated_at   = NOW()
  WHERE id = v_pid;
  RETURN COALESCE(NEW,OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_reviews_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();

-- PRODUCT QUESTIONS
CREATE TABLE IF NOT EXISTS product_questions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name         TEXT        NOT NULL,
  question          TEXT        NOT NULL CHECK (length(trim(question))>0),
  answer            TEXT        CHECK (answer IS NULL OR length(trim(answer))>0),
  answer_user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  answer_user_name  TEXT,
  upvotes           INTEGER     NOT NULL DEFAULT 0,
  is_answered       BOOLEAN     NOT NULL DEFAULT FALSE,
  answered_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_questions_product ON product_questions (product_id);
CREATE TRIGGER trg_product_questions_updated_at BEFORE UPDATE ON product_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PRODUCT OFFERS
CREATE TABLE IF NOT EXISTS product_offers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_price     DECIMAL(12,2) NOT NULL,
  quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity>0),
  message         TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected','countered','expired','withdrawn')),
  counter_price   DECIMAL(12,2),
  counter_message TEXT,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '48 hours'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_offers_product ON product_offers (product_id);
CREATE INDEX IF NOT EXISTS idx_product_offers_buyer   ON product_offers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_product_offers_seller  ON product_offers (seller_id);
CREATE TRIGGER trg_product_offers_updated_at BEFORE UPDATE ON product_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RETURNS
CREATE TABLE IF NOT EXISTS returns (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason                TEXT        NOT NULL
                          CHECK (reason IN ('damaged','wrong_item','not_as_described','changed_mind','other')),
  description           TEXT        NOT NULL,
  images                TEXT[]      NOT NULL DEFAULT '{}',
  status                TEXT        NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested','approved','rejected','completed','cancelled')),
  refund_amount         DECIMAL(12,2),
  buyer_tracking_number TEXT,
  seller_tracking_number TEXT,
  resolved_by           UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_returns_order  ON returns (order_id);
CREATE INDEX IF NOT EXISTS idx_returns_buyer  ON returns (buyer_id);
CREATE INDEX IF NOT EXISTS idx_returns_seller ON returns (seller_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status);
CREATE TRIGGER trg_returns_updated_at BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
  id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                 UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id                 UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject                  TEXT        NOT NULL,
  description              TEXT        NOT NULL,
  protection_reason        TEXT        CHECK (protection_reason IN (
                             'item_not_received','not_as_described','item_damaged',
                             'defective_product','seller_not_responding','other')),
  images                   TEXT[]      NOT NULL DEFAULT '{}',
  status                   TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','in_review','resolved','closed')),
  resolution               TEXT,
  resolution_type          TEXT        CHECK (resolution_type IN (
                             'full_refund','partial_refund','replacement','rejected','withdrawn')),
  refund_amount            DECIMAL(12,2),
  resolved_by              UUID        REFERENCES users(id) ON DELETE SET NULL,
  seller_response_deadline TIMESTAMPTZ DEFAULT (NOW()+INTERVAL '48 hours'),
  admin_review_deadline    TIMESTAMPTZ DEFAULT (NOW()+INTERVAL '5 days'),
  escrow_status            TEXT        NOT NULL DEFAULT 'held'
                             CHECK (escrow_status IN ('held','released','refunded','partial_refund')),
  buyer_abuse_flagged      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disputes_order   ON disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_buyer   ON disputes (buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_seller  ON disputes (seller_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status  ON disputes (status);
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SECTION 7: RFQ & MESSAGING
-- ──────────────────────────────────────────────────────────────

-- RFQ REQUESTS
CREATE TABLE IF NOT EXISTS rfq_requests (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id            UUID        REFERENCES users(id) ON DELETE SET NULL,
  buyer_email         TEXT        NOT NULL,
  product_name        TEXT        NOT NULL,
  quantity            TEXT        NOT NULL,
  unit                TEXT,
  destination_country TEXT        NOT NULL,
  estimated_budget    TEXT        NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'GBP',
  message             TEXT,
  category_id         UUID        REFERENCES categories(id) ON DELETE SET NULL,
  attachment_urls     TEXT[]      NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','replied','closed','expired')),
  expires_at          TIMESTAMPTZ DEFAULT (NOW()+INTERVAL '30 days'),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_buyer   ON rfq_requests (buyer_id);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_status  ON rfq_requests (status);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_created ON rfq_requests (created_at DESC);
CREATE TRIGGER trg_rfq_requests_updated_at BEFORE UPDATE ON rfq_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RFQ RESPONSES
CREATE TABLE IF NOT EXISTS rfq_responses (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id          UUID        NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  seller_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quoted_price    DECIMAL(12,2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'GBP',
  lead_time_days  INTEGER,
  message         TEXT        NOT NULL,
  attachment_urls TEXT[]      NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','accepted','rejected','withdrawn')),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rfq_id, seller_id)
);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq    ON rfq_responses (rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_seller ON rfq_responses (seller_id);
CREATE TRIGGER trg_rfq_responses_updated_at BEFORE UPDATE ON rfq_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      UUID        REFERENCES products(id) ON DELETE SET NULL,
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  subject         TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user1_id, user2_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_user1    ON conversations (user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2    ON conversations (user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations (last_message_at DESC);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      UUID        REFERENCES products(id) ON DELETE SET NULL,
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  message         TEXT        NOT NULL CHECK (length(trim(message))>0),
  attachment_urls TEXT[]      NOT NULL DEFAULT '{}',
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender       ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver     ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread       ON messages (receiver_id, is_read) WHERE is_read=FALSE;
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ──────────────────────────────────────────────────────────────
-- SECTION 8: DELIVERY, TRANSPORT & SHIPMENTS
-- ──────────────────────────────────────────────────────────────

-- DELIVERY REQUESTS
CREATE TABLE IF NOT EXISTS delivery_requests (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id          UUID        REFERENCES products(id) ON DELETE SET NULL,
  listing_title       TEXT,
  order_id            UUID        REFERENCES orders(id) ON DELETE SET NULL,
  seller_id           UUID        REFERENCES users(id) ON DELETE SET NULL,
  seller_name         TEXT,
  buyer_id            UUID        REFERENCES users(id) ON DELETE SET NULL,
  buyer_name          TEXT        NOT NULL,
  buyer_email         TEXT        NOT NULL,
  pickup_postcode     TEXT        NOT NULL,
  dropoff_postcode    TEXT        NOT NULL,
  pickup_address      JSONB,
  dropoff_address     JSONB,
  pallet_count        INTEGER,
  weight_kg           DECIMAL(10,2),
  item_type           TEXT,
  category            TEXT,
  quantity            INTEGER,
  special_instructions TEXT,
  status              TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','in_review','quoted','accepted','in_transit','delivered','cancelled')),
  xdrive_ref          TEXT,
  source              TEXT        NOT NULL DEFAULT 'loadify-market',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_seller  ON delivery_requests (seller_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_buyer   ON delivery_requests (buyer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status  ON delivery_requests (status);
CREATE TRIGGER trg_delivery_requests_updated_at BEFORE UPDATE ON delivery_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TRANSPORT QUOTES
CREATE TABLE IF NOT EXISTS transport_quotes (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_request_id     UUID        NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  carrier_id              UUID        REFERENCES users(id) ON DELETE SET NULL,
  carrier_name            TEXT        NOT NULL DEFAULT 'XDrive Logistics',
  quoted_price            DECIMAL(12,2) NOT NULL,
  currency                TEXT        NOT NULL DEFAULT 'GBP',
  vat_rate                DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  estimated_transit_days  INTEGER,
  vehicle_type            TEXT,
  service_level           TEXT        CHECK (service_level IN ('economy','standard','express','same_day')),
  notes                   TEXT,
  status                  TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','accepted','rejected','expired','superseded')),
  valid_until             TIMESTAMPTZ DEFAULT (NOW()+INTERVAL '7 days'),
  accepted_at             TIMESTAMPTZ,
  xdrive_quote_id         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_quotes_request ON transport_quotes (delivery_request_id);
CREATE INDEX IF NOT EXISTS idx_transport_quotes_status  ON transport_quotes (status);
CREATE TRIGGER trg_transport_quotes_updated_at BEFORE UPDATE ON transport_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SHIPMENTS
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
                            CHECK (status IN ('Pending','Processing','Dispatched','In Transit','Out for Delivery','Delivered','Returned','Delivery Failed')),
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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SHIPMENT EVENTS
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

CREATE OR REPLACE FUNCTION record_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shipment_events (shipment_id, status, message, source)
    VALUES (NEW.id, NEW.status, 'Status updated to '||NEW.status, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_shipments_record_status
  AFTER UPDATE OF status ON shipments FOR EACH ROW EXECUTE FUNCTION record_shipment_status_change();

CREATE OR REPLACE FUNCTION sync_order_status_from_shipment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Delivered' THEN
    UPDATE orders SET status='delivered', delivered_at=NOW(), updated_at=NOW()
    WHERE id=NEW.order_id AND status NOT IN ('delivered','cancelled','refunded');
  ELSIF NEW.status IN ('In Transit','Dispatched') THEN
    UPDATE orders SET status='shipped', updated_at=NOW()
    WHERE id=NEW.order_id AND status='packed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_shipments_sync_order
  AFTER UPDATE OF status ON shipments FOR EACH ROW EXECUTE FUNCTION sync_order_status_from_shipment();

-- ──────────────────────────────────────────────────────────────
-- SECTION 9: ADMIN, MODERATION & SUPPORT
-- ──────────────────────────────────────────────────────────────

-- REPORTED LISTINGS
CREATE TABLE IF NOT EXISTS reported_listings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reported_by UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT        NOT NULL
                CHECK (reason IN ('fake','misleading','prohibited','counterfeit','wrong_category','spam','other')),
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reported_listings_product ON reported_listings (product_id);
CREATE INDEX IF NOT EXISTS idx_reported_listings_status  ON reported_listings (status);
CREATE TRIGGER trg_reported_listings_updated_at BEFORE UPDATE ON reported_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ADMIN ACTIONS
CREATE TABLE IF NOT EXISTS admin_actions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action_type TEXT        NOT NULL
                CHECK (action_type IN (
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
  target_type TEXT        NOT NULL
                CHECK (target_type IN ('user','product','order','dispute','return','rfq','shipment','payout','ticket','setting','other')),
  target_id   UUID,
  notes       TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin   ON admin_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type    ON admin_actions (action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions (created_at DESC);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT        NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table   ON audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  guest_email     TEXT,
  guest_name      TEXT,
  subject         TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'general'
                    CHECK (category IN ('general','order','payment','returns','dispute','account','seller','product','delivery','other')),
  priority        TEXT        NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low','normal','high','urgent')),
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  product_id      UUID        REFERENCES products(id) ON DELETE SET NULL,
  status          TEXT        NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  assigned_to     UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user    ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status  ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets (created_at DESC);
CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SUPPORT TICKET MESSAGES
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id       UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
  sender_name     TEXT        NOT NULL DEFAULT 'Unknown',
  is_staff        BOOLEAN     NOT NULL DEFAULT FALSE,
  message         TEXT        NOT NULL CHECK (length(trim(message))>0),
  attachment_urls TEXT[]      NOT NULL DEFAULT '{}',
  is_internal     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket  ON support_ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON support_ticket_messages (created_at ASC);

-- BANNERS
CREATE TABLE IF NOT EXISTS banners (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL,
  subtitle    TEXT,
  image_url   TEXT        NOT NULL,
  link_url    TEXT,
  target      TEXT        NOT NULL DEFAULT '_self' CHECK (target IN ('_self','_blank')),
  placement   TEXT        NOT NULL DEFAULT 'homepage'
                CHECK (placement IN ('homepage','catalog','category','sidebar')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_active    ON banners (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners (placement, is_active);
CREATE TRIGGER trg_banners_updated_at BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate',         '7.0',          'Default seller commission percentage'),
  ('vat_rate',                '0.20',         'Default UK VAT rate'),
  ('free_listing_limit',      '5',            'Max listings for unverified sellers'),
  ('verified_listing_limit',  'null',         'Max listings for verified sellers'),
  ('escrow_release_days',     '7',            'Days after delivery before escrow auto-releases'),
  ('dispute_seller_response', '48',           'Hours seller has to respond to dispute'),
  ('dispute_admin_review',    '120',          'Hours admin has to review dispute'),
  ('rfq_expiry_days',         '30',           'Days before RFQ request expires'),
  ('offer_expiry_hours',      '48',           'Hours before a product offer expires'),
  ('maintenance_mode',        'false',        'Maintenance mode toggle'),
  ('owner_email',             '"loadifymarket.co.uk@gmail.com"', 'Platform owner email')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- SECTION 10: NOTIFICATIONS, WISHLISTS & SAVED SEARCHES
-- ──────────────────────────────────────────────────────────────

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL
                CHECK (type IN ('order','payment','shipment','return','dispute','message','review',
                  'product_question','rfq','delivery','promotion','system','general',
                  'seller_approved','seller_rejected','product_approved','product_rejected',
                  'question_answered','offer_received','offer_accepted','offer_rejected','support_ticket')),
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  link        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications (user_id, is_read) WHERE is_read=FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT,
  p_link TEXT DEFAULT NULL, p_meta JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_meta) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTIFICATION SETTINGS
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id                     UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_order_confirmation    BOOLEAN     NOT NULL DEFAULT TRUE,
  email_shipping_updates      BOOLEAN     NOT NULL DEFAULT TRUE,
  email_delivery_confirmation BOOLEAN     NOT NULL DEFAULT TRUE,
  email_returns_updates       BOOLEAN     NOT NULL DEFAULT TRUE,
  email_messages              BOOLEAN     NOT NULL DEFAULT TRUE,
  email_reviews               BOOLEAN     NOT NULL DEFAULT TRUE,
  email_rfq                   BOOLEAN     NOT NULL DEFAULT TRUE,
  email_promotions            BOOLEAN     NOT NULL DEFAULT FALSE,
  email_newsletter            BOOLEAN     NOT NULL DEFAULT FALSE,
  inapp_orders                BOOLEAN     NOT NULL DEFAULT TRUE,
  inapp_messages              BOOLEAN     NOT NULL DEFAULT TRUE,
  inapp_reviews               BOOLEAN     NOT NULL DEFAULT TRUE,
  inapp_promotions            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_notification_settings_updated_at BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- WISHLISTS
CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'My Wishlist',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_wishlists_updated_at BEFORE UPDATE ON wishlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- WISHLIST ITEMS
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID        NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wishlist_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items (wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product  ON wishlist_items (product_id);

-- SAVED SEARCHES
CREATE TABLE IF NOT EXISTS saved_searches (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_query           TEXT        NOT NULL,
  filters                JSONB,
  email_notifications    BOOLEAN     NOT NULL DEFAULT TRUE,
  notification_frequency TEXT        NOT NULL DEFAULT 'daily'
                           CHECK (notification_frequency IN ('instant','daily','weekly')),
  last_notified_at       TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches (user_id);
CREATE TRIGGER trg_saved_searches_updated_at BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SECTION 11: PROMOTIONS & FEATURED LISTINGS
-- ──────────────────────────────────────────────────────────────

-- FEATURED LISTINGS
CREATE TABLE IF NOT EXISTS featured_listings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  slot        TEXT        NOT NULL DEFAULT 'homepage'
                CHECK (slot IN ('homepage','catalog','category','sidebar','banner')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at     TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  featured_by UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_featured_listings_active ON featured_listings (is_active, starts_at);
CREATE TRIGGER trg_featured_listings_updated_at BEFORE UPDATE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PROMOTED LISTINGS
CREATE TABLE IF NOT EXISTS promoted_listings (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_type   TEXT        NOT NULL DEFAULT 'standard'
                     CHECK (promotion_type IN ('standard','premium','spotlight','category_top')),
  placement        TEXT        NOT NULL DEFAULT 'catalog'
                     CHECK (placement IN ('catalog','homepage','category','search','sidebar')),
  daily_budget     DECIMAL(10,2),
  total_spend      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost_per_click   DECIMAL(8,4),
  starts_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at          TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','paused','completed','cancelled','rejected')),
  impressions      INTEGER     NOT NULL DEFAULT 0,
  clicks           INTEGER     NOT NULL DEFAULT 0,
  conversions      INTEGER     NOT NULL DEFAULT 0,
  approved_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promoted_listings_seller ON promoted_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_promoted_listings_status ON promoted_listings (status);
CREATE TRIGGER trg_promoted_listings_updated_at BEFORE UPDATE ON promoted_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- COUPONS
CREATE TABLE IF NOT EXISTS coupons (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT        UNIQUE NOT NULL,
  created_by          UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id           UUID        REFERENCES users(id) ON DELETE CASCADE,
  discount_type       TEXT        NOT NULL CHECK (discount_type IN ('percentage','fixed_amount','free_shipping')),
  discount_value      DECIMAL(10,2) NOT NULL,
  min_order_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_discount_amount DECIMAL(10,2),
  max_uses            INTEGER,
  max_uses_per_user   INTEGER     NOT NULL DEFAULT 1,
  used_count          INTEGER     NOT NULL DEFAULT 0,
  applies_to          TEXT        NOT NULL DEFAULT 'all'
                        CHECK (applies_to IN ('all','specific_products','specific_categories','specific_sellers')),
  product_ids         UUID[],
  category_ids        UUID[],
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code   ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, expires_at);
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- COUPON USAGE
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

-- ──────────────────────────────────────────────────────────────
-- SECTION 12: ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role IN ('admin','owner') AND is_active=TRUE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role='owner' AND is_active=TRUE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role IN ('seller','admin','owner') AND is_active=TRUE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed         ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_responses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoted_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage            ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "users_select"   ON users FOR SELECT USING (auth.uid()=id OR is_admin_or_owner());
CREATE POLICY "users_update"   ON users FOR UPDATE USING (auth.uid()=id OR is_admin_or_owner());
CREATE POLICY "users_insert"   ON users FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "users_delete"   ON users FOR DELETE USING (is_admin_or_owner());
-- BUYER PROFILES
CREATE POLICY "buyer_profiles_all" ON buyer_profiles FOR ALL
  USING (auth.uid()=user_id OR is_admin_or_owner()) WITH CHECK (auth.uid()=user_id OR is_admin_or_owner());
-- SELLER PROFILES
CREATE POLICY "seller_profiles_select" ON seller_profiles FOR SELECT USING (TRUE);
CREATE POLICY "seller_profiles_update" ON seller_profiles FOR UPDATE USING (auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "seller_profiles_insert" ON seller_profiles FOR INSERT WITH CHECK (auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "seller_profiles_delete" ON seller_profiles FOR DELETE USING (is_admin_or_owner());
-- SELLER STORES
CREATE POLICY "seller_stores_select" ON seller_stores FOR SELECT USING (is_active=TRUE OR auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "seller_stores_manage" ON seller_stores FOR ALL USING (auth.uid()=user_id OR is_admin_or_owner()) WITH CHECK (auth.uid()=user_id OR is_admin_or_owner());
-- SELLER VERIFICATIONS
CREATE POLICY "seller_verifications_select" ON seller_verifications FOR SELECT USING (auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "seller_verifications_insert" ON seller_verifications FOR INSERT WITH CHECK (auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "seller_verifications_update" ON seller_verifications FOR UPDATE USING (is_admin_or_owner());
CREATE POLICY "seller_verifications_delete" ON seller_verifications FOR DELETE USING (is_admin_or_owner());
-- CATEGORIES
CREATE POLICY "categories_select" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories_manage" ON categories FOR ALL USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
-- PRODUCTS
CREATE POLICY "products_select" ON products FOR SELECT USING ((is_active=TRUE AND is_approved=TRUE) OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (auth.uid()=seller_id AND is_seller());
CREATE POLICY "products_update" ON products FOR UPDATE USING (auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "products_delete" ON products FOR DELETE USING (auth.uid()=seller_id OR is_admin_or_owner());
-- PRODUCT ANALYTICS
CREATE POLICY "product_analytics_select" ON product_analytics FOR SELECT USING (TRUE);
CREATE POLICY "product_analytics_write"  ON product_analytics FOR ALL USING (TRUE) WITH CHECK (TRUE);
-- RECENTLY VIEWED
CREATE POLICY "recently_viewed_select" ON recently_viewed FOR SELECT USING (auth.uid()=user_id OR session_id IS NOT NULL);
CREATE POLICY "recently_viewed_insert" ON recently_viewed FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "recently_viewed_delete" ON recently_viewed FOR DELETE USING (auth.uid()=user_id);
-- CARTS
CREATE POLICY "carts_own" ON carts FOR ALL USING (auth.uid()=user_id OR is_admin_or_owner()) WITH CHECK (auth.uid()=user_id OR is_admin_or_owner());
-- CART ITEMS
CREATE POLICY "cart_items_own" ON cart_items FOR ALL
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id=cart_id AND c.user_id=auth.uid()) OR is_admin_or_owner())
  WITH CHECK (EXISTS (SELECT 1 FROM carts c WHERE c.id=cart_id AND c.user_id=auth.uid()) OR is_admin_or_owner());
-- ORDERS
CREATE POLICY "orders_select" ON orders FOR SELECT USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid()=buyer_id OR is_admin_or_owner());
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (is_admin_or_owner());
-- ORDER ITEMS
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id=order_id AND (o.buyer_id=auth.uid() OR o.seller_id=auth.uid())) OR is_admin_or_owner());
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (TRUE);
-- PAYMENT SESSIONS
CREATE POLICY "payment_sessions_select" ON payment_sessions FOR SELECT USING (auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "payment_sessions_write"  ON payment_sessions FOR ALL USING (TRUE) WITH CHECK (TRUE);
-- PAYOUTS
CREATE POLICY "payouts_seller_select" ON payouts FOR SELECT USING (auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "payouts_admin_manage"  ON payouts FOR ALL USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
-- REVIEWS
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (status='published' OR auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (auth.uid()=user_id OR EXISTS (SELECT 1 FROM products p WHERE p.id=product_id AND p.seller_id=auth.uid()) OR is_admin_or_owner());
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (is_admin_or_owner());
-- PRODUCT QUESTIONS
CREATE POLICY "product_questions_select" ON product_questions FOR SELECT USING (TRUE);
CREATE POLICY "product_questions_insert" ON product_questions FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "product_questions_update" ON product_questions FOR UPDATE USING (auth.uid()=user_id OR EXISTS (SELECT 1 FROM products p WHERE p.id=product_id AND p.seller_id=auth.uid()) OR is_admin_or_owner());
CREATE POLICY "product_questions_delete" ON product_questions FOR DELETE USING (auth.uid()=user_id OR is_admin_or_owner());
-- PRODUCT OFFERS
CREATE POLICY "product_offers_select" ON product_offers FOR SELECT USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "product_offers_insert" ON product_offers FOR INSERT WITH CHECK (auth.uid()=buyer_id);
CREATE POLICY "product_offers_update" ON product_offers FOR UPDATE USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
-- RETURNS
CREATE POLICY "returns_select" ON returns FOR SELECT USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "returns_insert" ON returns FOR INSERT WITH CHECK (auth.uid()=buyer_id);
CREATE POLICY "returns_update" ON returns FOR UPDATE USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
-- DISPUTES
CREATE POLICY "disputes_select" ON disputes FOR SELECT USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "disputes_insert" ON disputes FOR INSERT WITH CHECK (auth.uid()=buyer_id);
CREATE POLICY "disputes_update" ON disputes FOR UPDATE USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
-- RFQ REQUESTS
CREATE POLICY "rfq_requests_insert" ON rfq_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "rfq_requests_select" ON rfq_requests FOR SELECT USING (auth.uid()=buyer_id OR is_seller() OR is_admin_or_owner());
CREATE POLICY "rfq_requests_update" ON rfq_requests FOR UPDATE USING (is_seller() OR is_admin_or_owner());
-- RFQ RESPONSES
CREATE POLICY "rfq_responses_select" ON rfq_responses FOR SELECT USING (auth.uid()=seller_id OR EXISTS (SELECT 1 FROM rfq_requests r WHERE r.id=rfq_id AND r.buyer_id=auth.uid()) OR is_admin_or_owner());
CREATE POLICY "rfq_responses_insert" ON rfq_responses FOR INSERT WITH CHECK (auth.uid()=seller_id AND is_seller());
CREATE POLICY "rfq_responses_update" ON rfq_responses FOR UPDATE USING (auth.uid()=seller_id OR is_admin_or_owner());
-- CONVERSATIONS
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (auth.uid()=user1_id OR auth.uid()=user2_id OR is_admin_or_owner());
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (auth.uid()=user1_id OR auth.uid()=user2_id);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (auth.uid()=user1_id OR auth.uid()=user2_id OR is_admin_or_owner());
-- MESSAGES
CREATE POLICY "messages_select" ON messages FOR SELECT USING (auth.uid()=sender_id OR auth.uid()=receiver_id OR is_admin_or_owner());
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid()=sender_id);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (auth.uid()=receiver_id OR is_admin_or_owner());
-- DELIVERY REQUESTS
CREATE POLICY "delivery_requests_select" ON delivery_requests FOR SELECT USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "delivery_requests_insert" ON delivery_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "delivery_requests_update" ON delivery_requests FOR UPDATE USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR is_admin_or_owner());
-- TRANSPORT QUOTES
CREATE POLICY "transport_quotes_select" ON transport_quotes FOR SELECT USING (EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.id=delivery_request_id AND (dr.buyer_id=auth.uid() OR dr.seller_id=auth.uid())) OR auth.uid()=carrier_id OR is_admin_or_owner());
CREATE POLICY "transport_quotes_insert" ON transport_quotes FOR INSERT WITH CHECK (auth.uid()=carrier_id OR is_admin_or_owner());
CREATE POLICY "transport_quotes_update" ON transport_quotes FOR UPDATE USING (auth.uid()=carrier_id OR is_admin_or_owner());
-- SHIPMENTS
CREATE POLICY "shipments_select" ON shipments FOR SELECT USING (auth.uid()=seller_id OR auth.uid()=buyer_id OR is_admin_or_owner());
CREATE POLICY "shipments_insert" ON shipments FOR INSERT WITH CHECK (auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "shipments_update" ON shipments FOR UPDATE USING (auth.uid()=seller_id OR is_admin_or_owner());
-- SHIPMENT EVENTS
CREATE POLICY "shipment_events_select" ON shipment_events FOR SELECT USING (EXISTS (SELECT 1 FROM shipments s WHERE s.id=shipment_id AND (s.buyer_id=auth.uid() OR s.seller_id=auth.uid())) OR is_admin_or_owner());
CREATE POLICY "shipment_events_insert" ON shipment_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shipments s WHERE s.id=shipment_id AND s.seller_id=auth.uid()) OR is_admin_or_owner());
-- REPORTED LISTINGS
CREATE POLICY "reported_listings_select" ON reported_listings FOR SELECT USING (auth.uid()=reported_by OR is_admin_or_owner());
CREATE POLICY "reported_listings_insert" ON reported_listings FOR INSERT WITH CHECK (auth.uid()=reported_by);
CREATE POLICY "reported_listings_update" ON reported_listings FOR UPDATE USING (is_admin_or_owner());
-- ADMIN ACTIONS (admin write, admin/owner read)
CREATE POLICY "admin_actions_select" ON admin_actions FOR SELECT USING (is_admin_or_owner());
CREATE POLICY "admin_actions_insert" ON admin_actions FOR INSERT WITH CHECK (is_admin_or_owner());
-- AUDIT LOGS (service-role writes, admin/owner reads)
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (is_admin_or_owner());
-- SUPPORT TICKETS
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT USING (auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "support_tickets_update" ON support_tickets FOR UPDATE USING (auth.uid()=user_id OR is_admin_or_owner());
-- SUPPORT TICKET MESSAGES
CREATE POLICY "ticket_messages_select" ON support_ticket_messages FOR SELECT USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id=ticket_id AND (t.user_id=auth.uid() OR is_admin_or_owner())));
CREATE POLICY "ticket_messages_insert" ON support_ticket_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id=ticket_id AND (t.user_id=auth.uid() OR is_admin_or_owner())));
-- BANNERS
CREATE POLICY "banners_select" ON banners FOR SELECT USING (is_active=TRUE OR is_admin_or_owner());
CREATE POLICY "banners_manage" ON banners FOR ALL USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
-- PLATFORM SETTINGS
CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT USING (TRUE);
CREATE POLICY "platform_settings_manage" ON platform_settings FOR ALL USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid()=user_id);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (auth.uid()=user_id OR is_admin_or_owner());
-- NOTIFICATION SETTINGS
CREATE POLICY "notification_settings_all" ON notification_settings FOR ALL USING (auth.uid()=user_id OR is_admin_or_owner()) WITH CHECK (auth.uid()=user_id OR is_admin_or_owner());
-- WISHLISTS
CREATE POLICY "wishlists_all" ON wishlists FOR ALL USING (auth.uid()=user_id OR is_admin_or_owner()) WITH CHECK (auth.uid()=user_id OR is_admin_or_owner());
-- WISHLIST ITEMS
CREATE POLICY "wishlist_items_all" ON wishlist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM wishlists w WHERE w.id=wishlist_id AND w.user_id=auth.uid()) OR is_admin_or_owner())
  WITH CHECK (EXISTS (SELECT 1 FROM wishlists w WHERE w.id=wishlist_id AND w.user_id=auth.uid()) OR is_admin_or_owner());
-- SAVED SEARCHES
CREATE POLICY "saved_searches_all" ON saved_searches FOR ALL USING (auth.uid()=user_id OR is_admin_or_owner()) WITH CHECK (auth.uid()=user_id OR is_admin_or_owner());
-- FEATURED LISTINGS
CREATE POLICY "featured_listings_select" ON featured_listings FOR SELECT USING (is_active=TRUE OR is_admin_or_owner());
CREATE POLICY "featured_listings_manage" ON featured_listings FOR ALL USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
-- PROMOTED LISTINGS
CREATE POLICY "promoted_listings_select" ON promoted_listings FOR SELECT USING (status='active' OR auth.uid()=seller_id OR is_admin_or_owner());
CREATE POLICY "promoted_listings_insert" ON promoted_listings FOR INSERT WITH CHECK (auth.uid()=seller_id);
CREATE POLICY "promoted_listings_update" ON promoted_listings FOR UPDATE USING (auth.uid()=seller_id OR is_admin_or_owner());
-- COUPONS
CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (is_active=TRUE OR auth.uid()=created_by OR is_admin_or_owner());
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (is_seller());
CREATE POLICY "coupons_update" ON coupons FOR UPDATE USING (auth.uid()=created_by OR is_admin_or_owner());
CREATE POLICY "coupons_delete" ON coupons FOR DELETE USING (auth.uid()=created_by OR is_admin_or_owner());
-- COUPON USAGE
CREATE POLICY "coupon_usage_select" ON coupon_usage FOR SELECT USING (auth.uid()=user_id OR is_admin_or_owner());
CREATE POLICY "coupon_usage_insert" ON coupon_usage FOR INSERT WITH CHECK (TRUE);

-- ──────────────────────────────────────────────────────────────
-- OWNER ACCOUNT SETUP
-- After the owner registers via Supabase Auth, run:
--
-- UPDATE users SET role = 'owner'
-- WHERE email = 'loadifymarket.co.uk@gmail.com';
--
-- This grants the platform owner full bypass of all RLS policies.
-- ──────────────────────────────────────────────────────────────
