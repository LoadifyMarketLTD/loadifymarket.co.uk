CREATE OR REPLACE FUNCTION public.server_mark_supplier_order_submission_started_v1(
  p_handshake_id uuid,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_previous text;
BEGIN
  SELECT * INTO v_h
  FROM private.supplier_order_handshakes
  WHERE id=p_handshake_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','handshake_not_found','interfaceVersion',1);
  END IF;

  IF v_h.idempotency_key<>BTRIM(COALESCE(p_idempotency_key,'')) THEN
    RAISE EXCEPTION 'supplier submission idempotency mismatch';
  END IF;
  IF v_h.state IN ('accepted','rejected','reconciled') THEN
    RETURN jsonb_build_object(
      'ok',true,
      'reason','terminal_handshake_not_resubmitted',
      'state',v_h.state,
      'interfaceVersion',1
    );
  END IF;

  IF v_h.state='submitting' THEN
    RETURN jsonb_build_object(
      'ok',false,
      'reason','submission_already_in_progress',
      'state',v_h.state,
      'interfaceVersion',1
    );
  END IF;

  IF v_h.state IN ('unknown','reconciliation_required','pending') THEN
    RETURN jsonb_build_object(
      'ok',false,
      'reason','query_before_retry_required',
      'state',v_h.state,
      'interfaceVersion',1
    );
  END IF;
  v_previous:=v_h.state;

  UPDATE private.supplier_order_handshakes
  SET state='submitting',
      submission_attempts=submission_attempts+1,
      submitted_at=COALESCE(submitted_at,now()),
      updated_at=now()
  WHERE id=v_h.id
  RETURNING * INTO v_h;

  UPDATE private.supplier_fulfilment_legs
  SET status='supplier_submitting',updated_at=now()
  WHERE id=v_h.fulfilment_leg_id;

  UPDATE private.supplier_order_orchestrations
  SET state='supplier_submitting',updated_at=now()
  WHERE id=v_h.orchestration_id;

  INSERT INTO private.supplier_order_handshake_events(
    handshake_id,event_key,event,previous_state,new_state,reason,metadata
  ) VALUES(
    v_h.id,
    'submit-start:'||v_h.id::text||':'||v_h.submission_attempts::text,
    'submission_started',
    v_previous,
    'submitting',
    'provider_submission_started',
    jsonb_build_object('attempt',v_h.submission_attempts)
  );

  RETURN jsonb_build_object(
    'ok',true,
    'reason','submission_started',
    'handshakeId',v_h.id,
    'attempt',v_h.submission_attempts,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_mark_supplier_order_submission_started_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_mark_supplier_order_submission_started_v1(uuid,text)
  TO service_role;
