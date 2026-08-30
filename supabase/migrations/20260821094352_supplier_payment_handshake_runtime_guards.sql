-- 641_supplier_payment_handshake_runtime_guards.sql
-- Phase J runtime guards: immutable payment evidence, idempotent preparation/submission state,
-- payment proof, stock/price recheck and fail-closed supplier_order control.

CREATE OR REPLACE FUNCTION private.guard_supplier_payment_evidence_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier payment evidence snapshots are immutable';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_payment_evidence_immutable_v1 ON private.supplier_payment_evidence_snapshots;
CREATE TRIGGER trg_guard_supplier_payment_evidence_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_payment_evidence_snapshots
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_payment_evidence_immutable_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_order_handshake_event_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier order handshake events are append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_handshake_event_immutable_v1 ON private.supplier_order_handshake_events;
CREATE TRIGGER trg_guard_supplier_order_handshake_event_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_order_handshake_events
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_handshake_event_immutable_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_order_handshake_identity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (
    NEW.order_id IS DISTINCT FROM OLD.order_id OR
    NEW.orchestration_id IS DISTINCT FROM OLD.orchestration_id OR
    NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id OR
    NEW.reservation_id IS DISTINCT FROM OLD.reservation_id OR
    NEW.payment_evidence_id IS DISTINCT FROM OLD.payment_evidence_id OR
    NEW.supplier_offer_id IS DISTINCT FROM OLD.supplier_offer_id OR
    NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR
    NEW.provider_key IS DISTINCT FROM OLD.provider_key OR
    NEW.adapter_version IS DISTINCT FROM OLD.adapter_version OR
    NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
    NEW.correlation_id IS DISTINCT FROM OLD.correlation_id OR
    NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
  ) THEN
    RAISE EXCEPTION 'supplier order handshake identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_handshake_identity_v1 ON private.supplier_order_handshakes;
