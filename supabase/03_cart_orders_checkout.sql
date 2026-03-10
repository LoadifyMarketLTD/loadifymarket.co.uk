-- ============================================================
-- 03_cart_orders_checkout.sql
-- Loadify Market — Cart, Orders, Checkout & Payouts
-- ============================================================
-- Covers: carts, cart_items, orders, order_items,
--         payment_sessions, payouts
-- ============================================================
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- CARTS
-- One cart per authenticated user; session_id for guests.
-- ──────────────────────────────────────────────────────────────
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

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- CART ITEMS
-- Normalised line items rather than JSONB blob.
-- ──────────────────────────────────────────────────────────────
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

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- ORDERS
-- An order may span multiple products (multi-seller orders
-- are split by the application layer before INSERT).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT        UNIQUE NOT NULL,
  buyer_id            UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id           UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Primary product kept for backward compat; use order_items for line items
  product_id          UUID        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity            INTEGER     NOT NULL DEFAULT 1,
  -- Financials
  subtotal            DECIMAL(12,2) NOT NULL,
  vat_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  shipping_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total               DECIMAL(12,2) NOT NULL,
  commission          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  coupon_code         TEXT,
  -- Status
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','packed','shipped','delivered','cancelled','refunded')),
  -- Addresses (snapshot at order time)
  shipping_address    JSONB       NOT NULL,
  billing_address     JSONB       NOT NULL,
  -- Delivery
  delivery_method     TEXT        NOT NULL DEFAULT 'delivery'
                        CHECK (delivery_method IN ('pickup','delivery')),
  shipping_method     TEXT,
  tracking_number     TEXT,
  -- Proof & invoice
  delivered_at        TIMESTAMPTZ,
  invoice_url         TEXT,
  proof_of_delivery   JSONB,
  -- Escrow
  escrow_status       TEXT        NOT NULL DEFAULT 'held'
                        CHECK (escrow_status IN ('held','released','refunded','partial_refund')),
  escrow_released_at  TIMESTAMPTZ,
  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer         ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller        ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number  ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created       ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_escrow        ON orders (escrow_status);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- Line items for each order (supports multi-product orders).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_per_unit  DECIMAL(12,2) NOT NULL,
  vat_rate        DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  subtotal        DECIMAL(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

-- ──────────────────────────────────────────────────────────────
-- PAYMENT SESSIONS
-- Stripe / payment gateway session tracking.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_sessions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        REFERENCES users(id) ON DELETE SET NULL,
  order_id            UUID        REFERENCES orders(id) ON DELETE SET NULL,
  stripe_session_id   TEXT        UNIQUE NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'GBP',
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  payment_method      TEXT,
  stripe_payment_intent TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_user   ON payment_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_order  ON payment_sessions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_stripe ON payment_sessions (stripe_session_id);

CREATE TRIGGER trg_payment_sessions_updated_at
  BEFORE UPDATE ON payment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- PAYOUTS
-- Seller payouts initiated by the platform.
-- ──────────────────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_payouts_seller  ON payouts (seller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status  ON payouts (status);
CREATE INDEX IF NOT EXISTS idx_payouts_order   ON payouts (order_id);

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: generate sequential order number
-- ──────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 100001 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'LM-' || LPAD(nextval('order_number_seq')::TEXT, 7, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: release escrow after delivery confirmation
-- Call via application layer or scheduled job.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION release_order_escrow(p_order_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET escrow_status       = 'released',
      escrow_released_at  = NOW(),
      updated_at          = NOW()
  WHERE id = p_order_id
    AND escrow_status = 'held'
    AND status = 'delivered';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
