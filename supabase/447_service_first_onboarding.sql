-- ================================================================
-- 447_service_first_onboarding.sql
-- Loadify Market — Service-First Onboarding
-- ================================================================
-- Removes the shipping and first-product blockers for service
-- providers.  Replaces those two gating conditions with a single
-- hasServiceCapability flag that is TRUE whenever the seller has
-- created at least one active listing (products OR services table).
--
-- Safe to run multiple times (all statements are idempotent).
-- Depends on: 01_users_profiles.sql, 03_cart_orders_checkout.sql,
--             200_services_marketplace.sql, 446_add_onboarding_fields.sql
-- ================================================================

-- ── 1. Add hasServiceCapability column ───────────────────────────
ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "hasServiceCapability" BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Back-fill: mark sellers who already have any listing ──────
UPDATE seller_profiles sp
SET "hasServiceCapability" = TRUE
WHERE
  EXISTS (SELECT 1 FROM products  p WHERE p."sellerId"  = sp."userId")
  OR
  EXISTS (SELECT 1 FROM services  s WHERE s.seller_id   = sp."userId");

-- ── 3. Trigger: set capability when a product row is inserted ────
--   Fires after INSERT or after UPDATE that makes isActive = TRUE.
CREATE OR REPLACE FUNCTION set_seller_service_capability()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seller_profiles
  SET "hasServiceCapability" = TRUE
  WHERE "userId" = NEW."sellerId"
    AND "hasServiceCapability" IS DISTINCT FROM TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_products_service_capability ON products;
CREATE TRIGGER trg_products_service_capability
  AFTER INSERT OR UPDATE OF "isActive" ON products
  FOR EACH ROW
  WHEN (NEW."isActive" IS TRUE)
  EXECUTE FUNCTION set_seller_service_capability();

-- ── 4. Same trigger for the services table (snake_case columns) ──
CREATE OR REPLACE FUNCTION set_seller_service_capability_from_services()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seller_profiles
  SET "hasServiceCapability" = TRUE
  WHERE "userId" = NEW.seller_id
    AND "hasServiceCapability" IS DISTINCT FROM TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_services_service_capability ON services;
CREATE TRIGGER trg_services_service_capability
  AFTER INSERT OR UPDATE OF status ON services
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION set_seller_service_capability_from_services();

-- ── 5. Replace sync_seller_onboarding_completed ──────────────────
-- Old gate: shippingSetupCompleted = TRUE AND firstProductCreated = TRUE
-- New gate: hasServiceCapability = TRUE
-- Stripe conditions remain unchanged — they control payout capability,
-- not the seller's right to be approved.
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
    NEW."hasServiceCapability"   IS TRUE
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
  RAISE NOTICE '447_service_first_onboarding: hasServiceCapability added; onboarding trigger updated.';
END $$;
