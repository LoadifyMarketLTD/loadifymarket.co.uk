-- Safe seller correction for an accidental manual dispatch.
-- Narrow contract: current Dispatched -> Processing only.
-- Financial/Stripe state is untouched; history is append-only.

CREATE OR REPLACE FUNCTION public.server_correct_shipment_dispatch(
  p_shipment_id uuid,
  p_actor_id uuid,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor_role text;
  v_actor_active boolean;
  v_order_status text;
  v_shipment public.shipments%ROWTYPE;
  v_latest_source text;
  v_message text;
BEGIN
  SELECT u.role, u."isActive"
    INTO v_actor_role, v_actor_active
    FROM public.users u
   WHERE u.id = p_actor_id;

  IF v_actor_active IS DISTINCT FROM true
     OR v_actor_role IS NULL
     OR NOT (v_actor_role = ANY (ARRAY['seller', 'admin']))
  THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: active seller or admin actor required'
      USING ERRCODE = '42501';
  END IF;
  SELECT s.*
    INTO v_shipment
    FROM public.shipments s
   WHERE s.id = p_shipment_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: shipment not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_role <> 'admin' AND v_shipment.seller_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: actor is not authorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT o.status
    INTO v_order_status
    FROM public.orders o
   WHERE o.id = v_shipment.order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: order not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_shipment.status <> 'Dispatched' OR v_order_status <> 'shipped' THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: only a currently dispatched shipment may be corrected'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_shipment.proof_of_delivery_url IS NOT NULL THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: proof of delivery already exists'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT se.source
    INTO v_latest_source
    FROM public.shipment_events se
   WHERE se.shipment_id = p_shipment_id
   ORDER BY se.created_at DESC, se.id DESC
   LIMIT 1;

  IF v_latest_source = 'courier_api' THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: courier-managed status cannot be corrected by seller'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.shipment_events se
     WHERE se.shipment_id = p_shipment_id
       AND se.status = ANY (ARRAY['In Transit', 'Out for Delivery', 'Delivered', 'Returned'])
  ) THEN
    RAISE EXCEPTION 'server_correct_shipment_dispatch: shipment has progressed beyond dispatch'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.shipments s
     SET status = 'Processing',
         dispatched_at = NULL,
         updated_at = now()
   WHERE s.id = p_shipment_id
   RETURNING s.* INTO v_shipment;
  UPDATE public.orders o
     SET status = 'paid',
         "updatedAt" = now()
   WHERE o.id = v_shipment.order_id;

  v_message := COALESCE(
    NULLIF(BTRIM(p_message), ''),
    'Dispatch corrected by seller: parcel was not handed to the courier'
  );

  INSERT INTO public.shipment_events (
    shipment_id, status, message, changed_by, source
  ) VALUES (
    p_shipment_id, 'Processing', v_message, p_actor_id, 'system'
  );

  INSERT INTO public.order_events (
    "orderId", "actorId", event, metadata
  ) VALUES (
    v_shipment.order_id,
    p_actor_id,
    'shipment_dispatch_corrected',
    jsonb_build_object(
      'shipmentId', p_shipment_id,
      'fromShipmentStatus', 'Dispatched',
      'toShipmentStatus', 'Processing',
      'fromOrderStatus', 'shipped',
      'toOrderStatus', 'paid'
    )
  );
  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_shipment),
    'changed', true,
    'orderStatus', 'paid'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_correct_shipment_dispatch(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_correct_shipment_dispatch(uuid, uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.server_correct_shipment_dispatch(uuid, uuid, text) IS
  'Service-role-only correction for an accidental manual Dispatched status. Restores shipment to Processing and order to paid, preserves audit history, and never mutates payment/financial state.';
