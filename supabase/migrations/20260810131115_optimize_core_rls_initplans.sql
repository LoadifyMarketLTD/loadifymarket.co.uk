DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
FOR SELECT TO authenticated
USING ((select auth.uid()) = "userId");

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
FOR INSERT TO public
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
FOR UPDATE TO public
USING ((select auth.uid()) = "userId");

DROP POLICY IF EXISTS messages_select_participants ON public.messages;
CREATE POLICY messages_select_participants ON public.messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages."conversationId"
    AND (c."user1Id" = (select auth.uid()) OR c."user2Id" = (select auth.uid()))
));

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
FOR INSERT TO public
WITH CHECK (
  (select auth.uid()) = "senderId"
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages."conversationId"
      AND (c."user1Id" = (select auth.uid()) OR c."user2Id" = (select auth.uid()))
  )
);

DROP POLICY IF EXISTS seller_profiles_insert ON public.seller_profiles;
CREATE POLICY seller_profiles_insert ON public.seller_profiles
FOR INSERT TO public
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS seller_profiles_select ON public.seller_profiles;
CREATE POLICY seller_profiles_select ON public.seller_profiles
FOR SELECT TO public
USING (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS seller_profiles_update ON public.seller_profiles;
CREATE POLICY seller_profiles_update ON public.seller_profiles
FOR UPDATE TO public
USING (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS seller_profiles_delete ON public.seller_profiles;
CREATE POLICY seller_profiles_delete ON public.seller_profiles
FOR DELETE TO public
USING ((select public.is_admin()));

DROP POLICY IF EXISTS shipments_insert ON public.shipments;
CREATE POLICY shipments_insert ON public.shipments
FOR INSERT TO public
WITH CHECK (((select auth.uid()) = seller_id) OR (select public.is_admin()));

DROP POLICY IF EXISTS shipments_select ON public.shipments;
CREATE POLICY shipments_select ON public.shipments
FOR SELECT TO public
USING (((select auth.uid()) = seller_id) OR ((select auth.uid()) = buyer_id) OR (select public.is_admin()));

DROP POLICY IF EXISTS shipments_update ON public.shipments;
CREATE POLICY shipments_update ON public.shipments
FOR UPDATE TO public
USING (((select auth.uid()) = seller_id) OR (select public.is_admin()));

DROP POLICY IF EXISTS buyers_can_insert_their_own_orders ON public.orders;
CREATE POLICY buyers_can_insert_their_own_orders ON public.orders
FOR INSERT TO authenticated
WITH CHECK ("buyerId" = (select auth.uid()));

DROP POLICY IF EXISTS admins_can_view_all_orders ON public.orders;
DROP POLICY IF EXISTS buyers_can_view_their_orders ON public.orders;
DROP POLICY IF EXISTS sellers_can_view_orders_for_their_products ON public.orders;
CREATE POLICY orders_participant_or_admin_select ON public.orders
FOR SELECT TO authenticated
USING (
  "buyerId" = (select auth.uid())
  OR "sellerId" = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = orders."productId"
      AND p."sellerId" = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (select auth.uid())
      AND u.role = ANY (ARRAY['admin'::text,'owner'::text])
  )
);

DROP POLICY IF EXISTS admins_can_update_orders ON public.orders;
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_admin_update ON public.orders
FOR UPDATE TO authenticated
USING (
  (select public.is_admin())
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (select auth.uid())
      AND u.role = ANY (ARRAY['admin'::text,'owner'::text])
  )
)
WITH CHECK (
  (select public.is_admin())
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (select auth.uid())
      AND u.role = ANY (ARRAY['admin'::text,'owner'::text])
  )
);;
