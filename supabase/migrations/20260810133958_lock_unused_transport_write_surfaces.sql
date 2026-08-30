DROP POLICY IF EXISTS delivery_requests_insert ON public.delivery_requests;
REVOKE INSERT, UPDATE, DELETE ON public.delivery_requests FROM anon, authenticated;
GRANT ALL ON public.delivery_requests TO service_role;

DROP POLICY IF EXISTS shipment_events_insert ON public.shipment_events;
REVOKE INSERT, UPDATE, DELETE ON public.shipment_events FROM anon, authenticated;
GRANT ALL ON public.shipment_events TO service_role;

DROP POLICY IF EXISTS shipment_events_select ON public.shipment_events;
CREATE POLICY shipment_events_select ON public.shipment_events
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.shipments s
  WHERE s.id = shipment_events.shipment_id
    AND (
      s.buyer_id = (select auth.uid())
      OR s.seller_id = (select auth.uid())
      OR (select public.is_admin())
    )
));
GRANT SELECT ON public.shipment_events TO authenticated;;
