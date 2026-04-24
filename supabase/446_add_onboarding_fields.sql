-- ================================================================
-- 446_add_onboarding_fields.sql
-- Loadify Market — Onboarding tracking fields
-- ================================================================
-- Adds onboarding completion flags to users + seller_profiles.
-- Safe to run multiple times (all ADD COLUMN IF NOT EXISTS).
-- ================================================================

-- ── USERS table — universal onboarding flags ─────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "onboardingStep"      INTEGER     NOT NULL DEFAULT 0;

-- ── SELLER_PROFILES — granular onboarding step flags ─────────────
ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "accountType"             TEXT    CHECK ("accountType" IN ('individual', 'business')),
  ADD COLUMN IF NOT EXISTS "profileCompleted"        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled"    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled"    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "storeCreated"            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "shippingSetupCompleted"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "firstProductCreated"     BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Back-fill existing active sellers ────────────────────────────
-- Sellers already active have implicitly completed all steps.
UPDATE seller_profiles
SET
  "profileCompleted"       = TRUE,
  "stripeChargesEnabled"   = TRUE,
  "stripePayoutsEnabled"   = TRUE,
  "stripeDetailsSubmitted" = TRUE
WHERE "sellerStatus" = 'active';

UPDATE users
SET "onboardingCompleted" = TRUE
WHERE role IN ('buyer', 'admin');

UPDATE users u
SET "onboardingCompleted" = TRUE
FROM seller_profiles sp
WHERE u.id = sp."userId"
  AND sp."sellerStatus" = 'active';

-- ── FUNCTION: recompute seller onboarding completion ─────────────
-- Called by triggers and the connect-status function to keep
-- onboardingCompleted in sync whenever a seller step completes.
CREATE OR REPLACE FUNCTION sync_seller_onboarding_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW."profileCompleted"       IS TRUE AND
    NEW."stripeConnectStatus"    = 'active' AND
    NEW."stripeChargesEnabled"   IS TRUE AND
    NEW."stripePayoutsEnabled"   IS TRUE AND
    NEW."stripeDetailsSubmitted" IS TRUE AND
    NEW."storeCreated"           IS TRUE AND
    NEW."shippingSetupCompleted" IS TRUE AND
    NEW."firstProductCreated"    IS TRUE
  ) THEN
    UPDATE users
    SET "onboardingCompleted" = TRUE,
        "onboardingStep"      = 8
    WHERE id = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_seller_onboarding ON seller_profiles;
CREATE TRIGGER trg_sync_seller_onboarding
  AFTER UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_seller_onboarding_completed();
