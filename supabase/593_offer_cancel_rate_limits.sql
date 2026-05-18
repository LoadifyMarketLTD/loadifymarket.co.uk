-- =============================================================================
-- Migration 593: offer_cancel_rate_limits table
-- =============================================================================
-- Context:
--   offer-cancel.ts calls checkRateLimit with tableName 'offer_cancel_rate_limits'.
--   This table was never created, so the rate limiter silently failed open on
--   every cancel request (checkRateLimit swallows table-not-found errors).
--   This migration adds the table so cancellations are properly rate-limited.
--
-- Limit applied (enforced by the function): 20 cancels per 60-minute window.
-- =============================================================================

CREATE TABLE IF NOT EXISTS offer_cancel_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- Deny direct client access — service role only (same pattern as all other
-- rate-limit tables in migration 500_offer_messaging_rate_limits.sql).
ALTER TABLE offer_cancel_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS offer_cancel_rl_lookup
  ON offer_cancel_rate_limits (identifier, "windowEnd");

-- Force PostgREST to reload its schema cache so the FK relationships added
-- by previous migrations are visible immediately (avoids PGRST200 errors).
NOTIFY pgrst, 'reload schema';
