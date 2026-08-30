-- 643_supplier_payment_handshake_terminal_closure.sql
-- Branch Guard closure: terminal acknowledgement cannot regress; reconciliation
-- checks payment and reservation evidence explicitly instead of relying on FOUND.

CREATE OR REPLACE FUNCTION private.guard_supplier_order_handshake_terminal_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF OLD.state='reconciled' AND NEW.state<>'reconciled' THEN
    RAISE EXCEPTION 'reconciled supplier handshake cannot regress';
  END IF;
  IF OLD.acknowledgement_state='accepted' AND NEW.acknowledgement_state NOT IN ('accepted') THEN
    RAISE EXCEPTION 'accepted supplier acknowledgement cannot regress';
  END IF;
  IF OLD.acknowledgement_state='rejected' AND NEW.acknowledgement_state NOT IN ('rejected') THEN
    RAISE EXCEPTION 'rejected supplier acknowledgement cannot regress';
  END IF;
  IF OLD.external_supplier_order_ref IS NOT NULL
     AND NEW.external_supplier_order_ref IS DISTINCT FROM OLD.external_supplier_order_ref THEN
    RAISE EXCEPTION 'external supplier order reference is immutable once known';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_handshake_terminal_v1 ON private.supplier_order_handshakes;
CREATE TRIGGER trg_guard_supplier_order_handshake_terminal_v1
BEFORE UPDATE ON private.supplier_order_handshakes
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_handshake_terminal_v1();

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

  IF v_h.acknowledgement_state='accepted' THEN
    IF v_ack='rejected' THEN
      RETURN jsonb_build_object('ok',false,'reason','conflicting_terminal_acknowledgement','state',v_h.state,
        'externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
    END IF;
    RETURN jsonb_build_object('ok',true,'reason','accepted_acknowledgement_replayed','state',v_h.state,
      'acknowledgementState',v_h.acknowledgement_state,'externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
  END IF;
  IF v_h.acknowledgement_state='rejected' THEN
    IF v_ack='accepted' THEN
      RETURN jsonb_build_object('ok',false,'reason','conflicting_terminal_acknowledgement','state',v_h.state,
        'externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
    END IF;
    RETURN jsonb_build_object('ok',true,'reason','rejected_acknowledgement_replayed','state',v_h.state,
      'acknowledgementState',v_h.acknowledgement_state,'externalSupplierOrderRef',v_h.external_supplier_order_ref,'interfaceVersion',1);
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

  IF v_payment.id IS NULL OR v_payment.payment_status<>'completed' THEN
    UPDATE private.supplier_order_handshakes SET state='reconciliation_required',recovery_state='manual_review',updated_at=now() WHERE id=v_h.id;
    RETURN jsonb_build_object('reconciled',false,'reason','payment_evidence_missing','interfaceVersion',1);
  END IF;
  IF v_res.id IS NULL THEN
    UPDATE private.supplier_order_handshakes SET state='reconciliation_required',recovery_state='manual_review',updated_at=now() WHERE id=v_h.id;
    RETURN jsonb_build_object('reconciled',false,'reason','reservation_evidence_missing','interfaceVersion',1);
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

COMMENT ON FUNCTION private.guard_supplier_order_handshake_terminal_v1() IS 'Phase J terminal-state guard: late/duplicate acknowledgements cannot regress accepted/rejected/reconciled provider truth.';;
