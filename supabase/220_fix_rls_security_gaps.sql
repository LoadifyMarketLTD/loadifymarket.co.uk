-- 220_fix_rls_security_gaps.sql
-- Tightens over-permissive RLS policies identified in the security audit.
--
-- 1. users_insert:  WITH CHECK (TRUE) → WITH CHECK (auth.uid() = id)
--    Prevents any authenticated user from inserting rows for other users.
--
-- 2. product_analytics:  Splits the broad "authenticated can do anything"
--    policy into targeted read/write policies scoped to product owners.
--
-- 3. product_shipping:  Restricts writes to product owners only.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tighten users INSERT policy ──────────────────────────────────────────
-- Drop the old permissive policy and recreate with a proper check.
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── 2. Fix product_analytics policies ───────────────────────────────────────
-- Drop the overly-broad policy that allowed any authenticated user to
-- read/write analytics for any product.
DROP POLICY IF EXISTS "product_analytics_insert" ON public.product_analytics;
DROP POLICY IF EXISTS "product_analytics_select" ON public.product_analytics;
DROP POLICY IF EXISTS "product_analytics_update" ON public.product_analytics;
DROP POLICY IF EXISTS "product_analytics_all" ON public.product_analytics;

-- Allow any authenticated user to INSERT analytics events (page views etc.)
-- This is intentional — visitors viewing a product page trigger an analytics event.
CREATE POLICY "product_analytics_insert"
  ON public.product_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Only product owners can read their own product analytics.
CREATE POLICY "product_analytics_select"
  ON public.product_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_analytics."productId"
        AND p."sellerId" = auth.uid()
    )
  );

-- ── 3. Restrict product_shipping writes to product owners ───────────────────
DROP POLICY IF EXISTS "product_shipping_insert" ON public.product_shipping;
DROP POLICY IF EXISTS "product_shipping_update" ON public.product_shipping;
DROP POLICY IF EXISTS "product_shipping_all" ON public.product_shipping;

-- Public read for shipping info (needed for product pages).
DROP POLICY IF EXISTS "product_shipping_select" ON public.product_shipping;
CREATE POLICY "product_shipping_select"
  ON public.product_shipping
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only product owners can insert/update shipping for their own products.
CREATE POLICY "product_shipping_insert"
  ON public.product_shipping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_shipping."productId"
        AND p."sellerId" = auth.uid()
    )
  );

CREATE POLICY "product_shipping_update"
  ON public.product_shipping
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_shipping."productId"
        AND p."sellerId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_shipping."productId"
        AND p."sellerId" = auth.uid()
    )
  );
