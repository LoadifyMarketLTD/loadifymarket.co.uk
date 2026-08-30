GRANT INSERT ON public.orders TO authenticated;
DROP POLICY IF EXISTS orders_insert ON public.orders;
CREATE POLICY orders_insert ON public.orders
FOR INSERT TO authenticated
WITH CHECK ((select public.is_admin()));;
