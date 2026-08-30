CREATE OR REPLACE FUNCTION public.is_seller_checkout_ready(p_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_profiles sp
    WHERE sp."userId" = p_seller_id
      AND sp."sellerStatus" = 'active'
      AND sp."stripeConnectStatus" = 'active'
      AND COALESCE(sp."isPaused", false) = false
  );
$function$;

REVOKE ALL ON FUNCTION public.is_seller_checkout_ready(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_seller_checkout_ready(uuid) TO anon, authenticated, service_role;

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
    AND public.is_seller_checkout_ready("sellerId")
  )
  OR (select auth.uid()) = "sellerId"
  OR public.is_admin()
);;
