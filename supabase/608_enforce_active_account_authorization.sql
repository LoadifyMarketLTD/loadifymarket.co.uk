-- 608_enforce_active_account_authorization.sql
--
-- Checkpoint A account-suspension invariant:
--   * public.users.isActive is the database source of truth for whether an
--     authenticated account may access account-scoped/private marketplace data;
--   * stale JWT role claims must never bypass an inactive database account;
--   * public browse/read surfaces remain available, but marketplace writes from
--     an inactive authenticated account fail closed under RLS.
--
-- Supabase Auth suspension is handled by the canonical server boundary. This
-- migration is the immediate database backstop for already-issued JWTs.

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u."isActive" = TRUE
  );
$$;

COMMENT ON FUNCTION public.is_active_user() IS
  'Authorization guard: true only when the authenticated public.users row is active.';

-- Never trust a stale app_metadata role claim ahead of the live database row.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u."isActive" = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'seller'
      AND u."isActive" = TRUE
  );
$$;

-- id / role / isActive are account-control columns. They must only be changed
-- through a trusted server boundary running as service_role. Historical users
-- RLS permits an authenticated owner to UPDATE their own row and permits active
-- admins to UPDATE other rows; without this trigger either caller could mutate
-- isActive directly and bypass the Auth-ban / push-cleanup contract.
--
-- current_user is the effective PostgreSQL API role (authenticated/service_role),
-- not application JWT metadata. Direct SQL maintenance normally runs as postgres
-- and the service_role used by canonical server handlers remains permitted.
CREATE OR REPLACE FUNCTION public.enforce_user_account_control_boundary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW."isActive" IS DISTINCT FROM OLD."isActive"
     ) THEN
    RAISE EXCEPTION 'Account control columns are server-managed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_account_control_boundary ON public.users;
CREATE TRIGGER enforce_user_account_control_boundary
BEFORE UPDATE OF id, role, "isActive" ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_account_control_boundary();

-- Keep the denormalised seller lifecycle state fail-closed with the canonical
-- account state. The user row and this seller-status update execute in the same
-- database transaction, so a server-side suspension cannot leave an inactive
-- seller looking commercially active because a later application write failed.
CREATE OR REPLACE FUNCTION public.sync_seller_suspension_from_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'seller' AND NEW."isActive" IS NOT TRUE THEN
    UPDATE public.seller_profiles
    SET "sellerStatus" = 'suspended'
    WHERE "userId" = NEW.id
      AND "sellerStatus" IS DISTINCT FROM 'suspended';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_seller_suspension_from_user_activity ON public.users;
CREATE TRIGGER sync_seller_suspension_from_user_activity
AFTER INSERT OR UPDATE OF role, "isActive" ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_seller_suspension_from_user_activity();

-- Reconcile any inactive seller rows that pre-date the trigger.
UPDATE public.seller_profiles sp
SET "sellerStatus" = 'suspended'
FROM public.users u
WHERE u.id = sp."userId"
  AND u.role = 'seller'
  AND u."isActive" IS NOT TRUE
  AND sp."sellerStatus" IS DISTINCT FROM 'suspended';

-- Account-scoped/private tables: an inactive authenticated account may neither
-- read nor mutate its private/commercial state through PostgREST. service_role
-- remains outside this authenticated-role policy and canonical server handlers
-- therefore retain controlled recovery/admin access.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'users',
    'buyer_profiles',
    'seller_profiles',
    'carts',
    'cart_items',
    'wishlists',
    'saved_searches',
    'recently_viewed',
    'conversations',
    'messages',
    'notification_settings',
    'notifications',
    'csp_reports',
    'error_reports',
    'orders',
    'order_items',
    'order_messages',
    'order_events',
    'shipments',
    'shipment_events',
    'returns',
    'disputes',
    'dispute_messages',
    'payout_requests',
    'payouts',
    'seller_balance',
    'seller_balance_adjustments',
    'seller_verifications',
    'reported_listings',
    'push_tokens',
    'payment_sessions',
    'offers',
    'product_offers',
    'coupon_usage',
    'rfq_requests',
    'rfq_responses',
    'service_requests',
    'service_quotes'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      EXECUTE format('DROP POLICY IF EXISTS active_account_access ON public.%I', v_table);
      EXECUTE format(
        'CREATE POLICY active_account_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user())',
        v_table
      );
    END IF;
  END LOOP;
END
$$;

-- public.users is not an account-deletion API. Historical users_delete allows an
-- active admin to DELETE another users row directly, which would bypass Auth
-- deletion/anonymisation/audit and cascade dependent public data. Force every
-- authenticated deletion through the trusted server-side account process.
DROP POLICY IF EXISTS account_control_delete_server_only ON public.users;
CREATE POLICY account_control_delete_server_only
ON public.users
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (FALSE);

-- Public marketplace content remains readable while signed in, even for an
-- account that has been suspended. Only authenticated writes are restricted.
-- This preserves browse/support recovery while preventing a stale JWT from
-- changing listings, services, reviews, questions, promotions or coupons.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'seller_stores',
    'products',
    'product_shipping',
    'product_questions',
    'reviews',
    'promoted_listings',
    'coupons',
    'services',
    'service_attributes',
    'service_media'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      EXECUTE format('DROP POLICY IF EXISTS active_account_insert ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS active_account_update ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS active_account_delete ON public.%I', v_table);

      EXECUTE format(
        'CREATE POLICY active_account_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_active_user())',
        v_table
      );
      EXECUTE format(
        'CREATE POLICY active_account_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user())',
        v_table
      );
      EXECUTE format(
        'CREATE POLICY active_account_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_active_user())',
        v_table
      );
    END IF;
  END LOOP;
END
$$;
