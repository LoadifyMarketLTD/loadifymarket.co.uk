-- ================================================================
-- 06_fulfilment_rfq.sql
-- Loadify Market — Order fulfilment, shipment events & RFQ
-- ================================================================
-- shipments & shipment_events use snake_case because they are written
-- by Netlify serverless functions. RFQ tables retain the existing form
-- payload naming contract.
-- Depends on: 01, 02, 03
-- ================================================================

-- ── SHIPMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
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
DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_snake();

-- ── SHIPMENT EVENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipment_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL,
  location    TEXT,
  message     TEXT,
  changed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  source      TEXT        NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual','system','courier_api')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_created  ON shipment_events (created_at DESC);

-- ── RFQ REQUESTS ────────────────────────────────────────────────
-- FK/meta fields: camelCase; form payload fields: snake_case.
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
DROP TRIGGER IF EXISTS trg_rfq_requests_updatedAt ON rfq_requests;
CREATE TRIGGER trg_rfq_requests_updatedAt BEFORE UPDATE ON rfq_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RFQ RESPONSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfq_responses (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  "rfqId"          UUID          NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  "sellerId"       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "quotedPrice"    DECIMAL(12,2) NOT NULL,
  currency         TEXT          NOT NULL DEFAULT 'GBP',
  "leadTimeDays"   INTEGER,
  message          TEXT          NOT NULL,
  "attachmentUrls" TEXT[]        NOT NULL DEFAULT '{}',
  status           TEXT          NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','accepted','rejected','withdrawn')),
  "acceptedAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE ("rfqId", "sellerId")
);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq    ON rfq_responses ("rfqId");
CREATE INDEX IF NOT EXISTS idx_rfq_responses_seller ON rfq_responses ("sellerId");
DROP TRIGGER IF EXISTS trg_rfq_responses_updatedAt ON rfq_responses;
CREATE TRIGGER trg_rfq_responses_updatedAt BEFORE UPDATE ON rfq_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
