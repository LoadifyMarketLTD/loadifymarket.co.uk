-- ================================================================
-- Migration 350: Fix infinite recursion in products RLS (v3 — definitive)
-- ================================================================
--
-- WHY THIS EXISTS:
--   Migrations 290 and 330 both introduced the same fix.  In practice,
--   neither was executed against the live Supabase database before the
--   post-290 migrations (300 – 340) were applied, so the broken inline-
--   subquery policies from migration 220 are still active in production.
--   Sellers receive:
--
--     "Failed to save product: infinite recursion detected in
--      policy for relation 'products'"
--
--   when attempting to create or update any product (price, title,
--   stock, etc.).
--
-- ROOT CAUSE:
--   Migration 220 tightened product_shipping INSERT / UPDATE / DELETE
--   policies by adding an ownership check via an inline subquery:
--
--     EXISTS (
--       SELECT 1 FROM products
--       WHERE products.id = product_shipping.product_id
--         AND products."sellerId" = auth.uid()
--     )
--
--   PostgREST wraps every HTTP request in a single implicit transaction.
--   The seller form sends:
--     1. UPDATE products SET ... WHERE id = $1   (or INSERT ... RETURNING id)
--     2. DELETE FROM product_shipping WHERE product_id = $1  (syncShipping)
--     3. INSERT INTO product_shipping (...)
--
--   PostgreSQL evaluates the products RLS policies for the RETURNING
--   clause of step 1.  While that evaluation is on the call stack the
--   product_shipping policies in steps 2–3 trigger a fresh SELECT on
--   products, re-entering the products RLS evaluation stack.  PostgreSQL
--   raises "infinite recursion detected in policy for relation products".
--
-- FIX:
--   A SECURITY DEFINER function owns_product(UUID) queries the products
--   table as its owner (BYPASSRLS), so product_shipping policies can
--   check ownership WITHOUT entering the products RLS stack.
--
-- SAFE:
--   Fully idempotent — CREATE OR REPLACE + DROP IF EXISTS + CREATE.
--   Replaces any prior version of these policies regardless of which
--   earlier migrations were or were not applied.
-- ================================================================

-- ── 1. Helper functions (hardened: SET search_path = '') ─────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND "isActive" = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.is_admin();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'seller'
      AND "isActive" = TRUE
  );
END;
$$;

-- ── 2. owns_product() — SECURITY DEFINER, bypasses products RLS ──────────────
-- Queried by product_shipping policies to check ownership WITHOUT re-entering
-- the products RLS evaluation stack (which causes infinite recursion).

CREATE OR REPLACE FUNCTION public.owns_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.products
    WHERE  id         = p_product_id
      AND  "sellerId" = (SELECT auth.uid())
  );
$$;

-- ── 3. Recreate products policies ────────────────────────────────────────────
-- Drop first to clear any stale or duplicate policies.

DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

-- Public: visible when isActive=TRUE AND isApproved=TRUE.
-- Sellers: can see their own products regardless of approval status.
-- Admins: can see all products.
-- (SELECT auth.uid()) evaluated once per query to avoid per-row auth calls.
CREATE POLICY "products_select" ON public.products
  FOR SELECT
  USING (
    ("isActive" = TRUE AND "isApproved" = TRUE)
    OR (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

-- Only the owning seller may insert a product.
CREATE POLICY "products_insert" ON public.products
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    AND public.is_seller()
  );

-- Sellers may update their own products; admins may update any product.
CREATE POLICY "products_update" ON public.products
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  )
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

-- Sellers may delete their own products; admins may delete any product.
CREATE POLICY "products_delete" ON public.products
  FOR DELETE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

-- ── 4. Recreate product_shipping policies using owns_product() ───────────────
-- Replacing the inline "SELECT 1 FROM products ..." with the SECURITY DEFINER
-- helper breaks the re-entrant RLS evaluation chain and eliminates the error.

DROP POLICY IF EXISTS product_shipping_auth_insert ON public.product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_update ON public.product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_delete ON public.product_shipping;

CREATE POLICY product_shipping_auth_insert
  ON public.product_shipping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.owns_product(product_id)
    OR public.is_admin()
  );

CREATE POLICY product_shipping_auth_update
  ON public.product_shipping
  FOR UPDATE
  TO authenticated
  USING (
    public.owns_product(product_id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.owns_product(product_id)
    OR public.is_admin()
  );

CREATE POLICY product_shipping_auth_delete
  ON public.product_shipping
  FOR DELETE
  TO authenticated
  USING (
    public.owns_product(product_id)
    OR public.is_admin()
  );

DO $$ BEGIN
  RAISE NOTICE '350_fix_products_rls_recursion_v3: applied — owns_product() SECURITY DEFINER helper recreated, products + product_shipping policies recreated. Sellers can now save products without infinite recursion.';
END $$;
