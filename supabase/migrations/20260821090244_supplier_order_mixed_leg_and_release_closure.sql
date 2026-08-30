-- 638_supplier_order_mixed_leg_and_release_closure.sql
-- Branch Guard closure: explicitly support non-supplier internal legs under the same public order,
-- and keep orchestration state accurate when a supplier reservation is released.

CREATE OR REPLACE FUNCTION public.server_plan_order_fulfilment_leg_v1(
  p_order_id uuid,
  p_order_item_id uuid,
  p_fulfiller_type text,
  p_commercial_mode text,
  p_seller_id uuid,
  p_orchestration_idempotency_key text,
  p_correlation_id uuid,
  p_risk_signals jsonb DEFAULT '{}'::jsonb,
  p_risk_policy_key text DEFAULT 'supplier_commerce_default'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_orch private.supplier_order_orchestrations%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_leg_item private.supplier_fulfilment_leg_items%ROWTYPE;
  v_control jsonb;
  v_risk jsonb;
  v_fulfiller text:=lower(BTRIM(COALESCE(p_fulfiller_type,'')));
  v_mode text:=lower(BTRIM(COALESCE(p_commercial_mode,'')));
  v_leg_key text;
BEGIN
  IF v_fulfiller NOT IN ('marketplace_seller','loadify_direct') THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_leg_requires_supplier_reservation_rpc','interfaceVersion',1);
  END IF;
  IF (v_fulfiller='marketplace_seller' AND v_mode<>'marketplace_seller') OR (v_fulfiller='loadify_direct' AND v_mode<>'loadify_direct') THEN
    RETURN jsonb_build_object('eligible',false,'reason','fulfiller_commercial_mode_mismatch','interfaceVersion',1);
  END IF;
  IF NULLIF(BTRIM(p_orchestration_idempotency_key),'') IS NULL OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','idempotency_and_correlation_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_item FROM public.order_items WHERE id=p_order_item_id AND "orderId"=p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_item_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_product FROM public.products WHERE id=v_item."productId";
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','product_not_found','interfaceVersion',1); END IF;

  IF v_fulfiller='marketplace_seller' AND (p_seller_id IS NULL OR v_product."sellerId"<>p_seller_id) THEN
    RETURN jsonb_build_object('eligible',false,'reason','marketplace_seller_identity_mismatch','interfaceVersion',1);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1('checkout',jsonb_build_object(
    'productRef',v_item."productId"::text,'territory','GB',
    'supplierRef',CASE WHEN v_fulfiller='marketplace_seller' THEN p_seller_id::text ELSE NULL END
  ));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','checkout_control_disabled','control',v_control,'interfaceVersion',1);
  END IF;

  INSERT INTO private.supplier_order_orchestrations(order_id,buyer_id,correlation_id,idempotency_key)
  VALUES(p_order_id,v_order."buyerId",p_correlation_id,BTRIM(p_orchestration_idempotency_key))
  ON CONFLICT(order_id) DO NOTHING;
  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=p_order_id FOR UPDATE;
  IF v_orch.idempotency_key<>BTRIM(p_orchestration_idempotency_key) THEN RAISE EXCEPTION 'order orchestration idempotency mismatch'; END IF;

  v_risk:=public.server_supplier_commerce_risk_decision_v1(
    p_order_id,'order',p_order_id::text,COALESCE(p_risk_signals,'{}'::jsonb),p_risk_policy_key,
    'risk:plan:'||p_order_item_id::text,v_orch.id
  );
  UPDATE private.supplier_order_orchestrations SET
    risk_state=lower(COALESCE(v_risk->>'action','block')),
    state=CASE COALESCE(v_risk->>'action','BLOCK') WHEN 'REVIEW' THEN 'review' WHEN 'HOLD' THEN 'hold' WHEN 'RESTRICT' THEN 'hold' WHEN 'BLOCK' THEN 'hold' ELSE state END,
    updated_at=now()
  WHERE id=v_orch.id;
  IF COALESCE((v_risk->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','commerce_risk_not_allowed','risk',v_risk,'orchestrationId',v_orch.id,'interfaceVersion',1);
  END IF;

  v_leg_key:=v_fulfiller||':'||COALESCE(p_seller_id::text,'loadify');
  INSERT INTO private.supplier_fulfilment_legs(
    orchestration_id,leg_key,fulfiller_type,commercial_mode,seller_id,status
  ) VALUES(v_orch.id,v_leg_key,v_fulfiller,v_mode,CASE WHEN v_fulfiller='marketplace_seller' THEN p_seller_id ELSE NULL END,'planned')
  ON CONFLICT(orchestration_id,leg_key) DO NOTHING;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE orchestration_id=v_orch.id AND leg_key=v_leg_key FOR UPDATE;

  INSERT INTO private.supplier_fulfilment_leg_items(leg_id,order_item_id,quantity,external_variant_ref)
  VALUES(v_leg.id,p_order_item_id,v_item.quantity,'')
  ON CONFLICT(order_item_id) DO NOTHING;
  SELECT * INTO v_leg_item FROM private.supplier_fulfilment_leg_items WHERE order_item_id=p_order_item_id;
  IF v_leg_item.leg_id<>v_leg.id THEN RAISE EXCEPTION 'order item is already routed to a different fulfilment leg'; END IF;

  UPDATE private.supplier_fulfilment_legs SET status='ready_for_payment',updated_at=now() WHERE id=v_leg.id;
  UPDATE private.supplier_order_orchestrations SET state='ready_for_payment',risk_state='allow',updated_at=now() WHERE id=v_orch.id;

  RETURN jsonb_build_object('eligible',true,'reason','fulfilment_leg_ready','orchestrationId',v_orch.id,'fulfilmentLegId',v_leg.id,
    'orderItemId',p_order_item_id,'fulfillerType',v_fulfiller,'commercialMode',v_mode,'risk',v_risk,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_plan_order_fulfilment_leg_v1(uuid,uuid,text,text,uuid,text,uuid,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_plan_order_fulfilment_leg_v1(uuid,uuid,text,text,uuid,text,uuid,jsonb,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_release_supplier_reservation_v1(
  p_reservation_key text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_res private.supplier_stock_reservations%ROWTYPE;
  v_reason text:=NULLIF(BTRIM(p_reason),'');
  v_leg_id uuid;
BEGIN
  IF v_reason IS NULL THEN RAISE EXCEPTION 'reservation release reason required'; END IF;
  SELECT * INTO v_res FROM private.supplier_stock_reservations WHERE reservation_key=BTRIM(COALESCE(p_reservation_key,'')) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','reservation_not_found','interfaceVersion',1); END IF;
  IF v_res.status IN ('released','expired') THEN
    RETURN jsonb_build_object('ok',true,'reason','reservation_already_released','reservationId',v_res.id,'status',v_res.status,'interfaceVersion',1);
  END IF;
  IF v_res.status='consumed' THEN RETURN jsonb_build_object('ok',false,'reason','consumed_reservation_cannot_release','interfaceVersion',1); END IF;

  UPDATE private.supplier_stock_reservations SET status='released',released_at=now() WHERE id=v_res.id RETURNING * INTO v_res;
  SELECT i.leg_id INTO v_leg_id FROM private.supplier_fulfilment_leg_items i WHERE i.id=v_res.leg_item_id;
  UPDATE private.supplier_fulfilment_legs SET status='released',updated_at=now() WHERE id=v_leg_id;
  UPDATE private.supplier_order_orchestrations o SET state='released',updated_at=now()
   WHERE o.id=v_res.orchestration_id
     AND NOT EXISTS (
       SELECT 1 FROM private.supplier_stock_reservations active
        WHERE active.orchestration_id=o.id AND active.status='active' AND active.expires_at>now()
     );

  RETURN jsonb_build_object('ok',true,'reason','reservation_released','reservationId',v_res.id,'status',v_res.status,
    'orchestrationId',v_res.orchestration_id,'releaseReason',v_reason,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_release_supplier_reservation_v1(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_release_supplier_reservation_v1(text,text) TO service_role;

COMMENT ON FUNCTION public.server_plan_order_fulfilment_leg_v1(uuid,uuid,text,text,uuid,text,uuid,jsonb,text) IS 'Phase I plans Marketplace Seller or Loadify Direct internal fulfilment legs under the existing public customer order. Supplier legs use the reservation RPC.';;
