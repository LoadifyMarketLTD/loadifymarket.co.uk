-- 649_supplier_returns_recovery_runtime_guards.sql
-- Phase L runtime guards. No external provider or payment action is performed by SQL;
-- SQL records canonical evidence and appends financial truth only after server-side evidence exists.

CREATE OR REPLACE FUNCTION private.guard_supplier_return_evidence_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'Phase L refund/recovery evidence is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_customer_refund_evidence_v1 ON private.supplier_customer_refund_evidence;
CREATE TRIGGER trg_guard_supplier_customer_refund_evidence_v1
BEFORE UPDATE OR DELETE ON private.supplier_customer_refund_evidence
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_return_evidence_immutable_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_recovery_evidence_v1 ON private.supplier_recovery_evidence;
CREATE TRIGGER trg_guard_supplier_recovery_evidence_v1
BEFORE UPDATE OR DELETE ON private.supplier_recovery_evidence
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_return_evidence_immutable_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_return_recovery_events_v1 ON private.supplier_return_recovery_events;
CREATE TRIGGER trg_guard_supplier_return_recovery_events_v1
BEFORE UPDATE OR DELETE ON private.supplier_return_recovery_events
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_return_evidence_immutable_v1();

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_return_v1(
  p_order_id uuid,
  p_fulfilment_leg_id uuid,
  p_reason_code text,
  p_quantity integer,
  p_idempotency_key text,
  p_correlation_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_ship private.supplier_leg_shipments%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_case private.supplier_return_cases%ROWTYPE;
  v_control jsonb;
  v_max_quantity integer;
  v_key text;
BEGIN
  IF NULLIF(BTRIM(p_reason_code),'') IS NULL OR p_quantity IS NULL OR p_quantity<=0
     OR NULLIF(BTRIM(p_idempotency_key),'') IS NULL OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_return_request','interfaceVersion',1);
  END IF;

  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs
   WHERE id=p_fulfilment_leg_id AND commercial_mode='loadify_supplier_fulfilled' AND supplier_offer_id IS NOT NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_fulfilment_leg_missing','interfaceVersion',1); END IF;

  SELECT o.* INTO v_h FROM private.supplier_order_handshakes o
   WHERE o.order_id=p_order_id AND o.fulfilment_leg_id=p_fulfilment_leg_id
     AND o.state='reconciled' AND o.acknowledgement_state='accepted' AND o.external_supplier_order_ref IS NOT NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_order_not_reconciled','interfaceVersion',1); END IF;

  SELECT * INTO v_ship FROM private.supplier_leg_shipments
   WHERE fulfilment_leg_id=p_fulfilment_leg_id AND handshake_id=v_h.id;
  IF NOT FOUND OR v_ship.canonical_status NOT IN ('delivered','returned') THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_requires_delivered_supplier_shipment','interfaceVersion',1);
  END IF;

  SELECT COALESCE(SUM(i.quantity),0)::integer INTO v_max_quantity
    FROM private.supplier_fulfilment_leg_items i WHERE i.leg_id=p_fulfilment_leg_id;
  IF p_quantity>v_max_quantity THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_quantity_exceeds_leg_quantity','interfaceVersion',1);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1('return_recovery',jsonb_build_object(
    'supplierRef',v_h.supplier_id::text,'offerRef',v_h.supplier_offer_id::text,'territory','GB'
  ));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_recovery_control_disabled','control',v_control,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers
   WHERE id=v_h.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',1); END IF;

  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
   WHERE a.supplier_id=v_h.supplier_id AND a.status='active' AND a.interface_version=1
     AND a.provider_key=v_h.provider_key AND a.adapter_version=v_h.adapter_version
     AND a.capabilities @> ARRAY['returns','reimbursement']::text[]
   ORDER BY a.verified_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','return_recovery_adapter_not_ready','interfaceVersion',1); END IF;

  v_key:='supplier-return:'||p_order_id::text||':'||p_fulfilment_leg_id::text||':'||p_idempotency_key;
  SELECT * INTO v_case FROM private.supplier_return_cases WHERE idempotency_key=BTRIM(p_idempotency_key) FOR UPDATE;
  IF FOUND THEN
    IF v_case.order_id<>p_order_id OR v_case.fulfilment_leg_id<>p_fulfilment_leg_id
       OR v_case.reason_code<>BTRIM(p_reason_code) OR v_case.requested_quantity<>p_quantity
       OR v_case.correlation_id<>p_correlation_id THEN
      RAISE EXCEPTION 'supplier return idempotency collision with different request';
    END IF;
  ELSE
    INSERT INTO private.supplier_return_cases(
      return_key,order_id,orchestration_id,fulfilment_leg_id,handshake_id,shipment_id,supplier_id,supplier_offer_id,
      external_supplier_order_ref,reason_code,requested_quantity,idempotency_key,correlation_id,evidence
    ) VALUES(
      v_key,p_order_id,v_h.orchestration_id,p_fulfilment_leg_id,v_h.id,v_ship.id,v_h.supplier_id,v_h.supplier_offer_id,
      v_h.external_supplier_order_ref,BTRIM(p_reason_code),p_quantity,BTRIM(p_idempotency_key),p_correlation_id,
      jsonb_build_object('shipmentStatus',v_ship.canonical_status,'createdBy','server_prepare_supplier_return_v1')
    ) RETURNING * INTO v_case;
    INSERT INTO private.supplier_return_recovery_events(return_case_id,event_key,event_type,state,evidence)
    VALUES(v_case.id,'return-requested:'||v_case.id::text,'return_requested',v_case.state,'{}'::jsonb)
    ON CONFLICT(event_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_return_ready','returnCaseId',v_case.id,'orderId',v_case.order_id,
    'fulfilmentLegId',v_case.fulfilment_leg_id,'supplierId',v_case.supplier_id,'supplierKey',v_supplier.supplier_key,
    'providerKey',v_adapter.provider_key,'adapterVersion',v_adapter.adapter_version,
    'supplierOrderRef',v_case.external_supplier_order_ref,'reasonCode',v_case.reason_code,'quantity',v_case.requested_quantity,
    'idempotencyKey',v_case.idempotency_key,'correlationId',v_case.correlation_id,'state',v_case.state,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_prepare_supplier_return_v1(uuid,uuid,text,integer,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_return_v1(uuid,uuid,text,integer,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_return_authorisation_v1(
  p_return_case_id uuid,p_external_return_ref text,p_authorised boolean,p_evidence jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_case private.supplier_return_cases%ROWTYPE;
BEGIN
  IF p_authorised AND NULLIF(BTRIM(p_external_return_ref),'') IS NULL THEN RAISE EXCEPTION 'authorised supplier return requires external return reference'; END IF;
  SELECT * INTO v_case FROM private.supplier_return_cases WHERE id=p_return_case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','return_case_not_found','interfaceVersion',1); END IF;
  IF v_case.external_return_ref IS NOT NULL AND p_external_return_ref IS NOT NULL AND v_case.external_return_ref<>BTRIM(p_external_return_ref) THEN
    RAISE EXCEPTION 'external supplier return reference cannot change';
  END IF;
  UPDATE private.supplier_return_cases SET
    external_return_ref=COALESCE(external_return_ref,NULLIF(BTRIM(p_external_return_ref),'')),
    state=CASE WHEN p_authorised THEN 'authorised' ELSE 'cancelled' END,
    authorised_at=CASE WHEN p_authorised THEN COALESCE(authorised_at,now()) ELSE authorised_at END,
    updated_at=now(),evidence=evidence||COALESCE(p_evidence,'{}'::jsonb)
  WHERE id=v_case.id RETURNING * INTO v_case;
  INSERT INTO private.supplier_return_recovery_events(return_case_id,event_key,event_type,state,external_ref,evidence)
  VALUES(v_case.id,'return-authorisation:'||v_case.id::text,'return_authorised',v_case.state,v_case.external_return_ref,COALESCE(p_evidence,'{}'::jsonb))
  ON CONFLICT(event_key) DO NOTHING;
  RETURN jsonb_build_object('ok',true,'returnCaseId',v_case.id,'state',v_case.state,'externalReturnRef',v_case.external_return_ref,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_return_authorisation_v1(uuid,text,boolean,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_return_authorisation_v1(uuid,text,boolean,jsonb) TO service_role;

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
  SELECT total INTO v_order_total FROM public.orders WHERE id=v_case.order_id;
  SELECT COALESCE(SUM(amount),0) INTO v_total FROM private.supplier_customer_refund_evidence
    WHERE order_id=v_case.order_id AND state IN ('partial','succeeded');
  IF p_state IN ('partial','succeeded') AND v_total+p_amount>v_order_total THEN RAISE EXCEPTION 'cumulative customer refund exceeds customer order total'; END IF;

  INSERT INTO private.supplier_customer_refund_evidence(event_key,return_case_id,order_id,provider,external_refund_ref,payment_ref,amount,currency,state,occurred_at,evidence)
  VALUES(BTRIM(p_event_key),v_case.id,v_case.order_id,BTRIM(p_provider),BTRIM(p_external_refund_ref),NULLIF(BTRIM(p_payment_ref),''),p_amount,upper(BTRIM(p_currency)),p_state,p_occurred_at,p_evidence)
  ON CONFLICT(event_key) DO NOTHING RETURNING * INTO v_ref;
  IF v_ref.id IS NULL THEN SELECT * INTO v_ref FROM private.supplier_customer_refund_evidence WHERE event_key=BTRIM(p_event_key); END IF;
  IF v_ref.return_case_id<>v_case.id OR v_ref.amount<>p_amount OR v_ref.currency<>upper(BTRIM(p_currency)) OR v_ref.state<>p_state THEN
    RAISE EXCEPTION 'customer refund evidence idempotency collision';
  END IF;

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
  RETURN jsonb_build_object('ok',true,'refundEvidenceId',v_ref.id,'state',v_ref.state,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_customer_refund_evidence_v1(uuid,text,text,text,text,numeric,text,text,timestamptz,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_customer_refund_evidence_v1(uuid,text,text,text,text,numeric,text,text,timestamptz,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_recovery_evidence_v1(
  p_return_case_id uuid,p_event_key text,p_external_recovery_ref text,p_amount numeric,p_currency text,p_state text,p_occurred_at timestamptz,p_evidence jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_case private.supplier_return_cases%ROWTYPE; v_leg private.supplier_fulfilment_legs%ROWTYPE; v_rec private.supplier_recovery_evidence%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(p_event_key),'') IS NULL OR p_amount IS NULL OR p_amount<0 OR upper(BTRIM(COALESCE(p_currency,''))) !~ '^[A-Z]{3}$'
     OR p_state NOT IN ('requested','pending','partial','recovered','failed','unrecoverable') OR p_occurred_at IS NULL
     OR jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' THEN RAISE EXCEPTION 'complete supplier recovery evidence is required'; END IF;
  IF p_state IN ('partial','recovered') AND p_amount<=0 THEN RAISE EXCEPTION 'financial supplier recovery requires positive amount'; END IF;
  SELECT * INTO v_case FROM private.supplier_return_cases WHERE id=p_return_case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','return_case_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE id=v_case.fulfilment_leg_id;
  IF v_leg.currency IS NOT NULL AND upper(BTRIM(p_currency))<>v_leg.currency THEN RAISE EXCEPTION 'recovery currency must match fulfilment leg currency'; END IF;

  INSERT INTO private.supplier_recovery_evidence(event_key,return_case_id,order_id,supplier_id,external_recovery_ref,amount,currency,state,occurred_at,evidence)
  VALUES(BTRIM(p_event_key),v_case.id,v_case.order_id,v_case.supplier_id,NULLIF(BTRIM(p_external_recovery_ref),''),p_amount,upper(BTRIM(p_currency)),p_state,p_occurred_at,p_evidence)
  ON CONFLICT(event_key) DO NOTHING RETURNING * INTO v_rec;
  IF v_rec.id IS NULL THEN SELECT * INTO v_rec FROM private.supplier_recovery_evidence WHERE event_key=BTRIM(p_event_key); END IF;
  IF v_rec.return_case_id<>v_case.id OR v_rec.amount<>p_amount OR v_rec.currency<>upper(BTRIM(p_currency)) OR v_rec.state<>p_state THEN
    RAISE EXCEPTION 'supplier recovery evidence idempotency collision';
  END IF;

  IF p_state IN ('partial','recovered') THEN
    INSERT INTO private.commerce_financial_ledger_entries(event_key,correlation_id,order_id,supplier_offer_id,commercial_mode,event_type,account_code,currency,signed_amount,external_ref,evidence,occurred_at)
    VALUES('phase-l-recovery:'||BTRIM(p_event_key),v_case.correlation_id,v_case.order_id,v_case.supplier_offer_id,v_case.commercial_mode,'supplier_recovery','supplier_recovery',v_rec.currency,v_rec.amount,v_rec.external_recovery_ref,
      jsonb_build_object('returnCaseId',v_case.id,'recoveryEvidenceId',v_rec.id),v_rec.occurred_at)
    ON CONFLICT(event_key) DO NOTHING;
  END IF;
  UPDATE private.supplier_return_cases SET supplier_recovery_state=p_state,updated_at=now() WHERE id=v_case.id;
  INSERT INTO private.supplier_return_recovery_events(return_case_id,event_key,event_type,state,external_ref,evidence)
  VALUES(v_case.id,'recovery-recorded:'||v_rec.id::text,'recovery_recorded',p_state,v_rec.external_recovery_ref,jsonb_build_object('amount',v_rec.amount,'currency',v_rec.currency))
  ON CONFLICT(event_key) DO NOTHING;
  RETURN jsonb_build_object('ok',true,'recoveryEvidenceId',v_rec.id,'state',v_rec.state,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_recovery_evidence_v1(uuid,text,text,numeric,text,text,timestamptz,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_recovery_evidence_v1(uuid,text,text,numeric,text,text,timestamptz,jsonb) TO service_role;;
