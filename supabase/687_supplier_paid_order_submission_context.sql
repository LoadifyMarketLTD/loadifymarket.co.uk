-- 687_supplier_paid_order_submission_context.sql
-- Stage 6: expose one server-only, side-effect-free context for advancing a paid
-- Supplier-Fulfilled order into the existing provider-neutral handshake runtime.
-- This does not call a provider and does not enable Supplier Commerce.

CREATE OR REPLACE FUNCTION public.server_supplier_paid_order_submission_context_v1(
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_orch private.supplier_order_orchestrations%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_res private.supplier_stock_reservations%ROWTYPE;
  v_prep private.supplier_checkout_preparations%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('ready',false,'reason','order_id_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','order_not_found','interfaceVersion',1); END IF;
  IF v_order."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     OR v_order.status NOT IN ('paid','packed','shipped','delivered')
     OR NULLIF(BTRIM(v_order."stripePaymentIntentId"),'') IS NULL THEN
    RETURN jsonb_build_object('ready',false,'reason','paid_supplier_order_required','orderId',v_order.id,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=v_order.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_orchestration_missing','interfaceVersion',1); END IF;

  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs
   WHERE orchestration_id=v_orch.id
     AND fulfiller_type='supplier'
     AND commercial_mode='loadify_supplier_fulfilled'
     AND supplier_offer_id IS NOT NULL
   ORDER BY created_at ASC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_fulfilment_leg_missing','interfaceVersion',1); END IF;

  IF EXISTS(
    SELECT 1 FROM private.supplier_fulfilment_legs l
     WHERE l.orchestration_id=v_orch.id AND l.fulfiller_type='supplier' AND l.id<>v_leg.id
  ) THEN
    RETURN jsonb_build_object('ready',false,'reason','multi_supplier_leg_submission_not_supported','interfaceVersion',1);
  END IF;

  SELECT * INTO v_res FROM private.supplier_stock_reservations
   WHERE orchestration_id=v_orch.id AND supplier_offer_id=v_leg.supplier_offer_id
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_reservation_missing','interfaceVersion',1); END IF;

  SELECT * INTO v_prep FROM private.supplier_checkout_preparations
   WHERE order_id=v_order.id
     AND orchestration_id=v_orch.id
     AND fulfilment_leg_id=v_leg.id
     AND reservation_id=v_res.id
     AND state='paid';
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','paid_supplier_checkout_preparation_missing','interfaceVersion',1); END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=v_leg.supplier_offer_id AND status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_offer_not_ready','interfaceVersion',1); END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers
   WHERE id=v_offer.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_not_approved','interfaceVersion',1); END IF;

  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
   WHERE a.supplier_id=v_supplier.id
     AND a.status='active'
     AND a.interface_version=1
     AND a.verified_at IS NOT NULL
     AND a.capabilities @> ARRAY['order_submission','acknowledgement']::text[]
   ORDER BY a.verified_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_order_adapter_not_ready','interfaceVersion',1); END IF;

  RETURN jsonb_build_object(
    'ready',true,'reason','supplier_paid_order_submission_context_ready',
    'orderId',v_order.id,'fulfilmentLegId',v_leg.id,'reservationId',v_res.id,
    'supplierId',v_supplier.id,'supplierKey',v_supplier.supplier_key,
    'supplierOfferId',v_offer.id,'providerKey',v_adapter.provider_key,
    'adapterVersion',v_adapter.adapter_version,'correlationId',v_orch.correlation_id,
    'idempotencyKey','supplier-submit:'||v_order.id::text||':'||v_leg.id::text,
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_paid_order_submission_context_v1(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_paid_order_submission_context_v1(uuid)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_paid_order_submission_context_v1(uuid) IS
  'Stage 6 server-only paid-order routing context. It performs no provider side effect and does not bypass the supplier_order control enforced by the handshake preparation.';