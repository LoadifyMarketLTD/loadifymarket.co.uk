-- 679_audit_e2e_rate_limit_and_privilege_hardening.sql
--
-- E2E audit remediation (2026-08-23):
--   1. Make all shared Netlify rate-limit counter consumption atomic.
--   2. Remove duplicate quoted updatedAt triggers while retaining the canonical
--      unquoted/lower-case trigger created by the consolidated trigger repair.
--   3. Close direct client execution of write-capable SECURITY DEFINER helpers
--      that are not application RPC boundaries.
--
-- This migration does NOT enable Supplier Commerce controls and does not alter
-- Auth configuration, marketplace pricing, payments, orders, or UI state.

-- ---------------------------------------------------------------------------
-- 1. Atomic shared rate-limit counter
-- ---------------------------------------------------------------------------
-- Every table in this allow-list has the canonical columns:
--   identifier text, "windowEnd" timestamptz, attempts int
-- and UNIQUE(identifier, "windowEnd").
--
-- INSERT ... ON CONFLICT DO UPDATE is a single PostgreSQL statement, removing
-- both the concurrent first-insert unique-key race and the lost-update race of
-- SELECT -> UPDATE attempts = old + 1.
CREATE OR REPLACE FUNCTION public.increment_rate_limit_counter(
  p_table_name text,
  p_identifier text,
  p_window_end timestamptz,
  p_max_attempts integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempts integer;
  v_allowed_tables constant text[] := ARRAY[
    'admin_sellers_rate_limits',
    'checkout_offer_rate_limits',
    'checkout_rate_limits',
    'connect_onboard_rate_limits',
    'conversation_offer_rate_limits',
    'create_checkout_rate_limits',
    'create_payment_intent_rate_limits',
    'create_product_rate_limits',
    'create_refund_rate_limits',
    'create_shipment_rate_limits',
    'csp_report_rate_limits',
    'delete_account_rate_limits',
    'email_rate_limits',
    'error_report_rate_limits',
    'offer_accept_rate_limits',
    'offer_cancel_rate_limits',
    'offer_counter_rate_limits',
    'offer_decline_rate_limits',
    'push_token_rate_limits',
    'register_rate_limits',
    'resend_verification_rate_limits',
    'rfq_rate_limits',
    'seller_order_status_rate_limits',
    'send_message_rate_limits',
    'track_shipment_rate_limits',
    'update_product_rate_limits',
    'update_shipment_status_rate_limits',
    'upload_proof_rate_limits'
  ];
BEGIN
  IF p_table_name IS NULL OR NOT (p_table_name = ANY (v_allowed_tables)) THEN
    RAISE EXCEPTION 'increment_rate_limit_counter: unsupported rate-limit table %', p_table_name
      USING ERRCODE = '22023';
  END IF;

  IF p_identifier IS NULL OR length(p_identifier) = 0 THEN
    RAISE EXCEPTION 'increment_rate_limit_counter: identifier is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_window_end IS NULL THEN
    RAISE EXCEPTION 'increment_rate_limit_counter: window end is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_max_attempts IS NULL OR p_max_attempts < 1 THEN
    RAISE EXCEPTION 'increment_rate_limit_counter: max attempts must be positive'
      USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I AS rl (identifier, "windowEnd", attempts)
     VALUES ($1, $2, 1)
     ON CONFLICT (identifier, "windowEnd")
     DO UPDATE SET attempts = LEAST(rl.attempts + 1, $3 + 1)
     RETURNING attempts',
    p_table_name
  )
  INTO v_attempts
  USING p_identifier, p_window_end, p_max_attempts;

  RETURN v_attempts;
END;
$$;

COMMENT ON FUNCTION public.increment_rate_limit_counter(text, text, timestamptz, integer) IS
  'Service-role-only atomic rate-limit counter used by Netlify server boundaries.';

REVOKE ALL ON FUNCTION public.increment_rate_limit_counter(text, text, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_rate_limit_counter(text, text, timestamptz, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_rate_limit_counter(text, text, timestamptz, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit_counter(text, text, timestamptz, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Duplicate updatedAt trigger cleanup
-- ---------------------------------------------------------------------------
-- The canonical consolidated trigger repair uses unquoted trigger names, which
-- PostgreSQL folds to lower case. Migration 20 additionally created quoted
-- camel-case variants. Both copies execute the same update_updated_at_column()
-- BEFORE UPDATE function, so retaining only the lower-case trigger removes
-- duplicate trigger execution without changing row semantics.
DROP TRIGGER IF EXISTS "trg_buyer_profiles_updatedAt" ON public.buyer_profiles;
DROP TRIGGER IF EXISTS "trg_seller_profiles_updatedAt" ON public.seller_profiles;
DROP TRIGGER IF EXISTS "trg_seller_stores_updatedAt" ON public.seller_stores;
DROP TRIGGER IF EXISTS "trg_users_updatedAt" ON public.users;

-- ---------------------------------------------------------------------------
-- 3. Write-capable SECURITY DEFINER privilege closure
-- ---------------------------------------------------------------------------
-- Product-view analytics is a write operation, not a client authorization
-- predicate. No repository runtime call-site uses the direct PostgREST RPC.
-- Keep it available to trusted server/database execution only so anonymous or
-- ordinary authenticated clients cannot inflate products.views or analytics.
REVOKE ALL ON FUNCTION public.track_product_view(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_product_view(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.track_product_view(uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.track_product_view(uuid, uuid, text) TO service_role;

-- Trigger functions are not application RPC boundaries. Migration 608 created
-- this function after the earlier execute-privilege closure, so explicitly
-- remove inherited PUBLIC/client EXECUTE while leaving trigger execution and
-- service-role maintenance available.
REVOKE ALL ON FUNCTION public.sync_seller_suspension_from_user_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_seller_suspension_from_user_activity() FROM anon;
REVOKE ALL ON FUNCTION public.sync_seller_suspension_from_user_activity() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_seller_suspension_from_user_activity() TO service_role;
