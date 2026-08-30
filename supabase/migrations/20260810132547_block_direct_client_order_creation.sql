DROP POLICY IF EXISTS buyers_can_insert_their_own_orders ON public.orders;
REVOKE INSERT ON public.orders FROM anon, authenticated;
GRANT ALL ON public.orders TO service_role;;
