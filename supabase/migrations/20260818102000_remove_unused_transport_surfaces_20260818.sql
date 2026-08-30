-- Loadify Market: remove unused transport-request surfaces while preserving
-- generic order fulfilment and shipment event tracking.

ALTER TABLE IF EXISTS public.shipments
  DROP CONSTRAINT IF EXISTS shipments_delivery_request_id_fkey;
ALTER TABLE IF EXISTS public.shipments
  DROP COLUMN IF EXISTS delivery_request_id;
DROP TABLE IF EXISTS public.transport_quotes CASCADE;
DROP TABLE IF EXISTS public.delivery_requests CASCADE;
ALTER TABLE IF EXISTS public.shipment_events
  DROP CONSTRAINT IF EXISTS shipment_events_source_check;
ALTER TABLE IF EXISTS public.shipment_events
  ADD CONSTRAINT shipment_events_source_check
  CHECK (source IN ('manual', 'system', 'courier_api'));
