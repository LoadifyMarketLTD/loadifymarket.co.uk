-- ================================================================
-- 80_fix_rls_security_gaps.sql
-- Loadify Market — Security fixes for over-permissive RLS policies
-- ================================================================
-- Run in Supabase SQL Editor.
--
-- ISSUES FIXED:
--
-- 1. order_items_insert: The original policy used WITH CHECK (TRUE),
--    allowing any authenticated user to INSERT order items for any order.
--    A malicious authenticated user could forge order items for orders
--    they do not own.
--    Fix: restrict INSERT to the buyer or seller of the parent order,
--    or to admin/owner roles. Webhook writes use the service role key
--    which bypasses RLS, so legitimate inserts are unaffected.
--
-- 2. payment_sessions_write: The original policy used USING (TRUE) WITH
--    CHECK (TRUE) for ALL operations (INSERT/UPDATE/DELETE), meaning any
--    authenticated user could create, modify, or delete payment session
--    records. This could allow a bad actor to:
--      • Insert a fake "completed" payment session to falsely legitimise
--        an unpaid order.
--      • Mutate or delete existing session records.
--    Fix: restrict ALL write operations to admin/owner roles only. The
--    webhook's service role key bypasses RLS and handles the legitimate
--    inserts.
-- ================================================================

-- ── 1. Tighten order_items INSERT ────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_insert" ON order_items;

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT
  WITH CHECK (
    -- Service-role writes (from stripe-webhook) bypass RLS entirely.
    -- For anon/authenticated callers, only the buyer or seller of the
    -- parent order may insert items, or an admin/owner.
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = "orderId"
        AND (o."buyerId" = auth.uid() OR o."sellerId" = auth.uid())
    )
    OR is_admin()
  );

-- ── 2. Tighten payment_sessions writes ───────────────────────────────────────
-- Remove the blanket "everyone can write" policy.
DROP POLICY IF EXISTS "payment_sessions_write" ON payment_sessions;

-- Admin/owner access (needed for back-office operations)
CREATE POLICY "payment_sessions_admin_write" ON payment_sessions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
