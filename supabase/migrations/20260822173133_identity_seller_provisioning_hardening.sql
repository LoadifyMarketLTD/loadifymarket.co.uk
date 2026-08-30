-- 670_identity_seller_provisioning_hardening.sql
-- Stage 2 hardening for ordinary commerce capability isolation and Seller
-- provisioning readiness.
--
-- Depends on: 669_account_capabilities_foundation.sql
--
-- INVARIANTS
--   * Admin never retains an active Buyer/Seller capability.
--   * A newly provisioned Seller relationship starts in sellerStatus='draft'.
--   * A newly provisioned seller_stores row starts isActive=false.
--   * Existing commercially-active Sellers are not demoted by this migration.
--   * Inactive / non-Seller / non-active-lifecycle accounts cannot retain an
--     active seller store merely because historical schema defaults were true.

CREATE OR REPLACE FUNCTION public.sync_legacy_role_to_account_capabilities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'buyer' THEN
    INSERT INTO public.account_capabilities (
      user_id, capability, grant_source, granted_at, revoked_at
    ) VALUES (
      NEW.id, 'buyer', 'legacy_role_sync', now(), NULL
    )
    ON CONFLICT (user_id, capability) DO UPDATE
      SET revoked_at = NULL,
          grant_source = EXCLUDED.grant_source,
          granted_at = EXCLUDED.granted_at;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO public.account_capabilities (
      user_id, capability, grant_source, granted_at, revoked_at
    ) VALUES
      (NEW.id, 'buyer', 'legacy_role_sync', now(), NULL),
      (NEW.id, 'seller', 'legacy_role_sync', now(), NULL)
    ON CONFLICT (user_id, capability) DO UPDATE
      SET revoked_at = NULL,
          grant_source = EXCLUDED.grant_source,
          granted_at = EXCLUDED.granted_at;
  ELSIF NEW.role = 'admin' THEN
    UPDATE public.account_capabilities
    SET revoked_at = COALESCE(revoked_at, now())
    WHERE user_id = NEW.id
      AND revoked_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_legacy_role_to_account_capabilities() IS
  'Compatibility projection for buyer/seller capabilities. Entering Admin explicitly revokes all ordinary commerce capabilities.';

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'buyer' THEN
    INSERT INTO public.buyer_profiles ("userId")
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO public.seller_profiles ("userId", "sellerStatus", "isApproved")
    VALUES (NEW.id, 'draft', false)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.seller_stores ("userId", "isActive")
    VALUES (NEW.id, false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_profile() IS
  'Provision ordinary Buyer/Seller relationship rows. New Sellers start draft with an inactive store; Admin receives no commerce profile through this trigger.';

UPDATE public.account_capabilities ac
SET revoked_at = COALESCE(ac.revoked_at, now())
FROM public.users u
WHERE u.id = ac.user_id
  AND u.role = 'admin'
  AND ac.revoked_at IS NULL;

UPDATE public.seller_stores ss
SET "isActive" = false
FROM public.users u
LEFT JOIN public.seller_profiles sp ON sp."userId" = u.id
WHERE ss."userId" = u.id
  AND ss."isActive" = true
  AND (
    u."isActive" IS DISTINCT FROM true
    OR u.role <> 'seller'
    OR COALESCE(sp."sellerStatus", 'draft') <> 'active'
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.account_capabilities ac ON ac.user_id = u.id
    WHERE u.role = 'admin'
      AND ac.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION '670 admin isolation failed: Admin retains active ordinary capability';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.seller_stores ss
    JOIN public.users u ON u.id = ss."userId"
    LEFT JOIN public.seller_profiles sp ON sp."userId" = u.id
    WHERE ss."isActive" = true
      AND (
        u."isActive" IS DISTINCT FROM true
        OR u.role <> 'seller'
        OR COALESCE(sp."sellerStatus", 'draft') <> 'active'
      )
  ) THEN
    RAISE EXCEPTION '670 seller provisioning failed: non-ready Seller store remains active';
  END IF;
END $$;;
