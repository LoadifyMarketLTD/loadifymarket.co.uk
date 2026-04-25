-- ================================================================
-- 450_b2b_buyer_profiles.sql
-- Loadify Market — B2B Buyer Support
-- ================================================================
-- Extends buyer_profiles with B2B-specific fields.
-- Adds isB2B flag to orders.
-- Adds invoice_requested to orders.status.
--
-- B2B buyer rule (enforced in application code):
--   isB2B = accountType != 'individual'
--
-- Safe to run multiple times (idempotent).
-- Depends on: 01_users_profiles.sql, 448_service_lifecycle.sql
-- ================================================================

-- ── 1. Extend buyer_profiles with B2B fields ─────────────────────
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS "accountType"     TEXT    NOT NULL DEFAULT 'individual'
                                               CHECK ("accountType" IN ('individual', 'business', 'reseller', 'distributor')),
  ADD COLUMN IF NOT EXISTS "companyName"     TEXT,
  ADD COLUMN IF NOT EXISTS "vatNumber"       TEXT,
  ADD COLUMN IF NOT EXISTS "businessAddress" JSONB,
  ADD COLUMN IF NOT EXISTS "isVatVerified"   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "preferInvoice"   BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Add isB2B flag to orders ───────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "isB2B" BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 3. Extend orders.status to include invoice_requested ─────────
-- Drops the constraint added in 448 and re-adds with the extra value.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'paid', 'packed', 'shipped',
    'delivered', 'completed', 'cancelled', 'refunded',
    'invoice_requested'
  ));

-- ── 4. Index for B2B order lookups ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_is_b2b ON orders ("isB2B") WHERE "isB2B" = TRUE;

DO $$ BEGIN
  RAISE NOTICE '450_b2b_buyer_profiles: B2B fields added to buyer_profiles and orders.';
END $$;
