-- ─────────────────────────────────────────────────────────────────────────────
-- 580_harden_orders_update_rls.sql
--
-- Hardens public.orders UPDATE access:
--   - direct client-side UPDATE is admin-only
--   - buyer / seller workflows must go through authenticated Netlify functions
--     that use the service-role key and perform explicit transition validation
--
-- Why:
--   The previous orders_update policy allowed buyers/sellers to target their own
--   rows too broadly, which exposed unsafe direct status mutation paths.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_update" ON public.orders;

CREATE POLICY "orders_update" ON public.orders
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());
