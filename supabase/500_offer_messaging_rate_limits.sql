-- Migration: 500_offer_messaging_rate_limits.sql
--
-- Rate-limit tracking tables for the high-traffic / security-sensitive
-- Netlify functions that were not covered by migration 120 / 240.
--
-- All tables share the same schema as the existing rate-limit tables and
-- are consumed by the shared _shared/rateLimiter.ts utility.
--
-- Limits applied (enforced in the function code):
--   send_message_rate_limits       → 60 messages per 1-minute window per user
--   conversation_offer_rate_limits → 10 offers   per 60-minute window per user
--   offer_accept_rate_limits       → 20 accepts  per 60-minute window per user
--   offer_decline_rate_limits      → 20 declines per 60-minute window per user
--   checkout_offer_rate_limits     → 10 checkouts per 60-minute window per user
--   push_token_rate_limits         → 10 registers per 60-minute window per user
--   create_product_rate_limits     → 20 listings  per 60-minute window per user
--   update_product_rate_limits     → 60 updates   per 60-minute window per user

-- ─── send_message_rate_limits ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS send_message_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── conversation_offer_rate_limits ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_offer_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── offer_accept_rate_limits ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_accept_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── offer_decline_rate_limits ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_decline_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── checkout_offer_rate_limits ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkout_offer_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── push_token_rate_limits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_token_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── create_product_rate_limits ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS create_product_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── update_product_rate_limits ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS update_product_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── RLS: deny all direct client access — service role only ──────────────────
ALTER TABLE send_message_rate_limits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_offer_rate_limits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_accept_rate_limits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_decline_rate_limits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_offer_rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_token_rate_limits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE create_product_rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_product_rate_limits       ENABLE ROW LEVEL SECURITY;

-- ─── Indexes for window lookups ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS send_message_rl_lookup
  ON send_message_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS conversation_offer_rl_lookup
  ON conversation_offer_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS offer_accept_rl_lookup
  ON offer_accept_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS offer_decline_rl_lookup
  ON offer_decline_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS checkout_offer_rl_lookup
  ON checkout_offer_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS push_token_rl_lookup
  ON push_token_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS create_product_rl_lookup
  ON create_product_rate_limits (identifier, "windowEnd");

CREATE INDEX IF NOT EXISTS update_product_rl_lookup
  ON update_product_rate_limits (identifier, "windowEnd");
