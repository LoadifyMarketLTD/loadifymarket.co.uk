-- 663_account_capabilities_foundation.sql
-- Loadify Market — Stage 2 identity foundation.
--
-- PURPOSE
--   Preserve one auth identity while allowing an ordinary marketplace account
--   to hold Buyer and Marketplace Seller capabilities at the same time.
--
-- INVARIANTS
--   * public.users.isActive remains the global account-suspension authority.
--   * admin remains a privileged public.users.role and is never self-granted.
--   * Marketplace Seller capability is server-governed; seller_profiles
--     existence alone is never authorization.
--   * sellerStatus remains the separate commercial-readiness lifecycle.
--   * Supplier Partner / Fulfilment Provider are NOT account capabilities here.
--   * Existing users.role is retained for compatibility/default routing.
--
-- This migration is additive and idempotent. It does not enable Supplier
-- Commerce and does not alter any Supplier Commerce feature control.

CREATE TABLE IF NOT EXISTS public.account_capabilities (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  capability text NOT NULL,
  grant_source text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, capability),
  CONSTRAINT account_capabilities_capability_check
    CHECK (capability IN ('buyer', 'seller')),
  CONSTRAINT account_capabilities_grant_source_check
    CHECK (length(BTRIM(grant_source)) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS account_capabilities_active_lookup_idx
  ON public.account_capabilities(user_id, capability)
  WHERE revoked_at IS NULL;

ALTER TABLE public.account_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_capabilities_select_own_or_admin
  ON public.account_capabilities;
CREATE POLICY account_capabilities_select_own_or_admin
  ON public.account_capabilities
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- No authenticated INSERT / UPDATE / DELETE policy is intentionally created.
-- Capability grants are a trusted-server concern. Explicit grants keep the
-- privilege boundary readable even on environments with altered default grants.
REVOKE ALL ON TABLE public.account_capabilities FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.account_capabilities TO authenticated;
GRANT ALL ON TABLE public.account_capabilities TO service_role;

COMMENT ON TABLE public.account_capabilities IS
  'Server-governed ordinary commerce capabilities. Buyer and Seller may coexist; Admin remains public.users.role.';
COMMENT ON COLUMN public.account_capabilities.capability IS
  'Ordinary commerce capability only: buyer or seller. Supplier relationships are represented elsewhere.';

-- ---------------------------------------------------------------------------
-- Live DB capability checks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_account_capability(p_capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_capabilities ac
    JOIN public.users u ON u.id = ac.user_id
    WHERE ac.user_id = (SELECT auth.uid())
      AND ac.capability = p_capability
      AND ac.revoked_at IS NULL
      AND u."isActive" = TRUE
      -- Admin authority stays isolated from ordinary Buyer/Seller capabilities.
      AND u.role <> 'admin'
      AND p_capability IN ('buyer', 'seller')
  );
$$;

REVOKE ALL ON FUNCTION public.has_account_capability(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_account_capability(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_account_capability(text) IS
  'Live DB authorization helper for ordinary buyer/seller capability. Requires active non-admin account and non-revoked server grant.';

-- Definitive seller-role helper now consumes the server-governed capability
-- rather than the overloaded compatibility users.role field.
CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_account_capability('seller');
$$;

REVOKE ALL ON FUNCTION public.is_seller() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_seller() TO authenticated, service_role;

-- Checkout readiness must also require the server-governed Seller capability.
-- It remains anonymous-readable through the existing SECURITY DEFINER boundary,
-- but reveals only a boolean readiness answer, not capability rows.
CREATE OR REPLACE FUNCTION public.is_seller_checkout_ready(p_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_profiles sp
    JOIN public.users u ON u.id = sp."userId"
    JOIN public.account_capabilities ac
      ON ac.user_id = u.id
     AND ac.capability = 'seller'
     AND ac.revoked_at IS NULL
    WHERE sp."userId" = p_seller_id
      AND u."isActive" = TRUE
      AND u.role <> 'admin'
      AND sp."sellerStatus" = 'active'
      AND sp."stripeConnectStatus" = 'active'
      AND COALESCE(sp."isPaused", false) = false
  );
$$;

-- ---------------------------------------------------------------------------
-- Compatibility provisioning
-- ---------------------------------------------------------------------------

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
  END IF;

  -- role='admin' intentionally provisions no ordinary capability.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_legacy_role_to_account_capabilities
  ON public.users;
CREATE TRIGGER trg_sync_legacy_role_to_account_capabilities
AFTER INSERT OR UPDATE OF role
ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_legacy_role_to_account_capabilities();

-- Existing Buyer accounts get Buyer capability.
INSERT INTO public.account_capabilities (
  user_id, capability, grant_source, granted_at
)
SELECT u.id, 'buyer', 'migration_backfill', now()
FROM public.users u
WHERE u.role IN ('buyer', 'seller')
ON CONFLICT (user_id, capability) DO NOTHING;

-- Existing Seller accounts additionally get Seller capability. Do not infer
-- this from seller_profiles because historical role switching may have left a
-- stale profile behind for an account whose current role is Buyer.
INSERT INTO public.account_capabilities (
  user_id, capability, grant_source, granted_at
)
SELECT u.id, 'seller', 'migration_backfill', now()
FROM public.users u
WHERE u.role = 'seller'
ON CONFLICT (user_id, capability) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Trusted, atomic Buyer -> Marketplace Seller activation start
-- ---------------------------------------------------------------------------
-- This function is intentionally callable only by service_role. The Netlify
-- boundary authenticates the user and passes only the authenticated actor id.
-- The DB function then re-checks the live account and performs capability +
-- relationship initialization in one transaction. Existing Seller lifecycle
-- state is never reset or demoted.

CREATE OR REPLACE FUNCTION public.server_start_seller_activation_v1(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account public.users%ROWTYPE;
  v_existing_status text;
  v_created_profile boolean := false;
BEGIN
  SELECT *
  INTO v_account
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_account."isActive" IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Active account required' USING ERRCODE = '42501';
  END IF;

  IF v_account.role = 'admin' THEN
    RAISE EXCEPTION 'Admin cannot enter Seller activation through self-service' USING ERRCODE = '42501';
  END IF;

  SELECT sp."sellerStatus"
  INTO v_existing_status
  FROM public.seller_profiles sp
  WHERE sp."userId" = p_user_id;

  INSERT INTO public.account_capabilities (
    user_id, capability, grant_source, granted_at, revoked_at
  ) VALUES
    (p_user_id, 'buyer', 'seller_activation', now(), NULL),
    (p_user_id, 'seller', 'seller_activation', now(), NULL)
  ON CONFLICT (user_id, capability) DO UPDATE
    SET revoked_at = NULL;

  IF v_existing_status IS NULL THEN
    INSERT INTO public.seller_profiles ("userId", "sellerStatus", "isApproved")
    VALUES (p_user_id, 'draft', false)
    ON CONFLICT ("userId") DO NOTHING;
    v_created_profile := true;
    v_existing_status := 'draft';
  END IF;

  INSERT INTO public.seller_stores ("userId", "isActive")
  VALUES (p_user_id, false)
  ON CONFLICT ("userId") DO NOTHING;

  -- Seller remains the compatibility/default context while legacy route/RLS
  -- consumers are migrated. Buyer capability is preserved independently.
  IF v_account.role <> 'seller' THEN
    UPDATE public.users
    SET role = 'seller',
        "onboardingCompleted" = false,
        "onboardingStep" = 1
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'previousRole', v_account.role,
    'role', 'seller',
    'sellerStatus', COALESCE(v_existing_status, 'draft'),
    'createdSellerProfile', v_created_profile
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_start_seller_activation_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_start_seller_activation_v1(uuid) TO service_role;

COMMENT ON FUNCTION public.server_start_seller_activation_v1(uuid) IS
  'Trusted idempotent Buyer-to-Seller activation start. Preserves Buyer capability and existing Seller lifecycle; never callable directly by authenticated clients.';

-- ---------------------------------------------------------------------------
-- Verification assertions — fail migration if a core invariant is broken.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.role = 'buyer'
      AND NOT EXISTS (
        SELECT 1
        FROM public.account_capabilities ac
        WHERE ac.user_id = u.id
          AND ac.capability = 'buyer'
          AND ac.revoked_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION '663 capability backfill failed: Buyer without Buyer capability';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.role = 'seller'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.account_capabilities ac
          WHERE ac.user_id = u.id
            AND ac.capability = 'buyer'
            AND ac.revoked_at IS NULL
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.account_capabilities ac
          WHERE ac.user_id = u.id
            AND ac.capability = 'seller'
            AND ac.revoked_at IS NULL
        )
      )
  ) THEN
    RAISE EXCEPTION '663 capability backfill failed: Seller missing Buyer/Seller capability';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.account_capabilities ac ON ac.user_id = u.id
    WHERE u.role = 'admin'
      AND ac.grant_source = 'migration_backfill'
  ) THEN
    RAISE EXCEPTION '663 capability backfill failed: Admin received ordinary capability';
  END IF;
END $$;
