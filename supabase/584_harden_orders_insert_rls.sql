-- ─────────────────────────────────────────────────────────────────────────────
-- 584_harden_orders_insert_rls.sql
--
-- Harden public.orders INSERT access to admin-only.
--
-- Why:
--   The previous orders_insert policy allowed any authenticated buyer to INSERT
--   a row into orders directly from the browser with any status value (e.g.
--   status='paid', status='completed').  This is a privilege-escalation vector:
--   a buyer could fabricate a paid/completed order without going through Stripe.
--
-- Reality of order creation:
--   • Offer-flow: accept_offer() SECURITY DEFINER RPC → uses service role internally
--   • Direct checkout: stripe-webhook Netlify function → SUPABASE_SERVICE_ROLE_KEY
--   • RFQ flow: rfq.ts Netlify function → SUPABASE_SERVICE_ROLE_KEY
--   All three paths use the service-role key which bypasses RLS entirely.
--   There is NO legitimate path where a buyer inserts an orders row from the browser.
--
-- Effect:
--   Direct client-side INSERT on orders is blocked for all non-admin callers.
--   Service-role callers (Netlify functions) are unaffected (RLS is bypassed).
--   Admin dashboard order management is unaffected.
--
-- Idempotent (DROP IF EXISTS + CREATE).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_insert" ON public.orders;

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT
  WITH CHECK (is_admin());

DO $$ BEGIN
  RAISE NOTICE '584_harden_orders_insert_rls: orders INSERT now restricted to admin (service-role callers are unaffected).';
END $$;
