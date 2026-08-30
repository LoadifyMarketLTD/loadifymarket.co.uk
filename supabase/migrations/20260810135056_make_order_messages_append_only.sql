DROP POLICY IF EXISTS order_messages_party ON public.order_messages;
CREATE POLICY order_messages_select_party ON public.order_messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_messages.order_id
    AND (o."buyerId" = (select auth.uid()) OR o."sellerId" = (select auth.uid()) OR (select public.is_admin()))
));
CREATE POLICY order_messages_insert_party ON public.order_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_messages.order_id
      AND (o."buyerId" = (select auth.uid()) OR o."sellerId" = (select auth.uid()))
  )
);
REVOKE UPDATE, DELETE ON public.order_messages FROM authenticated;
GRANT SELECT, INSERT ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;;
