-- 672_seller_onboarding_v2_truth.sql
-- Loadify Market — Stage 3 Seller Onboarding V2 truth boundary.
--
-- PURPOSE
--   Remove browser-controlled completion semantics from Marketplace Seller
--   onboarding and make progress flags projections of persisted marketplace
--   truth. Stripe remains a commercial activation/payment readiness signal; it
--   is not treated as identity verification and does not define onboarding
--   completion.
--
-- INVARIANTS
--   * sellerType is canonical: individual | sole_trader | company.
--   * profileCompleted, storeCreated and firstProductCreated are server-managed.
--   * users.onboardingCompleted/onboardingStep are server-managed.
--   * Marketplace onboarding requires legal/profile details, store identity and
--     at least one product/draft catalogue row.
--   * Legacy hasServiceCapability remains for compatibility but no longer gates
--     Marketplace Seller onboarding completion.
--   * Seller commercial activation continues to use the separate sellerStatus
--     / Stripe / optional admin-approval contract.
--   * Supplier Commerce is not touched.

CREATE OR REPLACE FUNCTION private.protect_seller_onboarding_flags_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."profileCompleted" := false;
      NEW."storeCreated" := false;
      NEW."firstProductCreated" := false;
    ELSE
      NEW."profileCompleted" := OLD."profileCompleted";
      NEW."storeCreated" := OLD."storeCreated";
      NEW."firstProductCreated" := OLD."firstProductCreated";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_01_protect_seller_onboarding_flags_v2
  ON public.seller_profiles;
CREATE TRIGGER trg_01_protect_seller_onboarding_flags_v2
BEFORE INSERT OR UPDATE
ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION private.protect_seller_onboarding_flags_v2();

REVOKE ALL ON FUNCTION private.protect_seller_onboarding_flags_v2()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.protect_seller_onboarding_flags_v2()
  TO service_role;

CREATE OR REPLACE FUNCTION private.protect_user_onboarding_flags_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."onboardingCompleted" := false;
      NEW."onboardingStep" := 0;
    ELSE
      NEW."onboardingCompleted" := OLD."onboardingCompleted";
      NEW."onboardingStep" := OLD."onboardingStep";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_01_protect_user_onboarding_flags_v2
  ON public.users;
CREATE TRIGGER trg_01_protect_user_onboarding_flags_v2
BEFORE INSERT OR UPDATE
ON public.users
FOR EACH ROW
EXECUTE FUNCTION private.protect_user_onboarding_flags_v2();

REVOKE ALL ON FUNCTION private.protect_user_onboarding_flags_v2()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.protect_user_onboarding_flags_v2()
  TO service_role;

-- Marketplace Seller onboarding completion is intentionally separate from
-- commercial activation. The latter remains sellerStatus/Stripe/admin-policy
-- governed by the existing server activation boundary.
CREATE OR REPLACE FUNCTION public.sync_seller_onboarding_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (
    NEW."sellerType" IN ('individual', 'sole_trader', 'company') AND
    NEW."profileCompleted" IS TRUE AND
    NEW."storeCreated" IS TRUE AND
    NEW."firstProductCreated" IS TRUE AND
    COALESCE(NEW."sellerStatus", 'draft') <> 'suspended'
  ) THEN
    UPDATE public.users
    SET "onboardingCompleted" = true,
        "onboardingStep" = 8
    WHERE id = NEW."userId"
      AND (
        "onboardingCompleted" IS DISTINCT FROM true OR
        "onboardingStep" IS DISTINCT FROM 8
      );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_seller_onboarding_completed()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_seller_onboarding_completed()
  TO service_role;

-- Reconcile only factual legacy projections. Existing active sellers are not
-- demoted and sellerStatus is not changed here.
UPDATE public.seller_profiles sp
SET "storeCreated" = true
WHERE "storeCreated" IS DISTINCT FROM true
  AND EXISTS (
    SELECT 1
    FROM public.seller_stores ss
    WHERE ss."userId" = sp."userId"
      AND NULLIF(BTRIM(ss."storeName"), '') IS NOT NULL
  );

UPDATE public.seller_profiles sp
SET "firstProductCreated" = true
WHERE "firstProductCreated" IS DISTINCT FROM true
  AND EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p."sellerId" = sp."userId"
  );

DO $$
BEGIN
  IF has_function_privilege(
    'anon',
    'private.protect_seller_onboarding_flags_v2()',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'private.protect_seller_onboarding_flags_v2()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION '672 onboarding protection failed: seller flag trigger helper exposed to client role';
  END IF;

  IF has_function_privilege(
    'anon',
    'private.protect_user_onboarding_flags_v2()',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'private.protect_user_onboarding_flags_v2()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION '672 onboarding protection failed: user flag trigger helper exposed to client role';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.sync_seller_onboarding_completed()',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.sync_seller_onboarding_completed()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION '672 onboarding protection failed: completion trigger helper exposed to client role';
  END IF;
END $$;;
