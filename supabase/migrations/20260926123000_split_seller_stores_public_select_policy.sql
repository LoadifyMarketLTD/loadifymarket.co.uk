-- Public storefront reads must not evaluate authenticated-only helpers such as
-- public.is_admin(). Split anonymous and authenticated SELECT policies so active
-- public stores remain browsable without weakening admin/helper function ACLs.

DROP POLICY IF EXISTS seller_stores_select ON public.seller_stores;
DROP POLICY IF EXISTS seller_stores_select_anon ON public.seller_stores;
DROP POLICY IF EXISTS seller_stores_select_authenticated ON public.seller_stores;

CREATE POLICY seller_stores_select_anon
ON public.seller_stores
FOR SELECT
TO anon
USING ("isActive" = true);

CREATE POLICY seller_stores_select_authenticated
ON public.seller_stores
FOR SELECT
TO authenticated
USING (
  "isActive" = true
  OR (select auth.uid()) = "userId"
  OR (select public.is_admin())
);
