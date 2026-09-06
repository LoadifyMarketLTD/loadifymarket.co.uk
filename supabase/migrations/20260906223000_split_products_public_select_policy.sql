-- Anonymous visitors must be able to browse live marketplace listings without
-- evaluating authenticated-only helpers such as public.is_admin().
DROP POLICY IF EXISTS products_select ON public.products;
DROP POLICY IF EXISTS products_select_anon ON public.products;
DROP POLICY IF EXISTS products_select_authenticated ON public.products;

CREATE POLICY products_select_anon
ON public.products
FOR SELECT
TO anon
USING (
  "isActive" = true
  AND "isApproved" = true
  AND COALESCE("listingStatus", 'active') = 'active'
  AND (
    COALESCE("listingContext", 'product') = 'service'
    OR COALESCE("stockQuantity", 0) > 0
  )
  AND public.is_seller_checkout_ready("sellerId")
);

CREATE POLICY products_select_authenticated
ON public.products
FOR SELECT
TO authenticated
USING (
  (
    "isActive" = true
    AND "isApproved" = true
    AND COALESCE("listingStatus", 'active') = 'active'
    AND (
      COALESCE("listingContext", 'product') = 'service'
      OR COALESCE("stockQuantity", 0) > 0
    )
    AND public.is_seller_checkout_ready("sellerId")
  )
  OR (select auth.uid()) = "sellerId"
  OR public.is_admin()
);
