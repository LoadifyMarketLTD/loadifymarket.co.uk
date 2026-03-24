-- ──────────────────────────────────────────────────────────────────────────
-- Migration 210: Seller Automatic Activation System
--
-- Converts the manual admin-approval gate to an automatic activation flow.
-- A seller becomes active when their profile is complete AND their Stripe
-- Connect account has charges_enabled=true AND payouts_enabled=true.
--
-- Canonical seller lifecycle:
--   draft     → registered; setup not yet complete
--   submitted → profile complete; Stripe not yet fully ready
--   active    → profile complete AND Stripe ready (auto-set)
--   suspended → manually suspended by admin/owner; blocks even if Stripe ready
--
-- Backwards compatibility: the existing `isApproved` BOOLEAN column is kept
-- and kept in sync via a BEFORE UPDATE trigger so all existing queries that
-- filter on `isApproved = TRUE` continue to work without code changes.
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Add sellerStatus column (idempotent)
ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "sellerStatus" TEXT NOT NULL DEFAULT 'draft'
    CHECK ("sellerStatus" IN ('draft', 'submitted', 'active', 'suspended'));

-- 2. Add activatedAt timestamp (idempotent)
ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMPTZ;

-- 3. Backfill existing rows — priority: suspended > active > draft
--    Each UPDATE is guarded so it only touches the intended rows and is safe
--    to run multiple times (idempotent).

-- 3a. Previously suspended sellers stay suspended.
UPDATE seller_profiles
   SET "sellerStatus" = 'suspended'
 WHERE "verificationStatus" = 'suspended'
   AND "sellerStatus"       = 'draft';

-- 3b. Previously approved sellers become active.
UPDATE seller_profiles
   SET "sellerStatus" = 'active',
       "activatedAt"  = COALESCE("verifiedAt", NOW())
 WHERE "isApproved"   = TRUE
   AND "sellerStatus" = 'draft';

-- 3c. Sellers with a fully active Stripe account but never manually approved
--     should also be activated now (these were ready but the admin never
--     clicked Approve under the old system).
UPDATE seller_profiles
   SET "sellerStatus" = 'active',
       "activatedAt"  = COALESCE("verifiedAt", NOW())
 WHERE "stripeConnectStatus" = 'active'
   AND "sellerStatus"        = 'draft';

-- 4. Performance index
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status
  ON seller_profiles ("sellerStatus");

-- 5. Trigger: keep isApproved in sync whenever sellerStatus changes.
--    This preserves backward compatibility for all code still reading
--    the isApproved boolean.

CREATE OR REPLACE FUNCTION sync_seller_approval_from_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."sellerStatus" = 'active' THEN
    NEW."isApproved" = TRUE;
    -- Stamp activatedAt on first activation
    IF NEW."activatedAt" IS NULL THEN
      NEW."activatedAt" = NOW();
    END IF;
  ELSIF NEW."sellerStatus" IN ('draft', 'submitted', 'suspended') THEN
    NEW."isApproved" = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seller_status_sync ON seller_profiles;
CREATE TRIGGER trg_seller_status_sync
  BEFORE UPDATE OF "sellerStatus" ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_seller_approval_from_status();
