-- ============================================================
-- Migration 200: Services Marketplace Schema
-- ============================================================
-- adds the tables required for an online-services marketplace
-- (no physical products, no warehouse, no depot).
--
-- New entities:
--   services            – what sellers offer (replaces physical products)
--   service_attributes  – key/value metadata per service
--   service_media       – images / videos / docs per service
--   service_requests    – buyer requests for quotes (RFQ flow)
--   service_quotes      – seller offers in response to requests
--   order_messages      – in-order chat between buyer and seller
--
-- Compatible with the existing schema which already has:
--   users, seller_profiles, categories, orders, order_items,
--   payments, reviews, products (physical goods – retained for
--   backward compatibility; new listings should use `services`)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. services
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Core content
  title         VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  description   TEXT,

  -- Pricing
  base_price    NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
  currency      VARCHAR(10) NOT NULL DEFAULT 'GBP',
  service_type  VARCHAR(30) NOT NULL DEFAULT 'fixed_price'
                  CHECK (service_type IN ('fixed_price', 'hourly', 'per_km', 'per_project')),

  -- Delivery model
  location_type VARCHAR(20) NOT NULL DEFAULT 'online'
                  CHECK (location_type IN ('online', 'onsite', 'hybrid')),

  -- Lifecycle
  status        VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'inactive')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_seller_id    ON services (seller_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id  ON services (category_id);
CREATE INDEX IF NOT EXISTS idx_services_status       ON services (status);
CREATE INDEX IF NOT EXISTS idx_services_slug         ON services (slug);

-- Full-text search index for title + description
CREATE INDEX IF NOT EXISTS idx_services_fts
  ON services USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ──────────────────────────────────────────────────────────────
-- 2. service_attributes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_attributes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  value       VARCHAR(500) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_attributes_service_id ON service_attributes (service_id);

-- ──────────────────────────────────────────────────────────────
-- 3. service_media
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  type        VARCHAR(20) NOT NULL DEFAULT 'image'
                CHECK (type IN ('image', 'video', 'document')),
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_service_media_service_id ON service_media (service_id);

-- ──────────────────────────────────────────────────────────────
-- 4. service_requests  (buyer RFQ – request for quote)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,

  title        VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL,
  location     VARCHAR(255),

  budget_min   NUMERIC(12, 2) CHECK (budget_min >= 0),
  budget_max   NUMERIC(12, 2) CHECK (budget_max >= 0),

  status       VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed')),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_buyer_id    ON service_requests (buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_category_id ON service_requests (category_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status      ON service_requests (status);

-- ──────────────────────────────────────────────────────────────
-- 5. service_quotes  (seller response to an RFQ)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_quotes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  message     TEXT NOT NULL,

  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One quote per seller per request
  UNIQUE (request_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_service_quotes_request_id ON service_quotes (request_id);
CREATE INDEX IF NOT EXISTS idx_service_quotes_seller_id  ON service_quotes (seller_id);
CREATE INDEX IF NOT EXISTS idx_service_quotes_status     ON service_quotes (status);

-- ──────────────────────────────────────────────────────────────
-- 6. order_messages  (in-order buyer ↔ seller chat)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order_id  ON order_messages (order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender_id ON order_messages (sender_id);

-- ──────────────────────────────────────────────────────────────
-- 7. Add service_id FK to orders (nullable – not all orders
--    come from a service listing; some come from quotes)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_id   UUID REFERENCES service_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders (service_id);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id   ON orders (quote_id);

-- ──────────────────────────────────────────────────────────────
-- 8. updated_at trigger (reuse or create helper function)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'services', 'service_requests', 'service_quotes'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || tbl || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 9. Row-Level Security
-- ──────────────────────────────────────────────────────────────
ALTER TABLE services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_media      ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_quotes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages     ENABLE ROW LEVEL SECURITY;

-- services: public can read active; seller owns their own rows
CREATE POLICY services_read_active ON services
  FOR SELECT USING (status = 'active');

CREATE POLICY services_seller_all ON services
  FOR ALL USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY services_admin_all ON services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin'))
  );

-- service_attributes / service_media: inherit from parent service visibility
CREATE POLICY service_attributes_read ON service_attributes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.status = 'active')
    OR EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.seller_id = auth.uid())
  );

CREATE POLICY service_attributes_write ON service_attributes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.seller_id = auth.uid())
  );

CREATE POLICY service_media_read ON service_media
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.status = 'active')
    OR EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.seller_id = auth.uid())
  );

CREATE POLICY service_media_write ON service_media
  FOR ALL USING (
    EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.seller_id = auth.uid())
  );

-- service_requests: buyer owns; sellers can read open requests
CREATE POLICY service_requests_buyer_own ON service_requests
  FOR ALL USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY service_requests_seller_read ON service_requests
  FOR SELECT USING (
    status = 'open'
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('seller', 'admin'))
  );

-- service_quotes: seller owns; buyer can read quotes on their requests
CREATE POLICY service_quotes_seller_own ON service_quotes
  FOR ALL USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY service_quotes_buyer_read ON service_quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_requests r
      WHERE r.id = request_id AND r.buyer_id = auth.uid()
    )
  );

-- order_messages: buyer and seller on the order can read and write
CREATE POLICY order_messages_party ON order_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (o."buyerId" = auth.uid()
             OR EXISTS (
               SELECT 1 FROM order_items oi WHERE oi."orderId" = o.id AND oi."sellerId" = auth.uid()
             ))
    )
  )
  WITH CHECK (auth.uid() = sender_id);

-- ──────────────────────────────────────────────────────────────
-- 10. Grants
-- ──────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON services, service_attributes, service_media,
     service_requests, service_quotes, order_messages
  TO authenticated;

GRANT SELECT
  ON services, service_attributes, service_media
  TO anon;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO authenticated;
