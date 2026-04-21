-- ================================================================
-- Migration 360: Re-apply definitive products RLS recursion fix (v4)
-- ================================================================
--
-- WHY THIS EXISTS:
--   Some live environments still have legacy product_shipping policies
--   that check ownership via inline SELECTs against products. During
--   seller product save flows, this can re-enter products RLS evaluation
--   and fail with:
--
--     infinite recursion detected in policy for relation "products"
--
-- FIX:
--   Recreate owns_product(UUID) as SECURITY DEFINER and recreate
--   products + product_shipping policies to ensure product_shipping
--   ownership checks do not query products via inline policy subqueries.
--
-- SAFETY:
--   Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS + CREATE POLICY).
-- ================================================================

-- ── 1) Ensure helper functions are hardened and schema-qualified ────────────

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

-- ── 2) Non-recursive ownership helper for product_shipping policies ─────────

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

GRANT EXECUTE ON FUNCTION public.owns_product(UUID) TO authenticated;

-- ── 3) Recreate products policies (clear any stale/broken versions) ─────────

DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_select" ON public.products
  FOR SELECT
  USING (
    ("isActive" = TRUE AND "isApproved" = TRUE)
    OR (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

CREATE POLICY "products_insert" ON public.products
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    AND public.is_seller()
  );

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

CREATE POLICY "products_delete" ON public.products
  FOR DELETE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

-- ── 4) Recreate product_shipping write policies using owns_product() ────────

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
  RAISE NOTICE '360_fix_products_rls_recursion_v4 applied: non-recursive products/product_shipping RLS policies restored.';
END $$;
