-- ================================================================
-- 453_stripe_free_onboarding.sql
-- Loadify Market — Remove Stripe gate from onboarding trigger
-- ================================================================
-- Removes the Stripe-account requirement from the
-- sync_seller_onboarding_completed() function so that sellers
-- can reach ACTIVE status purely by:
--   profileCompleted = TRUE
--   storeCreated     = TRUE
--   hasServiceCapability = TRUE
--   sellerStatus     NOT IN ('suspended')
--
-- Stripe fields (stripeConnectStatus, stripeChargesEnabled, etc.)
-- remain on seller_profiles and still gate PAYMENT capability
-- inside create-checkout.ts.  They do NOT gate onboarding status.
--
-- Safe to run multiple times (CREATE OR REPLACE is idempotent).
-- Depends on: 447_service_first_onboarding.sql
-- ================================================================

CREATE OR REPLACE FUNCTION sync_seller_onboarding_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Gate: profile + store + at least one listing.
  -- Stripe is NOT required for onboarding — it only gates payments.
  IF (
    NEW."profileCompleted"     IS TRUE AND
    NEW."storeCreated"         IS TRUE AND
    NEW."hasServiceCapability" IS TRUE AND
    COALESCE(NEW."sellerStatus", 'pending') NOT IN ('suspended')
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
  RAISE NOTICE '453_stripe_free_onboarding: Stripe removed from onboarding gate. Sellers activate on profileCompleted + storeCreated + hasServiceCapability.';
END $$;
