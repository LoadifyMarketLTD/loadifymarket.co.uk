DROP POLICY IF EXISTS recently_viewed_select ON public.recently_viewed;
CREATE POLICY recently_viewed_select ON public.recently_viewed
FOR SELECT TO authenticated
USING ("userId" = (select auth.uid()));

DROP POLICY IF EXISTS carts_own ON public.carts;
CREATE POLICY carts_own ON public.carts
FOR ALL TO authenticated
USING (((select auth.uid()) = "userId") OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS cart_items_own ON public.cart_items;
CREATE POLICY cart_items_own ON public.cart_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items."cartId"
      AND c."userId" = (select auth.uid())
  ) OR (select public.is_admin())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items."cartId"
      AND c."userId" = (select auth.uid())
  ) OR (select public.is_admin())
);

DROP POLICY IF EXISTS wishlists_all ON public.wishlists;
CREATE POLICY wishlists_all ON public.wishlists
FOR ALL TO authenticated
USING (((select auth.uid()) = "userId") OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS saved_searches_all ON public.saved_searches;
CREATE POLICY saved_searches_all ON public.saved_searches
FOR ALL TO authenticated
USING (((select auth.uid()) = "userId") OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS notification_settings_all ON public.notification_settings;
CREATE POLICY notification_settings_all ON public.notification_settings
FOR ALL TO authenticated
USING (((select auth.uid()) = "userId") OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS seller_stores_manage ON public.seller_stores;
DROP POLICY IF EXISTS seller_stores_select ON public.seller_stores;
CREATE POLICY seller_stores_select ON public.seller_stores
FOR SELECT TO public
USING (
  "isActive" = true
  OR (select auth.uid()) = "userId"
  OR (select public.is_admin())
);
CREATE POLICY seller_stores_insert ON public.seller_stores
FOR INSERT TO authenticated
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));
CREATE POLICY seller_stores_update ON public.seller_stores
FOR UPDATE TO authenticated
USING (((select auth.uid()) = "userId") OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));
CREATE POLICY seller_stores_delete ON public.seller_stores
FOR DELETE TO authenticated
USING (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS returns_admin_update ON public.returns;
DROP POLICY IF EXISTS returns_seller_update ON public.returns;
CREATE POLICY returns_update ON public.returns
FOR UPDATE TO authenticated
USING (
  (select public.is_admin())
  OR ("sellerId" = (select auth.uid()) AND status = 'requested')
)
WITH CHECK (
  (select public.is_admin())
  OR ("sellerId" = (select auth.uid()) AND status IN ('approved','rejected'))
);;
