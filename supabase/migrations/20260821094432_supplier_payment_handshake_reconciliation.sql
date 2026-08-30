-- 642_supplier_payment_handshake_reconciliation.sql
-- Phase J acknowledgement recovery, timeout handling and handshake reconciliation.
-- This is supplier-order reconciliation only; full financial reconciliation remains Phase L.

CREATE OR REPLACE FUNCTION public.server_record_supplier_order_acknowledgement_v1(
  p_handshake_id uuid,
  p_ack_state text,
  p_external_supplier_order_ref text,
  p_acknowledged_at timestamptz,
  p_source text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_ack text:=lower(BTRIM(COALESCE(p_ack_state,'')));
  v_external text:=NULLIF(BTRIM(p_external_supplier_order_ref),'');
  v_source text:=NULLIF(BTRIM(p_source),'');
  v_previous text;
  v_state text;
  v_recovery text;
BEGIN
  IF v_ack NOT IN ('accepted','pending','rejected','unknown') OR v_source IS NULL THEN
    RAISE EXCEPTION 'valid acknowledgement state and source are required';
  END IF;
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','handshake_not_found','interfaceVersion',1); END IF;
  IF v_h.external_supplier_order_ref IS NOT NULL AND v_external IS NOT NULL AND v_h.external_supplier_order_ref<>v_external THEN
    RAISE EXCEPTION 'duplicate acknowledgement references a different supplier order';
  END IF;
  IF v_ack IN ('accepted','pending') AND COALESCE(v_h.external_supplier_order_ref,v_external) IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_order_reference_required_for_acknowledgement','interfaceVersion',1);
  END IF;

  v_state:=CASE v_ack WHEN 'accepted' THEN 'accepted' WHEN 'pending' THEN 'pending' WHEN 'rejected' THEN 'rejected' ELSE 'unknown' END;
  v_recovery:=CASE v_ack WHEN 'accepted' THEN 'reconcile' WHEN 'rejected' THEN 'manual_review' ELSE 'query_before_retry' END;
  v_previous:=v_h.state;

  UPDATE private.supplier_order_handshakes SET
    state=v_state,acknowledgement_state=v_ack,recovery_state=v_recovery,
    external_supplier_order_ref=COALESCE(external_supplier_order_ref,v_external),
    acknowledged_at=CASE WHEN v_ack IN ('accepted','rejected') THEN COALESCE(p_acknowledged_at,now()) ELSE acknowledged_at END,
    last_checked_at=now(),updated_at=now()
  WHERE id=v_h.id RETURNING * INTO v_h;

  UPDATE private.supplier_fulfilment_legs SET status=CASE v_ack
    WHEN 'accepted' THEN 'supplier_accepted' WHEN 'pending' THEN 'supplier_pending'
    WHEN 'rejected' THEN 'supplier_rejected' ELSE 'reconciliation_required' END,updated_at=now()
  WHERE id=v_h.fulfilment_leg_id;
  UPDATE private.supplier_order_orchestrations SET state=CASE v_ack
    WHEN 'accepted' THEN 'supplier_accepted' WHEN 'pending' THEN 'supplier_pending'
    WHEN 'rejected' THEN 'supplier_exception' ELSE 'reconciliation_required' END,updated_at=now()
  WHERE id=v_h.orchestration_id;

  IF v_ack='accepted' THEN
    UPDATE private.supplier_stock_reservations SET status='consumed',consumed_at=COALESCE(consumed_at,now())
     WHERE id=v_h.reservation_id AND status='active';
  ELSIF v_ack='rejected' THEN
    UPDATE private.supplier_stock_reservations SET status='released',released_at=COALESCE(released_at,now())
     WHERE id=v_h.reservation_id AND status='active';
  END IF;

  INSERT INTO private.supplier_order_handshake_events(
    handshake_id,event_key,event,previous_state,new_state,external_supplier_order_ref,recovery_state,reason,metadata
  ) VALUES(
    v_h.id,'ack:'||v_h.id::text||':'||v_ack||':'||COALESCE(v_h.external_supplier_order_ref,'none'),
    'acknowledgement',v_previous,v_state,v_h.external_supplier_order_ref,v_recovery,'supplier_acknowledgement_recorded',
    jsonb_build_object('source',v_source,'acknowledgedAt',COALESCE(p_acknowledged_at,now()))
  ) ON CONFLICT(event_key) DO NOTHING;

  RETURN jsonb_build_object('ok',true,'reason','supplier_acknowledgement_recorded','handshakeId',v_h.id,
    'state',v_h.state,'acknowledgementState',v_h.acknowledgement_state,'recoveryState',v_h.recovery_state,
    'externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_order_acknowledgement_v1(uuid,text,text,timestamptz,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_order_acknowledgement_v1(uuid,text,text,timestamptz,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_mark_supplier_order_handshake_timeout_v1(
  p_timeout_seconds integer DEFAULT 120
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_count integer:=0;
BEGIN
  IF p_timeout_seconds IS NULL OR p_timeout_seconds<30 OR p_timeout_seconds>3600 THEN
    RAISE EXCEPTION 'timeout must be between 30 and 3600 seconds';
  END IF;
  WITH timed_out AS (
    UPDATE private.supplier_order_handshakes h
       SET state='unknown',acknowledgement_state='unknown',recovery_state='query_before_retry',last_error_class='UNKNOWN_OUTCOME',
           last_error_message='supplier submission timed out before a trustworthy acknowledgement was recorded',last_checked_at=now(),updated_at=now()
     WHERE h.state='submitting' AND h.updated_at + make_interval(secs=>p_timeout_seconds)<=now()
     RETURNING h.id,h.fulfilment_leg_id,h.orchestration_id,h.submission_attempts
  ), events AS (
    INSERT INTO private.supplier_order_handshake_events(handshake_id,event_key,event,previous_state,new_state,result_class,error_class,recovery_state,reason,metadata)
    SELECT id,'timeout:'||id::text||':'||submission_attempts::text,'timeout','submitting','unknown','UNKNOWN_OUTCOME','UNKNOWN_OUTCOME','query_before_retry',
      'supplier_submission_timeout_requires_query_before_retry',jsonb_build_object('timeoutSeconds',p_timeout_seconds)
    FROM timed_out ON CONFLICT(event_key) DO NOTHING RETURNING handshake_id
  ), legs AS (
    UPDATE private.supplier_fulfilment_legs l SET status='reconciliation_required',updated_at=now()
     WHERE l.id IN (SELECT fulfilment_leg_id FROM timed_out) RETURNING l.id
  ), orchestrations AS (
    UPDATE private.supplier_order_orchestrations o SET state='reconciliation_required',updated_at=now()
     WHERE o.id IN (SELECT orchestration_id FROM timed_out) RETURNING o.id
  )
  SELECT count(*)::integer INTO v_count FROM timed_out;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.server_mark_supplier_order_handshake_timeout_v1(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_mark_supplier_order_handshake_timeout_v1(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_order_retry_decision_v1(
  p_handshake_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_h private.supplier_order_handshakes%ROWTYPE;
BEGIN
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','handshake_not_found','interfaceVersion',1); END IF;
  IF v_h.state='retryable_failure' AND v_h.recovery_state='retry_pending' THEN
    RETURN jsonb_build_object('eligible',true,'reason','retry_same_idempotency_key','idempotencyKey',v_h.idempotency_key,'interfaceVersion',1);
  END IF;
  IF v_h.state IN ('unknown','pending','reconciliation_required') OR v_h.recovery_state='query_before_retry' THEN
    RETURN jsonb_build_object('eligible',false,'reason','query_before_retry_required','externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
  END IF;
  RETURN jsonb_build_object('eligible',false,'reason','handshake_not_retryable','state',v_h.state,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_order_retry_decision_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_order_retry_decision_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_reconcile_supplier_order_handshake_v1(
  p_handshake_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_payment private.supplier_payment_evidence_snapshots%ROWTYPE;
  v_res private.supplier_stock_reservations%ROWTYPE;
  v_previous text;
BEGIN
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('reconciled',false,'reason','handshake_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_payment FROM private.supplier_payment_evidence_snapshots WHERE id=v_h.payment_evidence_id;
  SELECT * INTO v_res FROM private.supplier_stock_reservations WHERE id=v_h.reservation_id;

  IF NOT FOUND OR v_payment.payment_status<>'completed' THEN
    UPDATE private.supplier_order_handshakes SET state='reconciliation_required',recovery_state='manual_review',updated_at=now() WHERE id=v_h.id;
    RETURN jsonb_build_object('reconciled',false,'reason','payment_evidence_missing','interfaceVersion',1);
  END IF;

  IF v_h.acknowledgement_state='accepted' AND v_h.external_supplier_order_ref IS NOT NULL AND v_res.status='consumed' THEN
    v_previous:=v_h.state;
    UPDATE private.supplier_order_handshakes SET state='reconciled',recovery_state='resolved',reconciled_at=COALESCE(reconciled_at,now()),last_checked_at=now(),updated_at=now()
     WHERE id=v_h.id RETURNING * INTO v_h;
    INSERT INTO private.supplier_order_handshake_events(handshake_id,event_key,event,previous_state,new_state,recovery_state,reason,metadata)
    VALUES(v_h.id,'reconciled:'||v_h.id::text,'reconciliation',v_previous,'reconciled','resolved','payment_and_supplier_acknowledgement_reconciled',
      jsonb_build_object('paymentEvidenceId',v_h.payment_evidence_id,'externalSupplierOrderRef',v_h.external_supplier_order_ref))
    ON CONFLICT(event_key) DO NOTHING;
    RETURN jsonb_build_object('reconciled',true,'reason','supplier_order_handshake_reconciled','handshakeId',v_h.id,
      'externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
  END IF;

  UPDATE private.supplier_order_handshakes SET
    recovery_state=CASE WHEN state IN ('unknown','pending') THEN 'query_before_retry' ELSE 'manual_review' END,
    state=CASE WHEN state IN ('rejected','reconciliation_required') THEN 'reconciliation_required' ELSE state END,last_checked_at=now(),updated_at=now()
  WHERE id=v_h.id RETURNING * INTO v_h;
  RETURN jsonb_build_object('reconciled',false,'reason',CASE
    WHEN v_h.acknowledgement_state='rejected' THEN 'customer_paid_supplier_rejected'
    WHEN v_h.acknowledgement_state IN ('pending','unknown') THEN 'supplier_acknowledgement_unresolved'
    ELSE 'supplier_order_not_acknowledged' END,
    'state',v_h.state,'recoveryState',v_h.recovery_state,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_reconcile_supplier_order_handshake_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_reconcile_supplier_order_handshake_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_order_handshake_status_v1(
  p_actor_id uuid,
  p_order_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object('items',(
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'handshakeId',h.id,'orderId',h.order_id,'fulfilmentLegId',h.fulfilment_leg_id,'supplierOfferId',h.supplier_offer_id,
      'providerKey',h.provider_key,'state',h.state,'acknowledgementState',h.acknowledgement_state,'recoveryState',h.recovery_state,
      'externalSupplierOrderRef',h.external_supplier_order_ref,'submissionAttempts',h.submission_attempts,'lastErrorClass',h.last_error_class,
      'submittedAt',h.submitted_at,'acknowledgedAt',h.acknowledged_at,'lastCheckedAt',h.last_checked_at,'updatedAt',h.updated_at
    ) ORDER BY h.updated_at DESC),'[]'::jsonb)
    FROM private.supplier_order_handshakes h
    WHERE p_order_id IS NULL OR h.order_id=p_order_id
  ),'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_order_handshake_status_v1(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_order_handshake_status_v1(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.server_record_supplier_order_acknowledgement_v1(uuid,text,text,timestamptz,text) IS 'Phase J idempotent acknowledgement recovery. Duplicate acknowledgement is evidence, never a duplicate supplier submission.';
COMMENT ON FUNCTION public.server_supplier_order_retry_decision_v1(uuid) IS 'Unknown/pending outcomes are never blindly retried; query-before-retry is mandatory.';
COMMENT ON FUNCTION public.server_reconcile_supplier_order_handshake_v1(uuid) IS 'Phase J payment/supplier-order handshake reconciliation only. Full financial reconciliation is intentionally deferred to Phase L.';;
