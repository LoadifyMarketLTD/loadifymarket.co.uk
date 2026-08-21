-- 635_supplier_order_orchestrator_runtime_guards.sql
-- Phase I runtime: risk decision, atomic supplier reservation and orchestration state.
-- Uses existing public.orders/public.order_items as customer order truth and Phase H stock/price readiness.

CREATE OR REPLACE FUNCTION private.guard_supplier_commerce_risk_immutable_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  RAISE EXCEPTION 'commerce risk assessments are append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_commerce_risk_immutable_v1 ON private.supplier_commerce_risk_assessments;
CREATE TRIGGER trg_guard_supplier_commerce_risk_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_commerce_risk_assessments
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_commerce_risk_immutable_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_fulfilment_item_identity_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_order_id uuid;
  v_leg_order_id uuid;
  v_item_product_id uuid;
  v_offer private.supplier_offers%ROWTYPE;
BEGIN
  SELECT oi."orderId", oi."productId" INTO v_order_id, v_item_product_id
    FROM public.order_items oi WHERE oi.id=NEW.order_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'canonical order item required'; END IF;

  SELECT o.order_id INTO v_leg_order_id
    FROM private.supplier_fulfilment_legs l
    JOIN private.supplier_order_orchestrations o ON o.id=l.orchestration_id
   WHERE l.id=NEW.leg_id;
  IF NOT FOUND OR v_leg_order_id<>v_order_id THEN
    RAISE EXCEPTION 'fulfilment leg item must belong to the same canonical customer order';
  END IF;

  IF NEW.supplier_offer_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM private.supplier_offers WHERE id=NEW.supplier_offer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'supplier offer not found'; END IF;
    IF NEW.canonical_product_id IS DISTINCT FROM v_offer.canonical_product_id THEN
      RAISE EXCEPTION 'fulfilment item canonical product must match supplier offer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_fulfilment_item_identity_v1 ON private.supplier_fulfilment_leg_items;
CREATE TRIGGER trg_guard_supplier_fulfilment_item_identity_v1
BEFORE INSERT OR UPDATE ON private.supplier_fulfilment_leg_items
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_fulfilment_item_identity_v1();

