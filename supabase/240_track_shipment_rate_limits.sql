-- Migration: 240_track_shipment_rate_limits.sql
-- Adds rate-limit tracking table for the public track-shipment endpoint
-- to prevent order-number enumeration / scraping.
-- Schema matches all other rate-limit tables so rateLimiter.ts can reuse it.

CREATE TABLE IF NOT EXISTS track_shipment_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

ALTER TABLE track_shipment_rate_limits ENABLE ROW LEVEL SECURITY;

-- No client-side access — service role only.
-- Rows expire naturally; prune anything older than 24 h.
CREATE INDEX IF NOT EXISTS track_shipment_rate_limits_window_idx
  ON track_shipment_rate_limits ("windowEnd");
