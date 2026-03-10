-- ============================================================
-- 04_sellers_reviews_ratings.sql
-- Loadify Market — Reviews, Returns, Disputes & Offers
-- ============================================================
-- Covers: reviews, product_questions, product_offers,
--         returns, disputes
-- ============================================================
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql,
--             03_cart_orders_checkout.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- REVIEWS
-- Verified purchase reviews with optional seller response.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id            UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id              UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- Rating
  rating                INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  seller_rating         INTEGER     CHECK (seller_rating BETWEEN 1 AND 5),
  -- Content
  title                 TEXT,
  comment               TEXT,
  images                TEXT[]      NOT NULL DEFAULT '{}',
  video_url             TEXT,
  -- Verification
  is_verified_purchase  BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Seller response
  seller_response_text  TEXT,
  seller_responded_at   TIMESTAMPTZ,
  -- Moderation
  status                TEXT        NOT NULL DEFAULT 'published'
                          CHECK (status IN ('published','hidden','removed','flagged')),
  is_abusive            BOOLEAN     NOT NULL DEFAULT FALSE,
  admin_note            TEXT,
  -- Helpfulness
  helpful_count         INTEGER     NOT NULL DEFAULT 0,
  helpful_voters        UUID[]      NOT NULL DEFAULT '{}',
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each buyer can review a product once per verified order
  UNIQUE (order_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product   ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user      ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status    ON reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating    ON reviews (rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created   ON reviews (created_at DESC);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: auto-mark review as verified purchase
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_verified_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.buyer_id   = NEW.user_id
      AND oi.product_id = NEW.product_id
      AND o.status IN ('delivered')
  ) THEN
    NEW.is_verified_purchase = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_verified_purchase
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION mark_verified_purchase();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: update product rating on review insert/update
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE products
  SET rating       = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = v_pid AND status = 'published'),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = v_pid AND status = 'published'),
      updated_at   = NOW()
  WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_refresh_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();

-- ──────────────────────────────────────────────────────────────
-- PRODUCT QUESTIONS & ANSWERS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_questions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name         TEXT        NOT NULL,
  question          TEXT        NOT NULL CHECK (length(trim(question)) > 0),
  answer            TEXT        CHECK (answer IS NULL OR length(trim(answer)) > 0),
  answer_user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  answer_user_name  TEXT,
  upvotes           INTEGER     NOT NULL DEFAULT 0,
  is_answered       BOOLEAN     NOT NULL DEFAULT FALSE,
  answered_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_questions_product  ON product_questions (product_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_user     ON product_questions (user_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_upvotes  ON product_questions (upvotes DESC);

CREATE TRIGGER trg_product_questions_updated_at
  BEFORE UPDATE ON product_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- PRODUCT OFFERS (Make-an-Offer)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_offers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_price     DECIMAL(12,2) NOT NULL,
  quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  message         TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected','countered','expired','withdrawn')),
  counter_price   DECIMAL(12,2),
  counter_message TEXT,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_offers_product ON product_offers (product_id);
CREATE INDEX IF NOT EXISTS idx_product_offers_buyer   ON product_offers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_product_offers_seller  ON product_offers (seller_id);
CREATE INDEX IF NOT EXISTS idx_product_offers_status  ON product_offers (status);

CREATE TRIGGER trg_product_offers_updated_at
  BEFORE UPDATE ON product_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-expire stale offers
CREATE OR REPLACE FUNCTION expire_pending_offers()
RETURNS void AS $$
BEGIN
  UPDATE product_offers
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- RETURNS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason                  TEXT        NOT NULL
                            CHECK (reason IN ('damaged','wrong_item','not_as_described','changed_mind','other')),
  description             TEXT        NOT NULL,
  images                  TEXT[]      NOT NULL DEFAULT '{}',
  status                  TEXT        NOT NULL DEFAULT 'requested'
                            CHECK (status IN ('requested','approved','rejected','completed','cancelled')),
  refund_amount           DECIMAL(12,2),
  buyer_tracking_number   TEXT,
  seller_tracking_number  TEXT,
  resolved_by             UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_order  ON returns (order_id);
CREATE INDEX IF NOT EXISTS idx_returns_buyer  ON returns (buyer_id);
CREATE INDEX IF NOT EXISTS idx_returns_seller ON returns (seller_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status);

CREATE TRIGGER trg_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- DISPUTES
-- Buyer Protection dispute system.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject                 TEXT        NOT NULL,
  description             TEXT        NOT NULL,
  protection_reason       TEXT        CHECK (protection_reason IN (
                            'item_not_received','not_as_described','item_damaged',
                            'defective_product','seller_not_responding','other'
                          )),
  images                  TEXT[]      NOT NULL DEFAULT '{}',
  status                  TEXT        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','in_review','resolved','closed')),
  resolution              TEXT,
  resolution_type         TEXT        CHECK (resolution_type IN (
                            'full_refund','partial_refund','replacement','rejected','withdrawn'
                          )),
  refund_amount           DECIMAL(12,2),
  resolved_by             UUID        REFERENCES users(id) ON DELETE SET NULL,
  seller_response_deadline TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  admin_review_deadline   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 days'),
  escrow_status           TEXT        NOT NULL DEFAULT 'held'
                            CHECK (escrow_status IN ('held','released','refunded','partial_refund')),
  buyer_abuse_flagged     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_order   ON disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_buyer   ON disputes (buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_seller  ON disputes (seller_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status  ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_created ON disputes (created_at DESC);

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
