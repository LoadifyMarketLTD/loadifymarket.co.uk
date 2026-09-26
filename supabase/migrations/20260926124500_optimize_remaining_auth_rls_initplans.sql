-- Optimize remaining RLS auth helper calls by evaluating auth context once per query.
-- Security semantics, policy roles, commands and row predicates remain unchanged.

ALTER POLICY "admin_read_csp_reports" ON public.csp_reports
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (select auth.uid()) AND u.role = 'admin'
  )
);

ALTER POLICY "dispute_messages_insert" ON public.dispute_messages
WITH CHECK (
  (select auth.uid()) = "userId"
  AND (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = public.dispute_messages."disputeId"
        AND (
          d."buyerId" = (select auth.uid())
          OR d."sellerId" = (select auth.uid())
        )
    )
    OR (select public.is_admin())
  )
);

ALTER POLICY "dispute_messages_select" ON public.dispute_messages
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = public.dispute_messages."disputeId"
      AND (
        d."buyerId" = (select auth.uid())
        OR d."sellerId" = (select auth.uid())
      )
  )
  OR (select public.is_admin())
);

ALTER POLICY "Buyers view own returns" ON public.disputes_and_returns
USING ((select auth.uid()) = "buyerId");

ALTER POLICY "Sellers view assigned returns" ON public.disputes_and_returns
USING ((select auth.uid()) = "sellerId");

ALTER POLICY "admin_read_error_reports" ON public.error_reports
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (select auth.uid()) AND u.role = 'admin'
  )
);

ALTER POLICY "Acces vanzator notificari" ON public.in_app_notifications
USING ((select auth.uid()) = "userId");

ALTER POLICY "Utilizatorii își pot marca notificările ca citite" ON public.in_app_notifications
USING ((select auth.uid()) = "userId");

ALTER POLICY "Utilizatorii își pot vedea propriile notificări" ON public.in_app_notifications
USING ((select auth.uid()) = "userId");

ALTER POLICY "order_events_select_participant" ON public.order_events
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = public.order_events."orderId"
      AND (
        o."buyerId" = (select auth.uid())
        OR o."sellerId" = (select auth.uid())
      )
  )
);

ALTER POLICY "Seller orders isolation" ON public.orders
USING ((select auth.uid()) = "sellerId");

ALTER POLICY "product_offers_insert" ON public.product_offers
WITH CHECK ((select auth.uid()) = "buyerId");

ALTER POLICY "product_shipping_auth_delete" ON public.product_shipping
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE public.products.id = public.product_shipping.product_id
      AND public.products."sellerId" = (select auth.uid())
  )
  OR (select public.is_admin())
);

ALTER POLICY "product_shipping_auth_insert" ON public.product_shipping
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE public.products.id = public.product_shipping.product_id
      AND public.products."sellerId" = (select auth.uid())
  )
  OR (select public.is_admin())
);

ALTER POLICY "product_shipping_auth_update" ON public.product_shipping
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE public.products.id = public.product_shipping.product_id
      AND public.products."sellerId" = (select auth.uid())
  )
  OR (select public.is_admin())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE public.products.id = public.product_shipping.product_id
      AND public.products."sellerId" = (select auth.uid())
  )
  OR (select public.is_admin())
);

ALTER POLICY "Vânzătorii își gestionează propriile variante de produs" ON public.product_variants_3p
USING ((select auth.uid()) = "sellerId");

ALTER POLICY "Seller products isolation" ON public.products
USING ((select auth.uid()) = "sellerId");

ALTER POLICY "push_tokens_owner_select" ON public.push_tokens
USING ((select auth.uid()) = "userId");

ALTER POLICY "Acces vanzator profil propriu" ON public.seller_profiles
USING ((select auth.uid()) = "userId");

ALTER POLICY "Vânzătorii își pot actualiza propriul profil" ON public.seller_profiles
USING ((select auth.uid()) = "userId");

ALTER POLICY "Vânzătorii își pot vedea propriul profil" ON public.seller_profiles
USING ((select auth.uid()) = "userId");

ALTER POLICY "service_attributes_read" ON public.service_attributes
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = public.service_attributes.service_id
      AND s.status::text = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = public.service_attributes.service_id
      AND s.seller_id = (select auth.uid())
  )
);

ALTER POLICY "service_attributes_write" ON public.service_attributes
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = public.service_attributes.service_id
      AND s.seller_id = (select auth.uid())
  )
);

ALTER POLICY "service_media_read" ON public.service_media
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = public.service_media.service_id
      AND s.status::text = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = public.service_media.service_id
      AND s.seller_id = (select auth.uid())
  )
);

ALTER POLICY "service_media_write" ON public.service_media
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = public.service_media.service_id
      AND s.seller_id = (select auth.uid())
  )
);

ALTER POLICY "service_quotes_buyer_read" ON public.service_quotes
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests r
    WHERE r.id = public.service_quotes.request_id
      AND r.buyer_id = (select auth.uid())
  )
);

ALTER POLICY "service_quotes_seller_own" ON public.service_quotes
USING ((select auth.uid()) = seller_id)
WITH CHECK ((select auth.uid()) = seller_id);

ALTER POLICY "service_requests_buyer_own" ON public.service_requests
USING ((select auth.uid()) = buyer_id)
WITH CHECK ((select auth.uid()) = buyer_id);

ALTER POLICY "service_requests_seller_read" ON public.service_requests
USING (
  status::text = 'open'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = (select auth.uid())
      AND public.users.role = ANY (ARRAY['seller'::text, 'admin'::text])
  )
);

ALTER POLICY "services_admin_all" ON public.services
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = (select auth.uid())
      AND public.users.role = 'admin'
  )
);

ALTER POLICY "services_seller_all" ON public.services
USING ((select auth.uid()) = seller_id)
WITH CHECK ((select auth.uid()) = seller_id);

ALTER POLICY "Service Role Only on Webhooks" ON public.stripe_webhook_events
USING ((select auth.role()) = 'service_role');

ALTER POLICY "Vânzătorii își gestionează propriile feed-uri" ON public.vendor_sync_feeds
USING ((select auth.uid()) = "sellerId");
