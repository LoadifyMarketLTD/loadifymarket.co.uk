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
    WHERE u.id = (SELECT auth.uid())
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
    WHERE u.id = (SELECT auth.uid())
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
    WHERE u.id = (SELECT auth.uid())
      AND u.role = 'seller'
      AND u."isActive" = TRUE
  );
$$;

-- Fresh rebuilds must preserve the live-safe signup rule. Supabase user_metadata
-- is caller-controlled during sign-up, so it may select the ordinary marketplace
-- roles buyer/seller but can never mint an admin account. Admin is accepted only
-- from raw_app_meta_data, which is server-controlled.
--
-- Historical migration 455 contains an older definition that also accepted
-- raw_user_meta_data.role='admin'. Replacing it here reconciles the repository
-- with the effective live contract and prevents a fresh rebuild from restoring
-- that privilege-escalation path.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, "isEmailVerified")
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN (NEW.raw_app_meta_data->>'role') IN ('admin', 'seller', 'buyer')
        THEN (NEW.raw_app_meta_data->>'role')
      WHEN (NEW.raw_user_meta_data->>'role') IN ('seller', 'buyer')
        THEN (NEW.raw_user_meta_data->>'role')
      ELSE 'buyer'
    END,
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_auth_user: non-fatal error for auth user % (email: %): %',
    NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Creates public.users on Auth signup; user_metadata may choose buyer/seller but never admin.';

-- id / isActive are account-suspension control columns. They must only be
-- changed through a trusted server boundary running as service_role. Historical
-- users RLS permits an authenticated owner to UPDATE their own row and permits
-- active admins to UPDATE other rows; without this trigger either caller could
-- mutate isActive directly and bypass the Auth-ban / push-cleanup contract.
-- Role changes remain governed by the dedicated users_update role-escalation
-- policy introduced by migration 410 so existing Admin Users role management is
-- not broken by this account-suspension migration.
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
       OR NEW."isActive" IS DISTINCT FROM OLD."isActive"
     ) THEN
    RAISE EXCEPTION 'Account suspension control columns are server-managed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_account_control_boundary ON public.users;
CREATE TRIGGER enforce_user_account_control_boundary
BEFORE UPDATE OF id, "isActive" ON public.users
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
-- therefore retain controlled recovery/admin access. Wrapping the stable helper
-- in SELECT lets PostgreSQL cache it as an initPlan per statement instead of
-- evaluating it once per row.
--
-- Support recovery remains available through the validated server-side public
-- support-ticket boundary; stale authenticated sessions do not retain direct
-- PostgREST access to private support tickets or their message history.
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
    'support_tickets',
    'support_ticket_messages',
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
        'CREATE POLICY active_account_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.is_active_user())) WITH CHECK ((SELECT public.is_active_user()))',
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
        'CREATE POLICY active_account_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_active_user()))',
        v_table
      );
      EXECUTE format(
        'CREATE POLICY active_account_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT public.is_active_user())) WITH CHECK ((SELECT public.is_active_user()))',
        v_table
      );
      EXECUTE format(
        'CREATE POLICY active_account_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT public.is_active_user()))',
        v_table
      );
    END IF;
  END LOOP;
END
$$;
