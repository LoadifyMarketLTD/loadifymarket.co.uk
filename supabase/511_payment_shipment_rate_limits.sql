-- ─────────────────────────────────────────────────────────────────────────────
-- 511_payment_shipment_rate_limits.sql
--
-- Rate-limit tracking tables for payment, shipment, refund, RFQ, and admin
-- functions that were not covered by migrations 120, 240, or 500.
--
-- All tables follow the same schema consumed by _shared/rateLimiter.ts.
--
-- Limits enforced (in function code):
--   create_checkout_rate_limits         → 10 per 60-min per user
--   create_payment_intent_rate_limits   → 10 per 60-min per user
--   create_refund_rate_limits           → 10 per 60-min per admin user
--   rfq_rate_limits                     → 20 per 60-min per user/IP
--   create_shipment_rate_limits         → 30 per 60-min per user
--   update_shipment_status_rate_limits  → 60 per 60-min per user
--   upload_proof_rate_limits            → 20 per 60-min per user
--   admin_sellers_rate_limits           → 30 per 60-min per admin user
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS create_checkout_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS create_payment_intent_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS create_refund_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS rfq_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS create_shipment_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS update_shipment_status_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS upload_proof_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS admin_sellers_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── RLS: deny all direct client access — service role only ──────────────────
ALTER TABLE create_checkout_rate_limits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE create_payment_intent_rate_limits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE create_refund_rate_limits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_rate_limits                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE create_shipment_rate_limits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_shipment_status_rate_limits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_proof_rate_limits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sellers_rate_limits             ENABLE ROW LEVEL SECURITY;

-- ─── Indexes for window lookups ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS create_checkout_rl_lookup
  ON create_checkout_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS create_payment_intent_rl_lookup
  ON create_payment_intent_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS create_refund_rl_lookup
  ON create_refund_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS rfq_rl_lookup
  ON rfq_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS create_shipment_rl_lookup
  ON create_shipment_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS update_shipment_status_rl_lookup
  ON update_shipment_status_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS upload_proof_rl_lookup
  ON upload_proof_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS admin_sellers_rl_lookup
  ON admin_sellers_rate_limits (identifier, "windowEnd");