CREATE OR REPLACE FUNCTION public.server_supplier_commerce_risk_decision_v1(
  p_order_id uuid,
  p_subject_type text,
  p_subject_ref text,
  p_signals jsonb,
  p_policy_key text DEFAULT 'supplier_commerce_default',
  p_idempotency_key text DEFAULT NULL,
  p_orchestration_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_subject text:=lower(BTRIM(COALESCE(p_subject_type,'')));
  v_ref text:=NULLIF(BTRIM(p_subject_ref),'');
  v_policy private.supplier_commerce_risk_policy_versions%ROWTYPE;
  v_existing private.supplier_commerce_risk_assessments%ROWTYPE;
  v_score integer:=0;
  v_action text;
  v_reason text;
  v_idem text:=NULLIF(BTRIM(p_idempotency_key),'');
  v_value jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id=p_order_id) THEN
    RETURN jsonb_build_object('eligible',false,'reason','order_not_found','interfaceVersion',1);
  END IF;
  IF v_subject NOT IN ('buyer','supplier','order','platform') OR v_ref IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_risk_subject','interfaceVersion',1);
  END IF;
  IF p_signals IS NULL OR jsonb_typeof(p_signals)<>'object' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_risk_signals','interfaceVersion',1);
  END IF;
  IF p_signals::text ~* '(password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|card(number)?)' THEN
    RETURN jsonb_build_object('eligible',false,'reason','secret_bearing_risk_payload_rejected','interfaceVersion',1);
  END IF;

  SELECT * INTO v_policy
    FROM private.supplier_commerce_risk_policy_versions p
   WHERE p.policy_key=BTRIM(COALESCE(p_policy_key,'supplier_commerce_default'))
     AND p.status='approved'
     AND p.effective_from<=now()
     AND (p.effective_to IS NULL OR p.effective_to>now())
   ORDER BY p.version DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','risk_policy_missing','interfaceVersion',1);
  END IF;

  -- Score only explicit server-provided 0..100 numeric signals. Booleans true are treated as 100.
  FOR v_value IN SELECT value FROM jsonb_each(p_signals) LOOP
    IF jsonb_typeof(v_value)='number' THEN
      v_score:=GREATEST(v_score,LEAST(100,GREATEST(0,(v_value::text)::numeric::integer)));
    ELSIF jsonb_typeof(v_value)='boolean' AND (v_value::text)::boolean THEN
      v_score:=100;
    END IF;
  END LOOP;

  v_action:=CASE
    WHEN v_score>=v_policy.block_score THEN 'BLOCK'
    WHEN v_score>=v_policy.restrict_score THEN 'RESTRICT'
    WHEN v_score>=v_policy.hold_score THEN 'HOLD'
    WHEN v_score>=v_policy.review_score THEN 'REVIEW'
    ELSE 'ALLOW'
  END;
  v_reason:='policy_score_'||lower(v_action);

  IF v_idem IS NOT NULL THEN
    SELECT * INTO v_existing FROM private.supplier_commerce_risk_assessments WHERE idempotency_key=v_idem;
    IF FOUND THEN
      IF v_existing.order_id<>p_order_id OR v_existing.subject_type<>v_subject OR v_existing.subject_ref<>v_ref
         OR v_existing.policy_id<>v_policy.id OR v_existing.signals<>p_signals THEN
        RAISE EXCEPTION 'risk idempotency key collision with different evidence';
      END IF;
      RETURN jsonb_build_object('eligible',v_existing.action='ALLOW','reason',v_existing.reason,'action',v_existing.action,
        'riskScore',v_existing.risk_score,'assessmentId',v_existing.id,'policyId',v_existing.policy_id,'policyVersion',v_policy.version,'interfaceVersion',1);
    END IF;

    INSERT INTO private.supplier_commerce_risk_assessments(
      order_id,orchestration_id,subject_type,subject_ref,risk_score,action,policy_id,signals,reason,idempotency_key
    ) VALUES(p_order_id,p_orchestration_id,v_subject,v_ref,v_score,v_action,v_policy.id,p_signals,v_reason,v_idem)
    RETURNING * INTO v_existing;
  END IF;

  RETURN jsonb_build_object(
    'eligible',v_action='ALLOW','reason',v_reason,'action',v_action,'riskScore',v_score,
    'assessmentId',CASE WHEN v_existing.id IS NULL THEN NULL ELSE v_existing.id END,
    'policyId',v_policy.id,'policyVersion',v_policy.version,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_commerce_risk_decision_v1(uuid,text,text,jsonb,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commerce_risk_decision_v1(uuid,text,text,jsonb,text,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_reserve_supplier_offer_v1(
  p_order_id uuid,
  p_order_item_id uuid,
  p_supplier_offer_id uuid,
  p_commercial_mode text,
  p_quantity integer,
  p_territory text,
  p_external_variant_ref text,
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
  v_orch private.supplier_order_orchestrations%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_leg_item private.supplier_fulfilment_leg_items%ROWTYPE;
  v_existing private.supplier_stock_reservations%ROWTYPE;
  v_control jsonb;
  v_sync jsonb;
  v_risk jsonb;
  v_sellable integer;
  v_already_reserved integer:=0;
  v_available integer;
  v_reservation private.supplier_stock_reservations%ROWTYPE;
  v_leg_key text;
  v_variant text:=BTRIM(COALESCE(p_external_variant_ref,''));
BEGIN
  IF p_quantity IS NULL OR p_quantity<=0 OR p_reservation_minutes NOT BETWEEN 1 AND 60 THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_reservation_request','interfaceVersion',1);
  END IF;
  IF NULLIF(BTRIM(p_reservation_key),'') IS NULL OR NULLIF(BTRIM(p_orchestration_idempotency_key),'') IS NULL OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','idempotency_and_correlation_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_item FROM public.order_items WHERE id=p_order_item_id AND "orderId"=p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_item_not_found','interfaceVersion',1); END IF;
  IF p_quantity>v_item.quantity THEN RETURN jsonb_build_object('eligible',false,'reason','reservation_exceeds_order_quantity','interfaceVersion',1); END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=p_supplier_offer_id AND status='approved' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',1); END IF;
  IF p_commercial_mode<>'loadify_supplier_fulfilled' THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_reservation_requires_supplier_fulfilled_mode','interfaceVersion',1);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1('reservation',jsonb_build_object(
    'offerRef',v_offer.offer_key,'productRef',v_offer.canonical_product_id::text,'territory',upper(BTRIM(COALESCE(p_territory,'GB')))
  ));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_control_disabled','control',v_control,'interfaceVersion',1);
  END IF;

  INSERT INTO private.supplier_order_orchestrations(order_id,buyer_id,correlation_id,idempotency_key)
  VALUES(p_order_id,v_order."buyerId",p_correlation_id,BTRIM(p_orchestration_idempotency_key))
  ON CONFLICT (order_id) DO NOTHING;
  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=p_order_id FOR UPDATE;
  IF v_orch.idempotency_key<>BTRIM(p_orchestration_idempotency_key) THEN
    RAISE EXCEPTION 'order orchestration idempotency mismatch';
  END IF;

  v_risk:=public.server_supplier_commerce_risk_decision_v1(
    p_order_id,'order',p_order_id::text,COALESCE(p_risk_signals,'{}'::jsonb),p_risk_policy_key,
    'risk:'||BTRIM(p_reservation_key),v_orch.id
  );
  UPDATE private.supplier_order_orchestrations
     SET risk_state=lower(COALESCE(v_risk->>'action','block')),
         state=CASE COALESCE(v_risk->>'action','BLOCK') WHEN 'REVIEW' THEN 'review' WHEN 'HOLD' THEN 'hold' WHEN 'RESTRICT' THEN 'hold' WHEN 'BLOCK' THEN 'hold' ELSE state END,
         updated_at=now()
   WHERE id=v_orch.id;
  IF COALESCE((v_risk->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','commerce_risk_not_allowed','risk',v_risk,'orchestrationId',v_orch.id,'interfaceVersion',1);
  END IF;

  v_sync:=public.server_supplier_stock_price_decision_v1(
    p_supplier_offer_id,v_offer.canonical_product_id,p_commercial_mode,p_territory,v_variant
  );
  IF COALESCE((v_sync->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','stock_price_not_ready','sync',v_sync,'orchestrationId',v_orch.id,'interfaceVersion',1);
  END IF;
  IF v_sync->>'sellableQuantity' IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','sellable_quantity_unknown','sync',v_sync,'orchestrationId',v_orch.id,'interfaceVersion',1);
  END IF;
  v_sellable:=(v_sync->>'sellableQuantity')::integer;

  SELECT * INTO v_existing FROM private.supplier_stock_reservations WHERE reservation_key=BTRIM(p_reservation_key);
  IF FOUND THEN
    IF v_existing.order_id<>p_order_id OR v_existing.order_item_id<>p_order_item_id OR v_existing.supplier_offer_id<>p_supplier_offer_id
       OR v_existing.quantity<>p_quantity OR v_existing.external_variant_ref<>v_variant THEN
      RAISE EXCEPTION 'reservation idempotency key collision with different request';
    END IF;
    RETURN jsonb_build_object('eligible',v_existing.status='active','reason','reservation_replayed','reservationId',v_existing.id,
      'orchestrationId',v_existing.orchestration_id,'status',v_existing.status,'expiresAt',v_existing.expires_at,'interfaceVersion',1);
  END IF;

  -- Offer row is locked above; this serialises reservations for the offer so parallel requests cannot oversell sellable stock.
  SELECT COALESCE(SUM(r.quantity),0)::integer INTO v_already_reserved
    FROM private.supplier_stock_reservations r
   WHERE r.supplier_offer_id=p_supplier_offer_id
     AND r.external_variant_ref=v_variant
     AND r.status='active'
     AND r.expires_at>now();
  v_available:=GREATEST(v_sellable-v_already_reserved,0);
  IF p_quantity>v_available THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_capacity_exhausted','sellableQuantity',v_sellable,
      'alreadyReserved',v_already_reserved,'availableToReserve',v_available,'orchestrationId',v_orch.id,'interfaceVersion',1);
  END IF;

  v_leg_key:='supplier:'||p_supplier_offer_id::text;
  INSERT INTO private.supplier_fulfilment_legs(
    orchestration_id,leg_key,fulfiller_type,commercial_mode,supplier_offer_id,status,currency
  ) VALUES(v_orch.id,v_leg_key,'supplier','loadify_supplier_fulfilled',p_supplier_offer_id,'planned',v_sync->>'currency')
  ON CONFLICT (orchestration_id,leg_key) DO NOTHING;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE orchestration_id=v_orch.id AND leg_key=v_leg_key FOR UPDATE;

  INSERT INTO private.supplier_fulfilment_leg_items(
    leg_id,order_item_id,canonical_product_id,supplier_offer_id,quantity,external_variant_ref,pricing_snapshot_id
  ) VALUES(v_leg.id,p_order_item_id,v_offer.canonical_product_id,p_supplier_offer_id,p_quantity,v_variant,NULLIF(v_sync->>'pricingSnapshotId','')::uuid)
  ON CONFLICT (order_item_id) DO NOTHING;
  SELECT * INTO v_leg_item FROM private.supplier_fulfilment_leg_items WHERE order_item_id=p_order_item_id;
  IF v_leg_item.leg_id<>v_leg.id OR v_leg_item.supplier_offer_id<>p_supplier_offer_id OR v_leg_item.quantity<>p_quantity THEN
    RAISE EXCEPTION 'order item is already routed to a different fulfilment leg';
  END IF;

  INSERT INTO private.supplier_stock_reservations(
    orchestration_id,leg_item_id,order_id,order_item_id,supplier_offer_id,canonical_product_id,external_variant_ref,quantity,status,reservation_key,
    stock_observation_id,price_observation_id,pricing_snapshot_id,sync_policy_version,expires_at
  ) VALUES(
    v_orch.id,v_leg_item.id,p_order_id,p_order_item_id,p_supplier_offer_id,v_offer.canonical_product_id,v_variant,p_quantity,'active',BTRIM(p_reservation_key),
    (v_sync->>'stockObservationId')::uuid,(v_sync->>'priceObservationId')::uuid,(v_sync->>'pricingSnapshotId')::uuid,(v_sync->>'policyVersion')::integer,
    now()+make_interval(mins=>p_reservation_minutes)
  ) RETURNING * INTO v_reservation;

  UPDATE private.supplier_fulfilment_legs SET status='reserved',updated_at=now() WHERE id=v_leg.id;
  UPDATE private.supplier_order_orchestrations SET state='reserved',risk_state='allow',updated_at=now() WHERE id=v_orch.id;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_stock_reserved','orchestrationId',v_orch.id,'fulfilmentLegId',v_leg.id,'reservationId',v_reservation.id,
    'availableBeforeReservation',v_available,'reservedQuantity',p_quantity,'expiresAt',v_reservation.expires_at,
    'stockObservationId',v_reservation.stock_observation_id,'priceObservationId',v_reservation.price_observation_id,
    'pricingSnapshotId',v_reservation.pricing_snapshot_id,'risk',v_risk,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_reserve_supplier_offer_v1(uuid,uuid,uuid,text,integer,text,text,text,text,uuid,jsonb,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_reserve_supplier_offer_v1(uuid,uuid,uuid,text,integer,text,text,text,text,uuid,jsonb,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.server_release_supplier_reservation_v1(
  p_reservation_key text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_res private.supplier_stock_reservations%ROWTYPE; v_reason text:=NULLIF(BTRIM(p_reason),'');
BEGIN
  IF v_reason IS NULL THEN RAISE EXCEPTION 'reservation release reason required'; END IF;
  SELECT * INTO v_res FROM private.supplier_stock_reservations WHERE reservation_key=BTRIM(COALESCE(p_reservation_key,'')) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','reservation_not_found','interfaceVersion',1); END IF;
  IF v_res.status IN ('released','expired') THEN
    RETURN jsonb_build_object('ok',true,'reason','reservation_already_released','reservationId',v_res.id,'status',v_res.status,'interfaceVersion',1);
  END IF;
  IF v_res.status='consumed' THEN RETURN jsonb_build_object('ok',false,'reason','consumed_reservation_cannot_release','interfaceVersion',1); END IF;
  UPDATE private.supplier_stock_reservations SET status='released',released_at=now() WHERE id=v_res.id RETURNING * INTO v_res;
  UPDATE private.supplier_fulfilment_legs l SET status='released',updated_at=now()
   WHERE l.id=(SELECT i.leg_id FROM private.supplier_fulfilment_leg_items i WHERE i.id=v_res.leg_item_id);
  RETURN jsonb_build_object('ok',true,'reason','reservation_released','reservationId',v_res.id,'status',v_res.status,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_release_supplier_reservation_v1(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_release_supplier_reservation_v1(text,text) TO service_role;

COMMENT ON FUNCTION public.server_supplier_commerce_risk_decision_v1(uuid,text,text,jsonb,text,text,uuid) IS 'Phase I policy-driven ALLOW/REVIEW/HOLD/RESTRICT/BLOCK commerce-risk decision. It never bans accounts by itself.';
COMMENT ON FUNCTION public.server_reserve_supplier_offer_v1(uuid,uuid,uuid,text,integer,text,text,text,text,uuid,jsonb,text,integer) IS 'Phase I atomic supplier reservation attached to one existing public customer order and backed by Phase H stock/price evidence.';
