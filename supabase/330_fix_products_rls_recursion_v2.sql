-- ================================================================
-- Migration 330: Re-apply RLS recursion fix for products (idempotent)
-- ================================================================
--
-- WHY THIS EXISTS:
--   Migration 290 introduced owns_product() and fixed the product_shipping
--   policies.  If 290 was not applied to the live database before 300/310/320
--   were run, the broken inline-subquery policies from migration 220 may still
--   be in effect, causing:
--
--     ERROR 42P17: infinite recursion detected in policy
--                  for relation "products"
--
--   when a seller saves a product (products INSERT + product_shipping INSERT
--   executed in sequence by ProductFormPage.tsx / syncShipping()).
--
-- ROOT CAUSE (recap):
--   Migration 220 hardened product_shipping INSERT/UPDATE/DELETE policies by
--   adding an ownership check via an inline subquery:
--
--     EXISTS (
--       SELECT 1 FROM products
--       WHERE products.id = product_shipping.product_id
--         AND products."sellerId" = auth.uid()
--     )
--
--   PostgREST uses a single implicit transaction for each HTTP request.
--   The seller form calls .insert([...]).select('id') on products first.
--   PostgreSQL must evaluate the products SELECT policy for the RETURNING
--   clause.  While that evaluation is on the call stack, the immediately
--   following product_shipping INSERT (syncShipping) triggers the
--   product_shipping policy which runs the inline SELECT on products —
--   re-entering the products RLS evaluation stack.  PostgreSQL raises the
--   "infinite recursion" error.
--
-- FIX:
--   A SECURITY DEFINER helper owns_product(UUID) queries products directly
--   as the function owner (superuser / BYPASSRLS), so product_shipping
--   policies can check ownership WITHOUT entering the products RLS stack.
--
-- SAFE:
--   Fully idempotent — CREATE OR REPLACE + DROP IF EXISTS + CREATE.
--   Replaces any previous version of these policies regardless of which
--   prior migrations were or were not applied.
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
-- Used by product_shipping policies so that the ownership check does NOT
-- re-enter the products RLS evaluation stack.

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
-- (SELECT auth.uid()) evaluated once per query, not per row — avoids
-- "Auth RLS Initialization Plan" linter warnings.
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
-- helper breaks the re-entrant RLS evaluation chain.

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
  RAISE NOTICE '330_fix_products_rls_recursion_v2: applied — owns_product() SECURITY DEFINER, products + product_shipping policies recreated.';
END $$;