CREATE TRIGGER trg_guard_supplier_order_handshake_identity_v1
BEFORE UPDATE ON private.supplier_order_handshakes
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_handshake_identity_v1();

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_order_handshake_v1(
  p_order_id uuid,
  p_fulfilment_leg_id uuid,
  p_idempotency_key text,
  p_correlation_id uuid
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
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_res private.supplier_stock_reservations%ROWTYPE;
  v_payment public.payment_sessions%ROWTYPE;
  v_payment_evidence private.supplier_payment_evidence_snapshots%ROWTYPE;
  v_handshake private.supplier_order_handshakes%ROWTYPE;
  v_control jsonb;
  v_sync jsonb;
  v_quantity integer;
  v_destination_country text;
  v_fingerprint text;
BEGIN
  IF NULLIF(BTRIM(p_idempotency_key),'') IS NULL OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','idempotency_and_correlation_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_not_found','interfaceVersion',1); END IF;
  IF v_order.status NOT IN ('paid','packed','shipped','delivered') OR NULLIF(BTRIM(v_order."stripePaymentIntentId"),'') IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','canonical_payment_not_proven','interfaceVersion',1);
  END IF;

  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_orchestration_missing','interfaceVersion',1); END IF;

  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs
   WHERE id=p_fulfilment_leg_id AND orchestration_id=v_orch.id FOR UPDATE;
  IF NOT FOUND OR v_leg.fulfiller_type<>'supplier' OR v_leg.commercial_mode<>'loadify_supplier_fulfilled' OR v_leg.supplier_offer_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_fulfilment_leg_not_ready','interfaceVersion',1);
  END IF;
  IF v_leg.status NOT IN ('reserved','supplier_submitting','supplier_pending','reconciliation_required') THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_fulfilment_leg_state_invalid','state',v_leg.status,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=v_leg.supplier_offer_id AND status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',1); END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_offer.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',1); END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1('supplier_order',jsonb_build_object(
    'supplierRef',v_supplier.supplier_key,'offerRef',v_offer.offer_key,'productRef',v_offer.canonical_product_id::text,'territory',v_offer.territory
  ));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_control_disabled','control',v_control,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_res FROM private.supplier_stock_reservations
   WHERE orchestration_id=v_orch.id AND supplier_offer_id=v_offer.id AND status='active' AND expires_at>now()
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','active_supplier_reservation_missing','interfaceVersion',1); END IF;

  SELECT COALESCE(SUM(i.quantity),0)::integer INTO v_quantity
    FROM private.supplier_fulfilment_leg_items i WHERE i.leg_id=v_leg.id;
  IF v_quantity<=0 OR v_quantity<>v_res.quantity THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_quantity_mismatch','interfaceVersion',1);
  END IF;

  SELECT * INTO v_payment FROM public.payment_sessions ps
   WHERE ps."orderId"=v_order.id
     AND ps.status='completed'
     AND ps."stripePaymentIntent"=v_order."stripePaymentIntentId"
   ORDER BY ps."updatedAt" DESC LIMIT 1;
  IF NOT FOUND OR v_payment.amount<>v_order.total OR upper(BTRIM(v_payment.currency))<>'GBP' THEN
    RETURN jsonb_build_object('eligible',false,'reason','canonical_payment_evidence_mismatch','interfaceVersion',1);
  END IF;

  v_sync:=public.server_supplier_stock_price_decision_v1(
    v_offer.id,v_offer.canonical_product_id,'loadify_supplier_fulfilled',v_offer.territory,v_res.external_variant_ref
  );
  IF COALESCE((v_sync->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_stock_price_recheck_failed','sync',v_sync,'interfaceVersion',1);
  END IF;
  IF (v_sync->>'pricingSnapshotId')::uuid IS DISTINCT FROM v_res.pricing_snapshot_id THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_price_changed_since_reservation','sync',v_sync,'interfaceVersion',1);
  END IF;
  IF v_sync->>'sellableQuantity' IS NULL OR (v_sync->>'sellableQuantity')::integer < v_quantity THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_stock_changed_since_reservation','sync',v_sync,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
   WHERE a.supplier_id=v_supplier.id AND a.status='active' AND a.interface_version=1
     AND a.capabilities @> ARRAY['order_submission','acknowledgement']::text[]
   ORDER BY a.verified_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_order_adapter_not_ready','interfaceVersion',1); END IF;

  INSERT INTO private.supplier_payment_evidence_snapshots(
    order_id,payment_session_id,payment_intent_ref,payment_status,order_status,amount,currency
  ) VALUES(v_order.id,v_payment.id,v_order."stripePaymentIntentId",v_payment.status,v_order.status,v_payment.amount,upper(v_payment.currency))
  ON CONFLICT(order_id) DO NOTHING;
  SELECT * INTO v_payment_evidence FROM private.supplier_payment_evidence_snapshots WHERE order_id=v_order.id;
  IF v_payment_evidence.payment_intent_ref<>v_order."stripePaymentIntentId" OR v_payment_evidence.amount<>v_payment.amount THEN
    RAISE EXCEPTION 'payment evidence identity mismatch for order';
  END IF;

  v_destination_country:=upper(BTRIM(COALESCE(
    v_order."shippingAddress"->>'countryCode',v_order."shippingAddress"->>'country','GB'
  )));
  IF v_destination_country='' THEN v_destination_country:='GB'; END IF;

  v_fingerprint:=md5(concat_ws('|',v_order.id::text,v_leg.id::text,v_res.id::text,v_payment_evidence.id::text,
    v_offer.id::text,v_offer.external_offer_ref,v_quantity::text,v_destination_country));

  SELECT * INTO v_handshake FROM private.supplier_order_handshakes WHERE fulfilment_leg_id=v_leg.id FOR UPDATE;
  IF FOUND THEN
    IF v_handshake.idempotency_key<>BTRIM(p_idempotency_key) OR v_handshake.request_fingerprint<>v_fingerprint THEN
      RAISE EXCEPTION 'supplier order handshake idempotency collision with different request';
    END IF;
  ELSE
    INSERT INTO private.supplier_order_handshakes(
      order_id,orchestration_id,fulfilment_leg_id,reservation_id,payment_evidence_id,supplier_offer_id,supplier_id,
      provider_key,adapter_version,idempotency_key,correlation_id,request_fingerprint
    ) VALUES(
      v_order.id,v_orch.id,v_leg.id,v_res.id,v_payment_evidence.id,v_offer.id,v_supplier.id,
      v_adapter.provider_key,v_adapter.adapter_version,BTRIM(p_idempotency_key),p_correlation_id,v_fingerprint
    ) RETURNING * INTO v_handshake;
    INSERT INTO private.supplier_order_handshake_events(handshake_id,event_key,event,new_state,reason,metadata)
    VALUES(v_handshake.id,'prepared:'||v_handshake.id::text,'prepared','prepared','payment_and_supplier_readiness_verified',
      jsonb_build_object('paymentEvidenceId',v_payment_evidence.id,'reservationId',v_res.id,'pricingSnapshotId',v_res.pricing_snapshot_id));
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_order_handshake_ready','handshakeId',v_handshake.id,'orderId',v_order.id,
    'fulfilmentLegId',v_leg.id,'reservationId',v_res.id,'paymentEvidenceId',v_payment_evidence.id,
    'supplierKey',v_supplier.supplier_key,'supplierOfferId',v_offer.id,'externalOfferRef',v_offer.external_offer_ref,
    'providerKey',v_adapter.provider_key,'adapterVersion',v_adapter.adapter_version,'quantity',v_quantity,
    'destinationCountry',v_destination_country,'idempotencyKey',v_handshake.idempotency_key,'correlationId',v_handshake.correlation_id,
    'state',v_handshake.state,'externalSupplierOrderRef',v_handshake.external_supplier_order_ref,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_prepare_supplier_order_handshake_v1(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_order_handshake_v1(uuid,uuid,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_mark_supplier_order_submission_started_v1(
  p_handshake_id uuid,
  p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_h private.supplier_order_handshakes%ROWTYPE; v_previous text;
BEGIN
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','handshake_not_found','interfaceVersion',1); END IF;
  IF v_h.idempotency_key<>BTRIM(COALESCE(p_idempotency_key,'')) THEN RAISE EXCEPTION 'supplier submission idempotency mismatch'; END IF;
  IF v_h.state IN ('accepted','rejected','reconciled') THEN
    RETURN jsonb_build_object('ok',true,'reason','terminal_handshake_not_resubmitted','state',v_h.state,'interfaceVersion',1);
  END IF;
  IF v_h.state IN ('unknown','reconciliation_required','pending') THEN
    RETURN jsonb_build_object('ok',false,'reason','query_before_retry_required','state',v_h.state,'interfaceVersion',1);
  END IF;
  v_previous:=v_h.state;
  UPDATE private.supplier_order_handshakes SET state='submitting',submission_attempts=submission_attempts+1,submitted_at=COALESCE(submitted_at,now()),updated_at=now()
   WHERE id=v_h.id RETURNING * INTO v_h;
  UPDATE private.supplier_fulfilment_legs SET status='supplier_submitting',updated_at=now() WHERE id=v_h.fulfilment_leg_id;
  UPDATE private.supplier_order_orchestrations SET state='supplier_submitting',updated_at=now() WHERE id=v_h.orchestration_id;
  INSERT INTO private.supplier_order_handshake_events(handshake_id,event_key,event,previous_state,new_state,reason,metadata)
  VALUES(v_h.id,'submit-start:'||v_h.id::text||':'||v_h.submission_attempts::text,'submission_started',v_previous,'submitting','provider_submission_started',
    jsonb_build_object('attempt',v_h.submission_attempts));
  RETURN jsonb_build_object('ok',true,'reason','submission_started','handshakeId',v_h.id,'attempt',v_h.submission_attempts,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_mark_supplier_order_submission_started_v1(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_mark_supplier_order_submission_started_v1(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_order_submission_result_v1(
  p_handshake_id uuid,
  p_result_class text,
  p_ack_state text,
  p_external_supplier_order_ref text,
  p_error_class text,
  p_error_message text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_result text:=upper(BTRIM(COALESCE(p_result_class,'')));
  v_ack text:=lower(BTRIM(COALESCE(p_ack_state,'unknown')));
  v_external text:=NULLIF(BTRIM(p_external_supplier_order_ref),'');
  v_new_state text;
  v_recovery text;
  v_leg_state text;
  v_orch_state text;
  v_previous text;
BEGIN
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','handshake_not_found','interfaceVersion',1); END IF;
  IF v_result NOT IN ('SUCCESS','ACCEPTED_PENDING','RETRYABLE_FAILURE','PERMANENT_REJECTION','AUTH_CONFIGURATION_FAILURE','RATE_LIMITED','PRICE_CHANGED','STOCK_CHANGED','UNKNOWN_OUTCOME','MANUAL_REVIEW_REQUIRED') THEN
    RAISE EXCEPTION 'invalid supplier submission result class';
  END IF;
  IF v_ack NOT IN ('accepted','pending','rejected','unknown') THEN RAISE EXCEPTION 'invalid supplier acknowledgement state'; END IF;
  IF v_h.external_supplier_order_ref IS NOT NULL AND v_external IS NOT NULL AND v_h.external_supplier_order_ref<>v_external THEN
    RAISE EXCEPTION 'external supplier order reference cannot change';
  END IF;

  v_new_state:=CASE
    WHEN v_result='SUCCESS' AND v_ack='accepted' THEN 'accepted'
    WHEN v_result IN ('SUCCESS','ACCEPTED_PENDING') AND v_ack='pending' THEN 'pending'
    WHEN v_result='PERMANENT_REJECTION' OR v_ack='rejected' THEN 'rejected'
    WHEN v_result IN ('UNKNOWN_OUTCOME') OR v_ack='unknown' THEN 'unknown'
    WHEN v_result IN ('RETRYABLE_FAILURE','RATE_LIMITED') THEN 'retryable_failure'
    ELSE 'reconciliation_required'
  END;
  v_recovery:=CASE
    WHEN v_new_state='accepted' THEN 'reconcile'
    WHEN v_new_state='pending' THEN 'query_before_retry'
    WHEN v_new_state='rejected' THEN 'reconcile'
    WHEN v_new_state='unknown' THEN 'query_before_retry'
    WHEN v_new_state='retryable_failure' THEN 'retry_pending'
    ELSE 'manual_review'
  END;
  v_leg_state:=CASE v_new_state
    WHEN 'accepted' THEN 'supplier_accepted' WHEN 'pending' THEN 'supplier_pending' WHEN 'rejected' THEN 'supplier_rejected'
    WHEN 'retryable_failure' THEN 'supplier_submitting' ELSE 'reconciliation_required' END;
  v_orch_state:=CASE v_new_state
    WHEN 'accepted' THEN 'supplier_accepted' WHEN 'pending' THEN 'supplier_pending' WHEN 'rejected' THEN 'supplier_exception'
    WHEN 'retryable_failure' THEN 'supplier_submitting' ELSE 'reconciliation_required' END;

  v_previous:=v_h.state;
  UPDATE private.supplier_order_handshakes SET
    state=v_new_state,acknowledgement_state=v_ack,recovery_state=v_recovery,
    external_supplier_order_ref=COALESCE(external_supplier_order_ref,v_external),last_error_class=NULLIF(BTRIM(p_error_class),''),
    last_error_message=NULLIF(BTRIM(p_error_message),''),acknowledged_at=CASE WHEN v_ack IN ('accepted','rejected') THEN COALESCE(acknowledged_at,now()) ELSE acknowledged_at END,
    last_checked_at=now(),updated_at=now()
  WHERE id=v_h.id RETURNING * INTO v_h;

  UPDATE private.supplier_fulfilment_legs SET status=v_leg_state,updated_at=now() WHERE id=v_h.fulfilment_leg_id;
  UPDATE private.supplier_order_orchestrations SET state=v_orch_state,updated_at=now() WHERE id=v_h.orchestration_id;

  IF v_new_state='accepted' THEN
    UPDATE private.supplier_stock_reservations SET status='consumed',consumed_at=now()
     WHERE id=v_h.reservation_id AND status='active';
  ELSIF v_new_state='rejected' THEN
    UPDATE private.supplier_stock_reservations SET status='released',released_at=now()
     WHERE id=v_h.reservation_id AND status='active';
  END IF;

  INSERT INTO private.supplier_order_handshake_events(
    handshake_id,event_key,event,previous_state,new_state,result_class,error_class,external_supplier_order_ref,recovery_state,reason,metadata
  ) VALUES(
    v_h.id,'submit-result:'||v_h.id::text||':'||v_h.submission_attempts::text,'submission_result',v_previous,v_new_state,v_result,
    NULLIF(BTRIM(p_error_class),''),v_h.external_supplier_order_ref,v_recovery,'provider_submission_result_recorded',
    jsonb_build_object('acknowledgementState',v_ack,'attempt',v_h.submission_attempts)
  ) ON CONFLICT(event_key) DO NOTHING;

  RETURN jsonb_build_object('ok',true,'reason','submission_result_recorded','handshakeId',v_h.id,'state',v_h.state,
    'acknowledgementState',v_h.acknowledgement_state,'recoveryState',v_h.recovery_state,
    'externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_order_submission_result_v1(uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_order_submission_result_v1(uuid,text,text,text,text,text) TO service_role;

COMMENT ON FUNCTION public.server_prepare_supplier_order_handshake_v1(uuid,uuid,text,uuid) IS 'Phase J fail-closed preparation. Requires canonical completed payment evidence, live reservation, stock/price recheck, active adapter and supplier_order control.';
COMMENT ON FUNCTION public.server_mark_supplier_order_submission_started_v1(uuid,text) IS 'Phase J duplicate-prevention boundary. Unknown/pending outcomes require acknowledgement query before any retry.';
COMMENT ON FUNCTION public.server_record_supplier_order_submission_result_v1(uuid,text,text,text,text,text) IS 'Phase J records supplier submission outcome separately from customer payment success.';;
