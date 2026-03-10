-- ================================================================
-- 03_cart_orders_checkout.sql
-- Loadify Market — Cart, Orders & Payments
-- ================================================================
-- Naming convention: camelCase quoted identifiers.
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql
-- ================================================================

-- ── CARTS ────────────────────────────────────────────────────────
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

-- ── CART ITEMS ───────────────────────────────────────────────────
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

-- ── ORDERS ───────────────────────────────────────────────────────
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

-- ── ORDER ITEMS ──────────────────────────────────────────────────
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

-- ── PAYMENT SESSIONS ─────────────────────────────────────────────
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

-- ── PAYOUTS ──────────────────────────────────────────────────────
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

-- ── COUPONS ──────────────────────────────────────────────────────
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

-- ── COUPON USAGE ─────────────────────────────────────────────────
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
