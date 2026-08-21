-- 664_account_capabilities_admin_isolation.sql
-- Stage 2 hardening: Admin must never retain an active ordinary commerce
-- capability that can silently reactivate after a later role transition.
--
-- Depends on: 663_account_capabilities_foundation.sql

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
      SET revoked_at = NULL;
  ELSIF NEW.role = 'seller' THEN
    -- Every normal Seller account is also allowed to participate as a Buyer
    -- under the same identity.
    INSERT INTO public.account_capabilities (
      user_id, capability, grant_source, granted_at, revoked_at
    ) VALUES
      (NEW.id, 'buyer', 'legacy_role_sync', now(), NULL),
      (NEW.id, 'seller', 'legacy_role_sync', now(), NULL)
    ON CONFLICT (user_id, capability) DO UPDATE
      SET revoked_at = NULL;
  ELSIF NEW.role = 'admin' THEN
    -- Admin is an isolated privileged system role, not an additive ordinary
    -- commerce capability. Revoke any Buyer/Seller grants immediately rather
    -- than leaving dormant grants that could reactivate on a later demotion.
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

-- Reconcile any Admin rows that existed before this hardening migration or
-- were promoted while 663 was being validated on an isolated environment.
UPDATE public.account_capabilities ac
SET revoked_at = COALESCE(ac.revoked_at, now())
FROM public.users u
WHERE u.id = ac.user_id
  AND u.role = 'admin'
  AND ac.revoked_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.account_capabilities ac ON ac.user_id = u.id
    WHERE u.role = 'admin'
      AND ac.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION '664 admin isolation failed: Admin retains active ordinary capability';
  END IF;
END $$;
