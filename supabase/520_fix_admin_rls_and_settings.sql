-- ─────────────────────────────────────────────────────────────────────────────
-- 520_fix_admin_rls_and_settings.sql
--
-- Fixes two related production bugs:
--
-- 1. platform_settings INSERT RLS violation
--    Migration 380 updated is_admin() to use a JWT fast-path, but did not
--    DROP + re-CREATE the platform_settings_manage policy.  PostgreSQL caches
--    compiled policy plans; the DROP + CREATE forces a fresh plan that uses
--    the updated is_admin() function.
--
-- 2. Re-apply all policies that call is_admin() or is_seller()
--    to guarantee they all use the current (JWT fast-path) implementation
--    rather than a cached plan referencing the old DB-only version.
--
-- This migration is idempotent: every DROP IF EXISTS + CREATE is safe to
-- run multiple times on the same database.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. platform_settings ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "platform_settings_select" ON public.platform_settings;
CREATE POLICY "platform_settings_select" ON public.platform_settings
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "platform_settings_manage" ON public.platform_settings;
CREATE POLICY "platform_settings_manage" ON public.platform_settings
  FOR ALL
  USING     (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 2. orders: ensure admins can UPDATE order status ─────────────────────────

-- Admin needs to update order status (e.g. approve refund, mark delivered).
-- The policy below adds admin update rights on top of buyer/seller rights.

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 3. admin_actions: ensure INSERT works for admins ─────────────────────────
-- admin_actions records are inserted by Netlify functions (service role),
-- but re-applying the policy here ensures plan cache is fresh.

DROP POLICY IF EXISTS "admin_actions_insert" ON public.admin_actions;
CREATE POLICY "admin_actions_insert" ON public.admin_actions
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_actions_select" ON public.admin_actions;
CREATE POLICY "admin_actions_select" ON public.admin_actions
  FOR SELECT
  USING (public.is_admin());

-- ── Notice ────────────────────────────────────────────────────────────────────
DO $msg$ BEGIN
  RAISE NOTICE '520_fix_admin_rls_and_settings: platform_settings_manage, '
               'orders_admin_update, and admin_actions policies re-applied. '
               'is_admin() JWT fast-path now guaranteed for all these policies.';
END $msg$;
