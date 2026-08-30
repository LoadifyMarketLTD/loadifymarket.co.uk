-- 652_supplier_refund_idempotency_closure.sql
-- Phase L Branch Guard closure: exact refund-evidence replays must not be counted twice
-- by the cumulative over-refund guard before idempotency resolution.

CREATE OR REPLACE FUNCTION public.server_record_customer_refund_evidence_v1(
  p_return_case_id uuid,p_event_key text,p_provider text,p_external_refund_ref text,p_payment_ref text,
  p_amount numeric,p_currency text,p_state text,p_occurred_at timestamptz,p_evidence jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_case private.supplier_return_cases%ROWTYPE; v_leg private.supplier_fulfilment_legs%ROWTYPE; v_ref private.supplier_customer_refund_evidence%ROWTYPE; v_total numeric; v_order_total numeric;
BEGIN
  IF NULLIF(BTRIM(p_event_key),'') IS NULL OR NULLIF(BTRIM(p_provider),'') IS NULL OR NULLIF(BTRIM(p_external_refund_ref),'') IS NULL
     OR p_amount IS NULL OR p_amount<=0 OR upper(BTRIM(COALESCE(p_currency,''))) !~ '^[A-Z]{3}$'
     OR p_state NOT IN ('pending','partial','succeeded','failed') OR p_occurred_at IS NULL OR jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'complete customer refund evidence is required';
  END IF;
  SELECT * INTO v_case FROM private.supplier_return_cases WHERE id=p_return_case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','return_case_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE id=v_case.fulfilment_leg_id;
  IF v_leg.currency IS NOT NULL AND upper(BTRIM(p_currency))<>v_leg.currency THEN RAISE EXCEPTION 'refund currency must match fulfilment leg currency'; END IF;

  SELECT * INTO v_ref FROM private.supplier_customer_refund_evidence WHERE event_key=BTRIM(p_event_key);
  IF FOUND THEN
    IF v_ref.return_case_id<>v_case.id OR v_ref.provider<>BTRIM(p_provider)
       OR v_ref.external_refund_ref<>BTRIM(p_external_refund_ref) OR v_ref.amount<>p_amount
       OR v_ref.currency<>upper(BTRIM(p_currency)) OR v_ref.state<>p_state THEN
      RAISE EXCEPTION 'customer refund evidence idempotency collision';
    END IF;
    RETURN jsonb_build_object('ok',true,'refundEvidenceId',v_ref.id,'state',v_ref.state,'replayed',true,'interfaceVersion',1);
  END IF;

  SELECT total INTO v_order_total FROM public.orders WHERE id=v_case.order_id;
  SELECT COALESCE(SUM(amount),0) INTO v_total FROM private.supplier_customer_refund_evidence
    WHERE order_id=v_case.order_id AND state IN ('partial','succeeded');
  IF p_state IN ('partial','succeeded') AND v_total+p_amount>v_order_total THEN RAISE EXCEPTION 'cumulative customer refund exceeds customer order total'; END IF;

  INSERT INTO private.supplier_customer_refund_evidence(event_key,return_case_id,order_id,provider,external_refund_ref,payment_ref,amount,currency,state,occurred_at,evidence)
  VALUES(BTRIM(p_event_key),v_case.id,v_case.order_id,BTRIM(p_provider),BTRIM(p_external_refund_ref),NULLIF(BTRIM(p_payment_ref),''),p_amount,upper(BTRIM(p_currency)),p_state,p_occurred_at,p_evidence)
  RETURNING * INTO v_ref;

  IF p_state IN ('partial','succeeded') THEN
    INSERT INTO private.commerce_financial_ledger_entries(event_key,correlation_id,order_id,supplier_offer_id,commercial_mode,event_type,account_code,currency,signed_amount,external_ref,evidence,occurred_at)
    VALUES('phase-l-refund:'||BTRIM(p_event_key),v_case.correlation_id,v_case.order_id,v_case.supplier_offer_id,v_case.commercial_mode,'customer_refund','customer_refund',v_ref.currency,-v_ref.amount,v_ref.external_refund_ref,
      jsonb_build_object('returnCaseId',v_case.id,'refundEvidenceId',v_ref.id),v_ref.occurred_at)
    ON CONFLICT(event_key) DO NOTHING;
  END IF;
  UPDATE private.supplier_return_cases SET customer_refund_state=p_state,updated_at=now() WHERE id=v_case.id;
  INSERT INTO private.supplier_return_recovery_events(return_case_id,event_key,event_type,state,external_ref,evidence)
  VALUES(v_case.id,'refund-recorded:'||v_ref.id::text,'refund_recorded',p_state,v_ref.external_refund_ref,jsonb_build_object('amount',v_ref.amount,'currency',v_ref.currency))
  ON CONFLICT(event_key) DO NOTHING;
  RETURN jsonb_build_object('ok',true,'refundEvidenceId',v_ref.id,'state',v_ref.state,'replayed',false,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_customer_refund_evidence_v1(uuid,text,text,text,text,numeric,text,text,timestamptz,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_customer_refund_evidence_v1(uuid,text,text,text,text,numeric,text,text,timestamptz,jsonb) TO service_role;;
