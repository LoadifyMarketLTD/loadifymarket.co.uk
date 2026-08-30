CREATE POLICY "buyer_profiles_all" ON public.buyer_profiles FOR ALL
  USING (auth.uid() = "userId" OR public.is_admin())
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());

CREATE POLICY "seller_stores_select" ON public.seller_stores FOR SELECT
  USING ("isActive" = TRUE OR auth.uid() = "userId" OR public.is_admin());
CREATE POLICY "seller_stores_manage" ON public.seller_stores FOR ALL
  USING (auth.uid() = "userId" OR public.is_admin())
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());

CREATE POLICY "seller_verifications_select" ON public.seller_verifications FOR SELECT
  USING (auth.uid() = "sellerId" OR public.is_admin());
CREATE POLICY "seller_verifications_insert" ON public.seller_verifications FOR INSERT
  WITH CHECK (auth.uid() = "sellerId" OR public.is_admin());
CREATE POLICY "seller_verifications_update" ON public.seller_verifications FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "featured_listings_select" ON public.featured_listings FOR SELECT
  USING ("isActive" = TRUE OR public.is_admin());
CREATE POLICY "featured_listings_manage" ON public.featured_listings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "banners_select" ON public.banners FOR SELECT
  USING ("isActive" = TRUE OR public.is_admin());
CREATE POLICY "banners_manage" ON public.banners FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "wishlists_all" ON public.wishlists FOR ALL
  USING (auth.uid() = "userId" OR public.is_admin())
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());

CREATE POLICY "saved_searches_all" ON public.saved_searches FOR ALL
  USING (auth.uid() = "userId" OR public.is_admin())
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());

CREATE POLICY "notification_settings_all" ON public.notification_settings FOR ALL
  USING (auth.uid() = "userId" OR public.is_admin())
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());

CREATE POLICY "carts_own" ON public.carts FOR ALL
  USING (auth.uid() = "userId" OR public.is_admin())
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());

CREATE POLICY "cart_items_own" ON public.cart_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = "cartId" AND c."userId" = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = "cartId" AND c."userId" = auth.uid())
    OR public.is_admin()
  );;
