-- Generic Direct Supplier operational webhook runtime.
-- Signature verification happens server-side before this processor is called.
-- Replay claim + canonical event mutation are atomic in this RPC.

CREATE OR REPLACE FUNCTION public.server_direct_supplier_webhook_binding_v1(
  p_supplier_key text,
  p_capability text,
  p_territory text DEFAULT 'GB'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_key text := lower(BTRIM(COALESCE(p_supplier_key,'')));
  v_capability text := lower(BTRIM(COALESCE(p_capability,'')));
  v_territory text := upper(BTRIM(COALESCE(p_territory,'GB')));
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_profile private.supplier_integration_profiles%ROWTYPE;
BEGIN
  IF v_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$'
     OR v_territory !~ '^[A-Z]{2}$'
     OR v_capability NOT IN ('acknowledgement','tracking','returns','reimbursement') THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_webhook_scope','interfaceVersion',1);
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE supplier_key=v_key
    AND lifecycle_status='approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',1);
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_integration_profiles
  WHERE supplier_id=v_supplier.id
    AND territory=v_territory
    AND capability=v_capability
    AND transport='webhook'
    AND execution_mode='automated_read'
    AND status='verified'
    AND NULLIF(BTRIM(config_ref),'') IS NOT NULL
    AND NULLIF(BTRIM(contract_ref),'') IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','verified_webhook_binding_not_found','interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','verified_webhook_binding_ready',
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'territory',v_profile.territory,
    'capability',v_profile.capability,
    'configRef',v_profile.config_ref,
    'mapping',v_profile.mapping,
    'contractRef',v_profile.contract_ref,
    'secretMaterialReturned',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_direct_supplier_webhook_binding_v1(text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_direct_supplier_webhook_binding_v1(text,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_process_direct_supplier_operational_event_v1(
  p_supplier_key text,
  p_capability text,
  p_event_id text,
  p_occurred_at timestamptz,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_key text := lower(BTRIM(COALESCE(p_supplier_key,'')));
  v_capability text := lower(BTRIM(COALESCE(p_capability,'')));
  v_event_id text := BTRIM(COALESCE(p_event_id,''));
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_claimed boolean;
  v_handshake private.supplier_order_handshakes%ROWTYPE;
  v_case private.supplier_return_cases%ROWTYPE;
  v_result jsonb;
  v_handshake_id uuid;
  v_return_case_id uuid;
  v_ack_state text;
  v_supplier_order_ref text;
  v_provider_status text;
  v_carrier_ref text;
  v_tracking_ref text;
  v_external_return_ref text;
  v_authorised boolean;
  v_external_recovery_ref text;
  v_amount_minor bigint;
  v_currency text;
  v_recovery_state text;
BEGIN
  IF v_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$'
     OR v_event_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
     OR p_occurred_at IS NULL
     OR jsonb_typeof(COALESCE(p_payload,'{}'::jsonb))<>'object'
     OR v_capability NOT IN ('acknowledgement','tracking','returns','reimbursement') THEN
    RAISE EXCEPTION 'invalid Direct Supplier operational event' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE supplier_key=v_key
    AND lifecycle_status='approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approved Direct Supplier identity is required' USING ERRCODE='23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM private.supplier_integration_profiles p
    WHERE p.supplier_id=v_supplier.id
      AND p.territory='GB'
      AND p.capability=v_capability
      AND p.transport='webhook'
      AND p.execution_mode='automated_read'
      AND p.status='verified'
      AND NULLIF(BTRIM(p.contract_ref),'') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'verified webhook integration binding is required' USING ERRCODE='23514';
  END IF;

  v_claimed:=public.server_direct_supplier_claim_event_v1(
    v_key,
    v_event_id,
    LEAST(now()+interval '7 days', GREATEST(now()+interval '5 minutes', p_occurred_at+interval '24 hours'))
  );

  IF v_claimed IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'ok',true,'replayed',true,'eventClaimed',false,'processed',false,'interfaceVersion',1
    );
  END IF;

  IF v_capability='acknowledgement' THEN
    BEGIN v_handshake_id:=NULLIF(p_payload->>'handshakeId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid acknowledgement handshakeId' USING ERRCODE='22023';
    END;
    v_ack_state:=lower(BTRIM(COALESCE(p_payload->>'state','')));
    v_supplier_order_ref:=NULLIF(BTRIM(p_payload->>'supplierOrderRef'),'');
    IF v_handshake_id IS NULL OR v_ack_state NOT IN ('accepted','pending','rejected','unknown') THEN
      RAISE EXCEPTION 'complete acknowledgement payload is required' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_handshake
    FROM private.supplier_order_handshakes
    WHERE id=v_handshake_id
      AND supplier_id=v_supplier.id
      AND provider_key='direct_supplier';
    IF NOT FOUND THEN RAISE EXCEPTION 'acknowledgement handshake does not belong to supplier' USING ERRCODE='23514'; END IF;

    v_result:=public.server_record_supplier_order_acknowledgement_v1(
      v_handshake.id,v_ack_state,v_supplier_order_ref,p_occurred_at,'direct_supplier_webhook'
    );
    IF COALESCE((v_result->>'ok')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'canonical supplier acknowledgement rejected' USING ERRCODE='23514';
    END IF;

  ELSIF v_capability='tracking' THEN
    BEGIN v_handshake_id:=NULLIF(p_payload->>'handshakeId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid tracking handshakeId' USING ERRCODE='22023';
    END;
    v_provider_status:=NULLIF(BTRIM(p_payload->>'status'),'');
    v_carrier_ref:=NULLIF(BTRIM(p_payload->>'carrierRef'),'');
    v_tracking_ref:=NULLIF(BTRIM(p_payload->>'trackingRef'),'');
    IF v_handshake_id IS NULL OR v_provider_status IS NULL THEN
      RAISE EXCEPTION 'complete tracking payload is required' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_handshake
    FROM private.supplier_order_handshakes
    WHERE id=v_handshake_id
      AND supplier_id=v_supplier.id
      AND provider_key='direct_supplier';
    IF NOT FOUND THEN RAISE EXCEPTION 'tracking handshake does not belong to supplier' USING ERRCODE='23514'; END IF;

    v_result:=public.server_ingest_supplier_tracking_event_v1(
      v_handshake.id,v_provider_status,v_carrier_ref,v_tracking_ref,v_event_id,p_occurred_at,
      jsonb_build_object(
        'source','direct_supplier_webhook',
        'eventId',v_event_id,
        'providerStatus',v_provider_status,
        'carrierRef',v_carrier_ref,
        'trackingRef',v_tracking_ref,
        'occurredAt',p_occurred_at
      )
    );
    IF COALESCE((v_result->>'ok')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'canonical supplier tracking event rejected' USING ERRCODE='23514';
    END IF;

  ELSIF v_capability='returns' THEN
    BEGIN v_return_case_id:=NULLIF(p_payload->>'returnCaseId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid returnCaseId' USING ERRCODE='22023';
    END;
    v_external_return_ref:=NULLIF(BTRIM(p_payload->>'externalReturnRef'),'');
    v_authorised:=COALESCE((p_payload->>'authorised')::boolean,false);
    IF v_return_case_id IS NULL OR (v_authorised AND v_external_return_ref IS NULL) THEN
      RAISE EXCEPTION 'complete return update payload is required' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_case
    FROM private.supplier_return_cases
    WHERE id=v_return_case_id
      AND supplier_id=v_supplier.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'return case does not belong to supplier' USING ERRCODE='23514'; END IF;

    v_result:=public.server_record_supplier_return_authorisation_v1(
      v_case.id,v_external_return_ref,v_authorised,
      jsonb_build_object('source','direct_supplier_webhook','eventId',v_event_id,'occurredAt',p_occurred_at)
    );
    IF COALESCE((v_result->>'ok')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'canonical supplier return update rejected' USING ERRCODE='23514';
    END IF;

  ELSE
    BEGIN v_return_case_id:=NULLIF(p_payload->>'returnCaseId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid reimbursement returnCaseId' USING ERRCODE='22023';
    END;
    v_external_recovery_ref:=NULLIF(BTRIM(p_payload->>'externalRecoveryRef'),'');
    v_currency:=upper(BTRIM(COALESCE(p_payload->>'currency','')));
    v_recovery_state:=lower(BTRIM(COALESCE(p_payload->>'state','')));
    BEGIN v_amount_minor:=NULLIF(p_payload->>'amountMinor','')::bigint;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid reimbursement amountMinor' USING ERRCODE='22023';
    END;
    IF v_return_case_id IS NULL OR v_amount_minor IS NULL OR v_amount_minor<0
       OR v_currency<>'GBP'
       OR v_recovery_state NOT IN ('requested','pending','partial','recovered','failed','unrecoverable') THEN
      RAISE EXCEPTION 'complete GBP reimbursement payload is required' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_case
    FROM private.supplier_return_cases
    WHERE id=v_return_case_id
      AND supplier_id=v_supplier.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'reimbursement return case does not belong to supplier' USING ERRCODE='23514'; END IF;

    v_result:=public.server_record_supplier_recovery_evidence_v1(
      v_case.id,
      'direct-webhook:'||v_event_id,
      v_external_recovery_ref,
      (v_amount_minor::numeric/100.0),
      v_currency,
      v_recovery_state,
      p_occurred_at,
      jsonb_build_object(
        'source','direct_supplier_webhook',
        'eventId',v_event_id,
        'amountMinor',v_amount_minor
      )
    );
    IF COALESCE((v_result->>'ok')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'canonical supplier reimbursement event rejected' USING ERRCODE='23514';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'replayed',false,
    'eventClaimed',true,
    'processed',true,
    'capability',v_capability,
    'result',v_result,
    'customerPiiStored',false,
    'commerceActivationPerformed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_process_direct_supplier_operational_event_v1(text,text,text,timestamptz,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_process_direct_supplier_operational_event_v1(text,text,text,timestamptz,jsonb)
  TO service_role;
