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
    AND EXISTS (
      SELECT 1
      FROM public.seller_profiles sp
      WHERE sp."userId" = products."sellerId"
        AND sp."sellerStatus" = 'active'
        AND sp."stripeConnectStatus" = 'active'
        AND COALESCE(sp."isPaused", false) = false
    )
  )
  OR (select auth.uid()) = "sellerId"
  OR public.is_admin()
);;
