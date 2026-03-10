-- ================================================================
-- 06_delivery_transport_xdrive.sql
-- Loadify Market — Logistics, Transport & RFQ
-- ================================================================
-- IMPORTANT: shipments & shipment_events use snake_case columns
-- because they are written by Netlify serverless functions:
--   - netlify/functions/create-shipment.ts
--   - netlify/functions/update-shipment-status.ts
--   - netlify/functions/upload-proof-of-delivery.ts
-- All other tables in this file use camelCase.
-- Depends on: 01, 02, 03
-- ================================================================

-- ── DELIVERY REQUESTS ───────────────────────────────────────────
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

-- ── TRANSPORT QUOTES ─────────────────────────────────────────────
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
  "serviceLevel"         TEXT         CHECK ("serviceLevel" IN ('economy','standard','express','same_day')),
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

-- ── SHIPMENTS — snake_case columns ───────────────────────────────
-- NOTE: This table intentionally uses snake_case (not camelCase) because
-- it is written by Netlify serverless functions (create-shipment.ts,
-- update-shipment-status.ts, upload-proof-of-delivery.ts).
-- The foreign key to orders.id is still valid even though orders uses
-- camelCase for its own columns — FK references the primary key only.
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

-- ── SHIPMENT EVENTS — snake_case columns ─────────────────────────
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

-- ── RFQ REQUESTS ─────────────────────────────────────────────────
-- FK/meta fields: camelCase; form payload fields: snake_case
-- (RFQPage.tsx inserts buyer_email, product_name, etc. with these exact keys)
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

-- ── RFQ RESPONSES ────────────────────────────────────────────────
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
