CREATE POLICY "seller_balance_select" ON public.seller_balance FOR SELECT
  USING (auth.uid() = "sellerId" OR public.is_admin());

CREATE POLICY "seller_balance_admin_write" ON public.seller_balance FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "payout_requests_select" ON public.payout_requests FOR SELECT
  USING (auth.uid() = "sellerId" OR public.is_admin());

CREATE POLICY "payout_requests_admin_update" ON public.payout_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());;
