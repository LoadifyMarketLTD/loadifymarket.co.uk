DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select
ON public.products
FOR SELECT
TO public
USING (
  (
    "isActive" = true
    AND "isApproved" = true
    AND COALESCE("listingStatus", 'active') = 'active'
    AND (
      COALESCE("listingContext", 'product') = 'service'
      OR COALESCE("stockQuantity", 0) > 0
    )
  )
  OR (select auth.uid()) = "sellerId"
  OR public.is_admin()
);;
