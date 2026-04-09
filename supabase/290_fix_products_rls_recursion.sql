-- ================================================================
-- Migration 290: Fix infinite recursion in products RLS policy
-- ================================================================
--
-- Problem:
--   Migration 220 tightened product_shipping policies by adding
--   ownership checks via inline subqueries:
--
--     EXISTS (
--       SELECT 1 FROM products
--       WHERE products.id = product_shipping.product_id
--         AND products."sellerId" = auth.uid()
--     )
--
--   When PostgREST processes a product INSERT with RETURNING
--   (e.g. from the seller product form) and then immediately
--   inserts into product_shipping (syncShipping), the products
--   RLS evaluation stack is still active when those product_shipping
--   policies trigger a fresh SELECT on products. PostgreSQL detects
--   this re-entrant evaluation and raises:
--
--     ERROR 42P17: infinite recursion detected in policy
--                  for relation "products"
--
-- Fix:
--   1. Introduce a SECURITY DEFINER helper owns_product(UUID) that
--      checks product ownership by querying products directly,
--      bypassing products RLS (SECURITY DEFINER + owner BYPASSRLS).
--      product_shipping policies call this instead of the inline
--      subquery, breaking the re-entrant RLS evaluation chain.
--
--   2. Recreate all four products policies (clears any stale or
--      duplicate policy state in the live database) and adds an
--      explicit WITH CHECK clause to products_update for clarity.
--
--   3. Harden is_seller(), is_admin_or_owner(), and is_owner() with
--      SET search_path = '' to prevent search-path injection and
--      satisfy the Supabase security linter.
--
-- This migration is idempotent (DROP IF EXISTS + CREATE OR REPLACE).
-- ================================================================

-- ── 1. Harden existing helper functions ──────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin_or_owner()
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

-- Alias kept for backward compatibility.
CREATE OR REPLACE FUNCTION is_owner()
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

CREATE OR REPLACE FUNCTION is_seller()
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

-- ── 2. New: owns_product() — bypasses products RLS ───────────────────────────
-- Used by product_shipping policies so that the ownership check does NOT
-- re-enter the products RLS evaluation stack (which would cause the
-- "infinite recursion detected in policy for relation products" error).

CREATE OR REPLACE FUNCTION owns_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.products
    WHERE  id          = p_product_id
      AND  "sellerId"  = (SELECT auth.uid())
  );
$$;

-- ── 3. Recreate products policies ────────────────────────────────────────────
-- Drop first to clear any stale or duplicate policies in the live database.

DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

-- Public: visible when both isActive=true AND isApproved=true.
-- Sellers: can see their own products regardless of approval status.
-- Admins: can see all products.
CREATE POLICY "products_select" ON public.products
  FOR SELECT
  USING (
    ("isActive" = TRUE AND "isApproved" = TRUE)
    OR (SELECT auth.uid()) = "sellerId"
    OR is_admin_or_owner()
  );

-- Only the authenticated seller who owns the product may insert it.
CREATE POLICY "products_insert" ON public.products
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    AND is_seller()
  );

-- Sellers may update their own products; admins may update any product.
-- Explicit WITH CHECK mirrors USING so both old-row and new-row are validated.
CREATE POLICY "products_update" ON public.products
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR is_admin_or_owner()
  )
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    OR is_admin_or_owner()
  );

-- Sellers may delete their own products; admins may delete any product.
CREATE POLICY "products_delete" ON public.products
  FOR DELETE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR is_admin_or_owner()
  );

-- ── 4. Recreate product_shipping policies using owns_product() ───────────────
-- Replacing the inline "SELECT 1 FROM products ..." subquery with the
-- SECURITY DEFINER helper eliminates the cross-table RLS re-entry that
-- was causing the infinite recursion error.

DROP POLICY IF EXISTS product_shipping_auth_insert ON public.product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_update ON public.product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_delete ON public.product_shipping;

CREATE POLICY product_shipping_auth_insert
  ON public.product_shipping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owns_product(product_id)
    OR is_admin_or_owner()
  );

CREATE POLICY product_shipping_auth_update
  ON public.product_shipping
  FOR UPDATE
  TO authenticated
  USING (
    owns_product(product_id)
    OR is_admin_or_owner()
  )
  WITH CHECK (
    owns_product(product_id)
    OR is_admin_or_owner()
  );

CREATE POLICY product_shipping_auth_delete
  ON public.product_shipping
  FOR DELETE
  TO authenticated
  USING (
    owns_product(product_id)
    OR is_admin_or_owner()
  );
