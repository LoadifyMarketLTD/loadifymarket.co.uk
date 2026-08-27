-- 684_supplier_reservation_policy_evidence_closure.sql
-- Stage 5B closure: reservation evidence must retain the exact Phase H sync policy
-- version used for stock/price truth. Never hard-code policy version 1.

CREATE OR REPLACE FUNCTION public.server_reserve_supplier_checkout_v2(
  p_order_id uuid,
  p_order_item_id uuid,
  p_reservation_key text,
  p_orchestration_idempotency_key text,
  p_correlation_id uuid,
  p_risk_signals jsonb DEFAULT '{}'::jsonb,
  p_risk_policy_key text DEFAULT 'supplier_commerce_default',
  p_reservation_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_shipping private.supplier_shipping_decisions%ROWTYPE;
  v_checkout jsonb;
  v_sync jsonb;
  v_control jsonb;
  v_risk jsonb;
  v_orch private.supplier_order_orchestrations%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_leg_item private.supplier_fulfilment_leg_items%ROWTYPE;
  v_existing private.supplier_stock_reservations%ROWTYPE;
  v_reservation private.supplier_stock_reservations%ROWTYPE;
  v_sellable integer;
  v_already_reserved integer:=0;
  v_available integer;
  v_res_key text:=BTRIM(COALESCE(p_reservation_key,''));
  v_orch_key text:=BTRIM(COALESCE(p_orchestration_idempotency_key,''));
BEGIN
  IF p_order_id IS NULL OR p_order_item_id IS NULL OR v_res_key='' OR v_orch_key=''
     OR p_correlation_id IS NULL OR p_reservation_minutes NOT BETWEEN 1 AND 60
     OR jsonb_typeof(COALESCE(p_risk_signals,'{}'::jsonb))<>'object' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_supplier_checkout_reservation','interfaceVersion',2);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_not_found','interfaceVersion',2); END IF;
  IF v_order.status<>'awaiting_payment'
     OR v_order."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     OR v_order."sellerId" IS NOT NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','canonical_supplier_order_not_awaiting_payment','interfaceVersion',2);
  END IF;

  SELECT * INTO v_item FROM public.order_items
   WHERE id=p_order_item_id AND "orderId"=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_item_not_found','interfaceVersion',2); END IF;
  IF v_item."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     OR v_item."supplierOfferIdSnapshot" IS NULL
     OR v_item."supplierCanonicalProductIdSnapshot" IS NULL
     OR v_item."supplierShippingDecisionIdSnapshot" IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_item_route_incomplete','interfaceVersion',2);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id=v_item."supplierOfferIdSnapshot"
     AND canonical_product_id=v_item."supplierCanonicalProductIdSnapshot"
     AND status='approved' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',2); END IF;

  SELECT * INTO v_shipping FROM private.supplier_shipping_decisions
   WHERE id=v_item."supplierShippingDecisionIdSnapshot"
     AND public_product_id=v_item."productId"
     AND supplier_offer_id=v_offer.id
     AND service_ref=v_item."supplierShippingServiceRefSnapshot"
     AND currency='GBP';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_shipping_identity_mismatch','interfaceVersion',2); END IF;

  v_checkout:=public.server_supplier_listing_checkout_decision_v1(v_item."productId",v_item.quantity);
  IF COALESCE((v_checkout->>'eligible')::boolean,false) IS DISTINCT FROM true
     OR (v_checkout->>'supplierOfferId')::uuid IS DISTINCT FROM v_offer.id
     OR (v_checkout->>'canonicalProductId')::uuid IS DISTINCT FROM v_offer.canonical_product_id
     OR (v_checkout->>'pricingSnapshotId') IS DISTINCT FROM v_item."taxTreatmentSnapshot"->>'pricingSnapshotId' THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_checkout_recheck_failed','checkout',v_checkout,'interfaceVersion',2);
  END IF;

  v_sync:=public.server_supplier_stock_price_decision_v1(
    v_offer.id,v_offer.canonical_product_id,'loadify_supplier_fulfilled',v_offer.territory,v_item."supplierVariantRefSnapshot"
  );
  IF COALESCE((v_sync->>'eligible')::boolean,false) IS DISTINCT FROM true
     OR (v_sync->>'pricingSnapshotId') IS DISTINCT FROM v_item."taxTreatmentSnapshot"->>'pricingSnapshotId'
     OR (v_sync->>'stockObservationId') IS DISTINCT FROM v_checkout->>'stockObservationId'
     OR (v_sync->>'priceObservationId') IS DISTINCT FROM v_checkout->>'priceObservationId'
     OR NULLIF(v_sync->>'policyVersion','') IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_sync_evidence_changed_during_reservation','sync',v_sync,'interfaceVersion',2);
  END IF;
  v_sellable:=(v_sync->>'sellableQuantity')::integer;

  v_control:=public.server_supplier_commerce_control_decision_v1('reservation',jsonb_build_object(
    'supplierRef',v_offer.supplier_id::text,'offerRef',v_offer.id::text,
    'productRef',v_offer.canonical_product_id::text,'territory',v_offer.territory
  ));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_control_disabled','control',v_control,'interfaceVersion',2);
  END IF;

  INSERT INTO private.supplier_order_orchestrations(order_id,buyer_id,correlation_id,idempotency_key)
  VALUES(v_order.id,v_order."buyerId",p_correlation_id,v_orch_key)
  ON CONFLICT(order_id) DO NOTHING;
  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=v_order.id FOR UPDATE;
  IF v_orch.idempotency_key<>v_orch_key OR v_orch.correlation_id<>p_correlation_id THEN
    RAISE EXCEPTION 'supplier checkout orchestration idempotency mismatch';
  END IF;

  v_risk:=public.server_supplier_commerce_risk_decision_v1(
    v_order.id,'order',v_order.id::text,COALESCE(p_risk_signals,'{}'::jsonb),p_risk_policy_key,
    'risk:'||v_res_key,v_orch.id
  );
  UPDATE private.supplier_order_orchestrations
     SET risk_state=lower(COALESCE(v_risk->>'action','block')),
         state=CASE COALESCE(v_risk->>'action','BLOCK') WHEN 'REVIEW' THEN 'review' WHEN 'HOLD' THEN 'hold' WHEN 'RESTRICT' THEN 'hold' WHEN 'BLOCK' THEN 'hold' ELSE state END,
         updated_at=now()
   WHERE id=v_orch.id;
  IF COALESCE((v_risk->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','commerce_risk_not_allowed','risk',v_risk,'orchestrationId',v_orch.id,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_existing FROM private.supplier_stock_reservations WHERE reservation_key=v_res_key;
  IF FOUND THEN
    IF v_existing.order_id<>v_order.id OR v_existing.order_item_id<>v_item.id
       OR v_existing.supplier_offer_id<>v_offer.id OR v_existing.quantity<>v_item.quantity
       OR v_existing.canonical_product_id<>v_offer.canonical_product_id
       OR v_existing.pricing_snapshot_id::text IS DISTINCT FROM v_sync->>'pricingSnapshotId'
       OR v_existing.stock_observation_id::text IS DISTINCT FROM v_sync->>'stockObservationId'
       OR v_existing.price_observation_id::text IS DISTINCT FROM v_sync->>'priceObservationId'
       OR v_existing.sync_policy_version IS DISTINCT FROM (v_sync->>'policyVersion')::integer THEN
      RAISE EXCEPTION 'supplier checkout reservation idempotency collision';
    END IF;
    RETURN jsonb_build_object(
      'eligible',v_existing.status='active' AND v_existing.expires_at>now(),
      'reason','supplier_checkout_reservation_replayed','reservationId',v_existing.id,
      'orchestrationId',v_existing.orchestration_id,
      'fulfilmentLegId',(SELECT li.leg_id FROM private.supplier_fulfilment_leg_items li WHERE li.id=v_existing.leg_item_id),
      'status',v_existing.status,'expiresAt',v_existing.expires_at,
      'stockObservationId',v_existing.stock_observation_id,'priceObservationId',v_existing.price_observation_id,
      'pricingSnapshotId',v_existing.pricing_snapshot_id,'syncPolicyVersion',v_existing.sync_policy_version,'interfaceVersion',2
    );
  END IF;

  SELECT COALESCE(SUM(r.quantity),0)::integer INTO v_already_reserved
    FROM private.supplier_stock_reservations r
   WHERE r.supplier_offer_id=v_offer.id
     AND r.external_variant_ref=v_item."supplierVariantRefSnapshot"
     AND r.status='active' AND r.expires_at>now();
  v_available:=GREATEST(v_sellable-v_already_reserved,0);
  IF v_item.quantity>v_available THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_capacity_exhausted',
      'sellableQuantity',v_sellable,'alreadyReserved',v_already_reserved,'availableToReserve',v_available,
      'orchestrationId',v_orch.id,'interfaceVersion',2);
  END IF;

  INSERT INTO private.supplier_fulfilment_legs(
    orchestration_id,leg_key,fulfiller_type,commercial_mode,supplier_offer_id,status,currency
  ) VALUES(v_orch.id,'supplier:'||v_offer.id::text,'supplier','loadify_supplier_fulfilled',v_offer.id,'planned','GBP')
  ON CONFLICT(orchestration_id,leg_key) DO NOTHING;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs
   WHERE orchestration_id=v_orch.id AND leg_key='supplier:'||v_offer.id::text FOR UPDATE;

  INSERT INTO private.supplier_fulfilment_leg_items(
    leg_id,order_item_id,canonical_product_id,supplier_offer_id,quantity,external_variant_ref,pricing_snapshot_id
  ) VALUES(
    v_leg.id,v_item.id,v_offer.canonical_product_id,v_offer.id,v_item.quantity,
    v_item."supplierVariantRefSnapshot",(v_sync->>'pricingSnapshotId')::uuid
  ) ON CONFLICT(order_item_id) DO NOTHING;
  SELECT * INTO v_leg_item FROM private.supplier_fulfilment_leg_items WHERE order_item_id=v_item.id;
  IF v_leg_item.leg_id<>v_leg.id OR v_leg_item.supplier_offer_id<>v_offer.id
     OR v_leg_item.canonical_product_id<>v_offer.canonical_product_id OR v_leg_item.quantity<>v_item.quantity THEN
    RAISE EXCEPTION 'supplier checkout order item already routed differently';
  END IF;

  INSERT INTO private.supplier_stock_reservations(
    orchestration_id,leg_item_id,order_id,order_item_id,supplier_offer_id,canonical_product_id,
    external_variant_ref,quantity,status,reservation_key,stock_observation_id,price_observation_id,
    pricing_snapshot_id,sync_policy_version,expires_at
  ) VALUES(
    v_orch.id,v_leg_item.id,v_order.id,v_item.id,v_offer.id,v_offer.canonical_product_id,
    v_item."supplierVariantRefSnapshot",v_item.quantity,'active',v_res_key,
    (v_sync->>'stockObservationId')::uuid,(v_sync->>'priceObservationId')::uuid,
    (v_sync->>'pricingSnapshotId')::uuid,(v_sync->>'policyVersion')::integer,
    now()+make_interval(mins=>p_reservation_minutes)
  ) RETURNING * INTO v_reservation;

  UPDATE private.supplier_fulfilment_legs SET status='reserved',updated_at=now() WHERE id=v_leg.id;
  UPDATE private.supplier_order_orchestrations SET state='reserved',risk_state='allow',updated_at=now() WHERE id=v_orch.id;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_checkout_stock_reserved','reservationId',v_reservation.id,
    'orchestrationId',v_orch.id,'fulfilmentLegId',v_leg.id,'expiresAt',v_reservation.expires_at,
    'stockObservationId',v_reservation.stock_observation_id,'priceObservationId',v_reservation.price_observation_id,
    'pricingSnapshotId',v_reservation.pricing_snapshot_id,'syncPolicyVersion',v_reservation.sync_policy_version,
    'availableBeforeReservation',v_available,'reservedQuantity',v_item.quantity,'risk',v_risk,'interfaceVersion',2
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_reserve_supplier_checkout_v2(uuid,uuid,text,text,uuid,jsonb,text,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_reserve_supplier_checkout_v2(uuid,uuid,text,text,uuid,jsonb,text,integer)
  TO service_role;

COMMENT ON FUNCTION public.server_reserve_supplier_checkout_v2(uuid,uuid,text,text,uuid,jsonb,text,integer) IS
  'Stage 5B reservation closure. Persists the exact current stock observation, price observation, pricing snapshot and sync policy version used at reservation time.';