-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 560: Fix RLS on shipping tables
--
-- Supabase Advisor (2026-05-12) flagged three CRITICAL security issues:
--
--  1. public.product_shipping  — has RLS policies but RLS is NOT enabled.
--  2. public.shipping_methods  — RLS not enabled (table is public).
--  3. public.shipping_rates    — RLS not enabled (table is public).
--
-- Root cause: the original migration (40_shipping_methods.sql) issued
-- ALTER TABLE … ENABLE ROW LEVEL SECURITY, but subsequent DB resets or
-- partial re-runs left the flag unset while policies were still present.
--
-- This migration is idempotent:
--   • ENABLE ROW LEVEL SECURITY is a no-op if already enabled.
--   • All policies are dropped and re-created, so duplicate-name errors
--     cannot occur.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. shipping_methods ───────────────────────────────────────────────────────
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

-- Anyone can read shipping methods (used at checkout and product listing).
DROP POLICY IF EXISTS shipping_methods_public_read ON public.shipping_methods;
CREATE POLICY shipping_methods_public_read
  ON public.shipping_methods
  FOR SELECT
  USING (TRUE);

-- Only admins may create / modify / delete shipping methods.
DROP POLICY IF EXISTS shipping_methods_admin_write ON public.shipping_methods;
CREATE POLICY shipping_methods_admin_write
  ON public.shipping_methods
  FOR ALL
  TO authenticated
  USING     (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 2. shipping_rates ─────────────────────────────────────────────────────────
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can read shipping rates (displayed to buyers at checkout).
DROP POLICY IF EXISTS shipping_rates_public_read ON public.shipping_rates;
CREATE POLICY shipping_rates_public_read
  ON public.shipping_rates
  FOR SELECT
  USING (TRUE);

-- Only admins may create / modify / delete shipping rates.
DROP POLICY IF EXISTS shipping_rates_admin_write ON public.shipping_rates;
CREATE POLICY shipping_rates_admin_write
  ON public.shipping_rates
  FOR ALL
  TO authenticated
  USING     (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 3. product_shipping ───────────────────────────────────────────────────────
-- Policies already exist (confirmed by Advisor: product_shipping_auth_delete,
-- product_shipping_auth_insert, product_shipping_auth_update) but RLS itself
-- was not enabled, rendering them inactive.
ALTER TABLE public.product_shipping ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all product-shipping associations.
DROP POLICY IF EXISTS product_shipping_auth_read ON public.product_shipping;
CREATE POLICY product_shipping_auth_read
  ON public.product_shipping
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only the product owner (or admin) may insert a new shipping association.
DROP POLICY IF EXISTS product_shipping_auth_insert ON public.product_shipping;
CREATE POLICY product_shipping_auth_insert
  ON public.product_shipping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE  public.products.id        = product_id
        AND  public.products."sellerId" = auth.uid()
    )
    OR public.is_admin()
  );

-- Only the product owner (or admin) may update a shipping association.
DROP POLICY IF EXISTS product_shipping_auth_update ON public.product_shipping;
CREATE POLICY product_shipping_auth_update
  ON public.product_shipping
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE  public.products.id        = product_id
        AND  public.products."sellerId" = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE  public.products.id        = product_id
        AND  public.products."sellerId" = auth.uid()
    )
    OR public.is_admin()
  );

-- Only the product owner (or admin) may delete a shipping association.
DROP POLICY IF EXISTS product_shipping_auth_delete ON public.product_shipping;
CREATE POLICY product_shipping_auth_delete
  ON public.product_shipping
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE  public.products.id        = product_id
        AND  public.products."sellerId" = auth.uid()
    )
    OR public.is_admin()
  );

-- ── Notice ────────────────────────────────────────────────────────────────────
DO $msg$ BEGIN
  RAISE NOTICE '560_fix_rls_shipping_tables: RLS enabled and policies applied '
               'for shipping_methods, shipping_rates, and product_shipping.';
END $msg$;
