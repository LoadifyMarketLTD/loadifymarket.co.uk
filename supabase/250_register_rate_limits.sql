-- Migration: 250_register_rate_limits.sql
-- Creates the register_rate_limits table used by the register Netlify function
-- to enforce IP-based rate limiting on account creation (10 per IP per hour).
-- This prevents abuse of the registration endpoint to send bulk welcome emails
-- to arbitrary addresses and to exhaust Supabase user quotas.

CREATE TABLE IF NOT EXISTS register_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE INDEX IF NOT EXISTS idx_register_rate_limits_identifier
  ON register_rate_limits (identifier, "windowEnd");

-- Only the service role (Netlify functions) may read/write this table.
ALTER TABLE register_rate_limits ENABLE ROW LEVEL SECURITY;
