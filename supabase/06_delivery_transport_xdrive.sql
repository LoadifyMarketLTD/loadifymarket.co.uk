-- ============================================================
-- 06_delivery_transport_xdrive.sql
-- Loadify Market — Delivery Requests, Transport Quotes & Shipments
-- ============================================================
-- Covers: delivery_requests, transport_quotes,
--         shipments, shipment_events
-- ============================================================
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql,
--             03_cart_orders_checkout.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- DELIVERY REQUESTS
-- Created when a buyer or seller initiates a transport/logistics
-- request via the XDrive integration flow.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_requests (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Context
  listing_id          UUID        REFERENCES products(id) ON DELETE SET NULL,
  listing_title       TEXT,
  order_id            UUID        REFERENCES orders(id) ON DELETE SET NULL,
  seller_id           UUID        REFERENCES users(id) ON DELETE SET NULL,
  seller_name         TEXT,
  -- Requester (may be guest)
  buyer_id            UUID        REFERENCES users(id) ON DELETE SET NULL,
  buyer_name          TEXT        NOT NULL,
  buyer_email         TEXT        NOT NULL,
  -- Route
  pickup_postcode     TEXT        NOT NULL,
  dropoff_postcode    TEXT        NOT NULL,
  pickup_address      JSONB,      -- full address snapshot
  dropoff_address     JSONB,
  -- Load details
  pallet_count        INTEGER,
  weight_kg           DECIMAL(10,2),
  item_type           TEXT,
  category            TEXT,
  quantity            INTEGER,
  special_instructions TEXT,
  -- Status tracking
  status              TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft','submitted','in_review','quoted',
                          'accepted','in_transit','delivered','cancelled'
                        )),
  -- XDrive reference (returned by external API)
  xdrive_ref          TEXT,
  -- Attribution
  source              TEXT        NOT NULL DEFAULT 'loadify-market',
  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_requests_seller    ON delivery_requests (seller_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_buyer     ON delivery_requests (buyer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_order     ON delivery_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_listing   ON delivery_requests (listing_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status    ON delivery_requests (status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_created   ON delivery_requests (created_at DESC);

CREATE TRIGGER trg_delivery_requests_updated_at
  BEFORE UPDATE ON delivery_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- TRANSPORT QUOTES
-- Quotes returned by XDrive or entered manually by logistics
-- carriers in response to a delivery request.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_quotes (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_request_id     UUID        NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  -- Quote provider
  carrier_id              UUID        REFERENCES users(id) ON DELETE SET NULL,
  carrier_name            TEXT        NOT NULL DEFAULT 'XDrive Logistics',
  -- Quote details
  quoted_price            DECIMAL(12,2) NOT NULL,
  currency                TEXT        NOT NULL DEFAULT 'GBP',
  vat_rate                DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  estimated_transit_days  INTEGER,
  vehicle_type            TEXT,
  service_level           TEXT        CHECK (service_level IN ('economy','standard','express','same_day')),
  notes                   TEXT,
  -- Status
  status                  TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','accepted','rejected','expired','superseded')),
  valid_until             TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at             TIMESTAMPTZ,
  -- XDrive reference
  xdrive_quote_id         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_quotes_request  ON transport_quotes (delivery_request_id);
CREATE INDEX IF NOT EXISTS idx_transport_quotes_carrier  ON transport_quotes (carrier_id);
CREATE INDEX IF NOT EXISTS idx_transport_quotes_status   ON transport_quotes (status);

CREATE TRIGGER trg_transport_quotes_updated_at
  BEFORE UPDATE ON transport_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SHIPMENTS
-- Tracks the physical movement of goods for a given order.
-- One order → one or more shipments (split shipments).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_request_id     UUID        REFERENCES delivery_requests(id) ON DELETE SET NULL,
  seller_id               UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  buyer_id                UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Carrier
  courier_name            TEXT,
  courier_service         TEXT,
  -- Tracking
  tracking_number         TEXT,
  tracking_url            TEXT,
  -- Status
  status                  TEXT        NOT NULL DEFAULT 'Pending'
                            CHECK (status IN (
                              'Pending','Processing','Dispatched','In Transit',
                              'Out for Delivery','Delivered','Returned','Delivery Failed'
                            )),
  -- Proof of delivery
  proof_of_delivery_url   TEXT,
  proof_of_delivery_data  JSONB,      -- {images, signature, deliveredBy, receivedBy}
  -- Dates
  estimated_delivery_date DATE,
  dispatched_at           TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  -- Admin notes
  admin_notes             TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order     ON shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller    ON shipments (seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer     ON shipments (buyer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking  ON shipments (tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status    ON shipments (status);

CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SHIPMENT EVENTS
-- Full audit trail / tracking timeline for each shipment.
-- ──────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: auto-create shipment event when shipment status changes
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shipment_events (shipment_id, status, message, source)
    VALUES (NEW.id, NEW.status, 'Status updated to ' || NEW.status, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipments_record_status_change
  AFTER UPDATE OF status ON shipments
  FOR EACH ROW EXECUTE FUNCTION record_shipment_status_change();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: sync shipment status back to order status
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_order_status_from_shipment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Delivered' THEN
    UPDATE orders
    SET status        = 'delivered',
        delivered_at  = NOW(),
        updated_at    = NOW()
    WHERE id = NEW.order_id AND status NOT IN ('delivered','cancelled','refunded');
  ELSIF NEW.status = 'In Transit' OR NEW.status = 'Dispatched' THEN
    UPDATE orders
    SET status      = 'shipped',
        updated_at  = NOW()
    WHERE id = NEW.order_id AND status = 'packed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipments_sync_order_status
  AFTER UPDATE OF status ON shipments
  FOR EACH ROW EXECUTE FUNCTION sync_order_status_from_shipment();
