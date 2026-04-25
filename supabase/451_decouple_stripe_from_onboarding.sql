-- ================================================================
-- 451_decouple_stripe_from_onboarding.sql
-- Loadify Market — Step 2 Closure: Service-First Onboarding
-- ================================================================
-- PROBLEM (from audit):
--   sync_seller_onboarding_completed() in migration 447 still required
--   full Stripe Connect activation (stripeConnectStatus='active',
--   stripeChargesEnabled, stripePayoutsEnabled, stripeDetailsSubmitted)
--   before setting onboardingCompleted=TRUE.
--
-- This violates the approved doctrine:
--   "Stripe must NOT gate seller approval or activation."
--
-- FIX:
--   Replace the function body — removing all four Stripe conditions.
--   Stripe controls ONLY card checkout eligibility and auto-payout
--   eligibility (already enforced in create-checkout.ts; unchanged).
--
-- NEW GATE (onboardingCompleted = TRUE when ALL of):
--   • profileCompleted   = TRUE   — legal / profile data present
--   • storeCreated       = TRUE   — store page created
--   • hasServiceCapability = TRUE — at least one active listing
--   • sellerStatus NOT IN ('suspended', 'rejected')
--
-- The trigger attachment (trg_sync_seller_onboarding on seller_profiles
-- AFTER UPDATE) was created in migration 446 and is unchanged here.
--
-- Safe to run multiple times (CREATE OR REPLACE is idempotent).
-- Depends on: 446_add_onboarding_fields.sql, 447_service_first_onboarding.sql
-- ================================================================

CREATE OR REPLACE FUNCTION sync_seller_onboarding_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Seller is considered fully onboarded when their profile, store, and
  -- at least one service/product listing are in place, and they have not
  -- been suspended or rejected.  Stripe Connect readiness is intentionally
  -- excluded: it controls payment eligibility only (see create-checkout.ts).
  IF (
    NEW."profileCompleted"     IS TRUE AND
    NEW."storeCreated"         IS TRUE AND
    NEW."hasServiceCapability" IS TRUE AND
    NEW."sellerStatus" NOT IN ('suspended', 'rejected')
  ) THEN
    UPDATE users
    SET "onboardingCompleted" = TRUE,
        "onboardingStep"      = 8
    WHERE id = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  RAISE NOTICE '451_decouple_stripe_from_onboarding: sync_seller_onboarding_completed() updated — Stripe conditions removed from onboarding gate.';
END $$;
