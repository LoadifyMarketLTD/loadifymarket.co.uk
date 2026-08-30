CREATE POLICY "payouts_seller_select" ON public.payouts FOR SELECT
  USING (auth.uid() = "sellerId" OR public.is_admin());
CREATE POLICY "payouts_admin_manage" ON public.payouts FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "dispute_messages_select" ON public.dispute_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.disputes d
            WHERE d.id = "disputeId"
              AND (d."buyerId" = auth.uid() OR d."sellerId" = auth.uid()))
    OR public.is_admin()
  );
CREATE POLICY "dispute_messages_insert" ON public.dispute_messages FOR INSERT
  WITH CHECK (
    auth.uid() = "userId" AND (
      EXISTS (SELECT 1 FROM public.disputes d
              WHERE d.id = "disputeId"
                AND (d."buyerId" = auth.uid() OR d."sellerId" = auth.uid()))
      OR public.is_admin()
    )
  );

CREATE POLICY "transport_quotes_select" ON public.transport_quotes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.delivery_requests dr
            WHERE dr.id = "deliveryRequestId"
              AND (dr."buyerId" = auth.uid() OR dr."sellerId" = auth.uid()))
    OR auth.uid() = "carrierId"
    OR public.is_admin()
  );
CREATE POLICY "transport_quotes_insert" ON public.transport_quotes FOR INSERT
  WITH CHECK (auth.uid() = "carrierId" OR public.is_admin());
CREATE POLICY "transport_quotes_update" ON public.transport_quotes FOR UPDATE
  USING (auth.uid() = "carrierId" OR public.is_admin());

CREATE POLICY "shipments_select" ON public.shipments FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR public.is_admin());
CREATE POLICY "shipments_insert" ON public.shipments FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR public.is_admin());
CREATE POLICY "shipments_update" ON public.shipments FOR UPDATE
  USING (auth.uid() = seller_id OR public.is_admin());

CREATE POLICY "shipment_events_select" ON public.shipment_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shipments s
            WHERE s.id = shipment_id
              AND (s.buyer_id = auth.uid() OR s.seller_id = auth.uid()))
    OR public.is_admin()
  );
CREATE POLICY "shipment_events_insert" ON public.shipment_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shipments s
            WHERE s.id = shipment_id AND s.seller_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "ticket_messages_select" ON public.support_ticket_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t
            WHERE t.id = "ticketId"
              AND (t."userId" = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "ticket_messages_insert" ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets t
            WHERE t.id = "ticketId"
              AND (t."userId" = auth.uid() OR public.is_admin()))
  );;
