DROP POLICY IF EXISTS payment_sessions_write ON public.payment_sessions;
REVOKE ALL ON public.payment_sessions FROM anon, authenticated;
GRANT ALL ON public.payment_sessions TO service_role;

DROP POLICY IF EXISTS order_items_insert ON public.order_items;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;
GRANT ALL ON public.order_items TO service_role;

DROP POLICY IF EXISTS order_items_select_participants ON public.order_items;
CREATE POLICY order_items_select_participants ON public.order_items
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.orders o
  WHERE o.id = order_items."orderId"
    AND (
      o."buyerId" = (select auth.uid())
      OR o."sellerId" = (select auth.uid())
      OR (select public.is_admin())
    )
));
GRANT SELECT ON public.order_items TO authenticated;;
