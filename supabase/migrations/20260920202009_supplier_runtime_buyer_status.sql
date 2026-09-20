CREATE OR REPLACE FUNCTION public.server_supplier_buyer_order_status_v1(
  p_buyer_id uuid,
  p_order_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_handshake private.supplier_order_handshakes%ROWTYPE;
  v_shipment private.supplier_leg_shipments%ROWTYPE;
  v_buyer_status text;
  v_support_required boolean:=false;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id=p_order_id AND "buyerId"=p_buyer_id
    AND "commercialMode"='loadify_supplier_fulfilled';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_order_not_found','interfaceVersion',1);
  END IF;

  SELECT * INTO v_handshake
  FROM private.supplier_order_handshakes
  WHERE order_id=v_order.id
  ORDER BY updated_at DESC LIMIT 1;

  SELECT * INTO v_shipment
  FROM private.supplier_leg_shipments
  WHERE order_id=v_order.id
  ORDER BY updated_at DESC LIMIT 1;
  v_buyer_status:=CASE
    WHEN v_order.status='awaiting_payment' THEN 'awaiting_payment'
    WHEN v_order.status IN ('cancelled','refunded') THEN v_order.status
    WHEN v_shipment.canonical_status='delivered' THEN 'delivered'
    WHEN v_shipment.canonical_status='out_for_delivery' THEN 'out_for_delivery'
    WHEN v_shipment.canonical_status='in_transit' THEN 'in_transit'
    WHEN v_shipment.canonical_status='dispatched' THEN 'shipped'
    WHEN v_shipment.canonical_status IN ('failed_delivery','exception') THEN 'delivery_exception'
    WHEN v_shipment.canonical_status='returned' THEN 'returned'
    WHEN v_handshake.state IN ('rejected','reconciliation_required') THEN 'supplier_issue'
    WHEN v_order.status='paid' THEN 'processing'
    ELSE lower(v_order.status)
  END;

  v_support_required :=
    v_buyer_status IN ('delivery_exception','supplier_issue');

  RETURN jsonb_build_object(
    'ok',true,
    'orderId',v_order.id,
    'orderNumber',v_order."orderNumber",
    'status',v_buyer_status,
    'paymentStatus',CASE WHEN v_order.status='awaiting_payment' THEN 'pending' ELSE 'paid' END,
    'supplierConfirmation',CASE
      WHEN v_handshake.id IS NULL THEN 'pending'
      WHEN v_handshake.state='reconciled' THEN 'confirmed'
      WHEN v_handshake.state IN ('rejected','reconciliation_required') THEN 'issue'
      ELSE 'pending'
    END,
    'tracking',CASE
      WHEN v_shipment.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'status',v_shipment.canonical_status,
        'carrierRef',v_shipment.carrier_ref,
        'trackingRef',v_shipment.tracking_ref,
        'lastEventAt',v_shipment.last_event_at,
        'deliveredAt',v_shipment.delivered_at
      )
    END,
    'supportRequired',v_support_required,
    'updatedAt',GREATEST(
      COALESCE(v_order."updatedAt",v_order."createdAt"),
      COALESCE(v_handshake.updated_at,v_order."createdAt"),
      COALESCE(v_shipment.updated_at,v_order."createdAt")
    ),
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_buyer_order_status_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_buyer_order_status_v1(uuid,uuid)
TO service_role;
CREATE OR REPLACE FUNCTION public.server_project_supplier_tracking_to_order_v1(
  p_order_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_shipment private.supplier_leg_shipments%ROWTYPE;
  v_target text;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id=p_order_id AND "commercialMode"='loadify_supplier_fulfilled'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_order_not_found','interfaceVersion',1);
  END IF;

  SELECT * INTO v_shipment FROM private.supplier_leg_shipments
  WHERE order_id=v_order.id ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',true,'reason','no_tracking_projection_yet','interfaceVersion',1);
  END IF;

  v_target:=CASE
    WHEN v_shipment.canonical_status='delivered' THEN 'delivered'
    WHEN v_shipment.canonical_status IN ('dispatched','in_transit','out_for_delivery') THEN 'shipped'
    ELSE NULL
  END;
  IF v_target='delivered' AND v_order.status IN ('paid','packed','shipped') THEN
    UPDATE public.orders
      SET status='delivered',
          "trackingNumber"=COALESCE("trackingNumber",v_shipment.tracking_ref),
          "deliveredAt"=COALESCE("deliveredAt",v_shipment.delivered_at,now()),
          "updatedAt"=now()
    WHERE id=v_order.id;
  ELSIF v_target='shipped' AND v_order.status IN ('paid','packed') THEN
    UPDATE public.orders
      SET status='shipped',
          "trackingNumber"=COALESCE("trackingNumber",v_shipment.tracking_ref),
          "updatedAt"=now()
    WHERE id=v_order.id;
  ELSIF v_shipment.tracking_ref IS NOT NULL AND v_order."trackingNumber" IS NULL THEN
    UPDATE public.orders
      SET "trackingNumber"=v_shipment.tracking_ref,"updatedAt"=now()
    WHERE id=v_order.id;
  END IF;

  RETURN jsonb_build_object(
    'ok',true,'orderId',v_order.id,
    'trackingStatus',v_shipment.canonical_status,
    'projectedStatus',COALESCE(v_target,v_order.status),
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_project_supplier_tracking_to_order_v1(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_project_supplier_tracking_to_order_v1(uuid)
TO service_role;
