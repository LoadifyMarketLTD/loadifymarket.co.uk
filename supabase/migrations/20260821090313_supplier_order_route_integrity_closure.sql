-- 639_supplier_order_route_integrity_closure.sql
-- Branch Guard closure: prevent mixed-mode identity contamination inside fulfilment legs/items.

ALTER TABLE private.supplier_fulfilment_legs
  DROP CONSTRAINT IF EXISTS supplier_fulfilment_leg_route_check;
ALTER TABLE private.supplier_fulfilment_legs
  ADD CONSTRAINT supplier_fulfilment_leg_route_check CHECK (
    (fulfiller_type='supplier' AND supplier_offer_id IS NOT NULL AND seller_id IS NULL AND commercial_mode='loadify_supplier_fulfilled')
    OR (fulfiller_type='loadify_direct' AND supplier_offer_id IS NULL AND seller_id IS NULL AND commercial_mode='loadify_direct')
    OR (fulfiller_type='marketplace_seller' AND supplier_offer_id IS NULL AND seller_id IS NOT NULL AND commercial_mode='marketplace_seller')
  );

CREATE OR REPLACE FUNCTION private.guard_supplier_fulfilment_item_identity_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_order_id uuid;
  v_leg_order_id uuid;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
BEGIN
  SELECT oi."orderId" INTO v_order_id FROM public.order_items oi WHERE oi.id=NEW.order_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'canonical order item required'; END IF;

  SELECT l.* INTO v_leg FROM private.supplier_fulfilment_legs l WHERE l.id=NEW.leg_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'fulfilment leg required'; END IF;
  SELECT o.order_id INTO v_leg_order_id FROM private.supplier_order_orchestrations o WHERE o.id=v_leg.orchestration_id;
  IF NOT FOUND OR v_leg_order_id<>v_order_id THEN
    RAISE EXCEPTION 'fulfilment leg item must belong to the same canonical customer order';
  END IF;

  IF v_leg.fulfiller_type='supplier' THEN
    IF NEW.supplier_offer_id IS NULL OR NEW.supplier_offer_id<>v_leg.supplier_offer_id OR NEW.canonical_product_id IS NULL THEN
      RAISE EXCEPTION 'supplier fulfilment item must use the leg supplier offer and canonical product';
    END IF;
    SELECT * INTO v_offer FROM private.supplier_offers WHERE id=NEW.supplier_offer_id;
    IF NOT FOUND OR NEW.canonical_product_id IS DISTINCT FROM v_offer.canonical_product_id THEN
      RAISE EXCEPTION 'fulfilment item canonical product must match supplier offer';
    END IF;
  ELSE
    IF NEW.supplier_offer_id IS NOT NULL THEN
      RAISE EXCEPTION 'non-supplier fulfilment item cannot carry supplier offer identity';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

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
  IF v_fulfiller='loadify_direct' AND p_seller_id IS NOT NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','loadify_direct_does_not_accept_marketplace_seller_identity','interfaceVersion',1);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1('checkout',jsonb_build_object(
    'productRef',v_item."productId"::text,'territory','GB'
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

  v_leg_key:=v_fulfiller||':'||CASE WHEN v_fulfiller='marketplace_seller' THEN p_seller_id::text ELSE 'loadify' END;
  INSERT INTO private.supplier_fulfilment_legs(orchestration_id,leg_key,fulfiller_type,commercial_mode,seller_id,status)
  VALUES(v_orch.id,v_leg_key,v_fulfiller,v_mode,CASE WHEN v_fulfiller='marketplace_seller' THEN p_seller_id ELSE NULL END,'planned')
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

COMMENT ON CONSTRAINT supplier_fulfilment_leg_route_check ON private.supplier_fulfilment_legs IS 'Phase I route identity is exclusive by fulfiller mode; supplier/seller identities cannot leak across leg types.';;
