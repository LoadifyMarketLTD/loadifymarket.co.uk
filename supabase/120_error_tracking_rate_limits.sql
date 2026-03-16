-- Migration: 120_error_tracking_rate_limits.sql
-- Creates tables for:
--   1. CSP violation reports (csp_reports)
--   2. Frontend JS error reports (error_reports)
--   3. Rate-limit tracking tables for new endpoints:
--      - email_rate_limits           (send-email)
--      - resend_verification_rate_limits (resend-verification)
--      - connect_onboard_rate_limits (connect-onboard)
--      - error_report_rate_limits    (error-report)
--
-- All rate-limit tables share the same schema as checkout_rate_limits
-- so they can use the shared rateLimiter utility.
-- Rows are automatically pruned after 24 hours by the retention policy.

-- ─── CSP Reports ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS csp_reports (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentUri"      TEXT,
  "violatedDirective" TEXT,
  "blockedUri"       TEXT,
  "sourceFile"       TEXT,
  "lineNumber"       INT,
  "columnNumber"     INT,
  "statusCode"       INT,
  "userAgent"        TEXT,
  "reportedAt"       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Retention: auto-delete reports older than 30 days.
CREATE INDEX IF NOT EXISTS csp_reports_reported_at_idx ON csp_reports ("reportedAt");

-- ─── Frontend Error Reports ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message     TEXT        NOT NULL,
  url         TEXT,
  "userAgent" TEXT,
  context     TEXT,
  "timestamp" TIMESTAMPTZ,
  ip          TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_reports_created_at_idx ON error_reports ("createdAt");

-- ─── Rate-limit tables (shared schema) ───────────────────────────────────────
-- email_rate_limits
CREATE TABLE IF NOT EXISTS email_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- resend_verification_rate_limits
CREATE TABLE IF NOT EXISTS resend_verification_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- connect_onboard_rate_limits
CREATE TABLE IF NOT EXISTS connect_onboard_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- error_report_rate_limits
CREATE TABLE IF NOT EXISTS error_report_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

-- ─── RLS: deny all access from the client — service role only ────────────────
ALTER TABLE csp_reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_rate_limits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE resend_verification_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE connect_onboard_rate_limits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_report_rate_limits  ENABLE ROW LEVEL SECURITY;

-- Admin SELECT access to monitoring tables
CREATE POLICY "admin_read_csp_reports"
  ON csp_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "admin_read_error_reports"
  ON error_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'owner')
    )
  );
