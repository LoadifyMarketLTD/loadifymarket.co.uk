-- Direct Supplier transactional capability evidence and minimum fulfilment disclosure.
-- Applied to hosted production as migration 20260922145846.
-- No supplier, capability, pilot, order, payment or commerce activation is created here.

ALTER TABLE private.supplier_onboarding_capability_evidence
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'manual_only',
  ADD COLUMN IF NOT EXISTS write_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pii_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pii_fields text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS idempotency_known boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lost_response_recovery_known boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rate_limit_known boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_ref text;

ALTER TABLE private.supplier_onboarding_capability_evidence
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_execution_mode_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_execution_class_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_write_flag_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_pii_flag_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_pii_fields_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_unverified_execution_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_automated_contract_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_write_safety_check,
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capability_order_pii_check;

ALTER TABLE private.supplier_onboarding_capability_evidence
  ADD CONSTRAINT supplier_onboarding_capability_execution_mode_check
    CHECK (execution_mode IN ('manual_only','automated_read','automated_write')),
  ADD CONSTRAINT supplier_onboarding_capability_execution_class_check
    CHECK (
      execution_mode='manual_only'
      OR (
        capability IN ('supplier_identity','catalog','variants','stock','price','shipping','acknowledgement','tracking','reimbursement')
        AND execution_mode='automated_read'
      )
      OR (
        capability IN ('order_submission','cancellation','returns')
        AND execution_mode='automated_write'
      )
    ),
  ADD CONSTRAINT supplier_onboarding_capability_write_flag_check
    CHECK (
      (execution_mode='automated_write' AND write_allowed=true)
      OR (execution_mode<>'automated_write' AND write_allowed=false)
    ),
  ADD CONSTRAINT supplier_onboarding_capability_pii_flag_check
    CHECK (pii_allowed=false OR (execution_mode='automated_write' AND write_allowed=true)),
  ADD CONSTRAINT supplier_onboarding_capability_pii_fields_check
    CHECK (
      pii_fields <@ ARRAY['name','line1','line2','city','region','postcode','country','phone','email']::text[]
      AND (pii_allowed=true OR cardinality(pii_fields)=0)
    ),
  ADD CONSTRAINT supplier_onboarding_capability_unverified_execution_check
    CHECK (
      status='verified'
      OR (
        execution_mode='manual_only'
        AND write_allowed=false
        AND pii_allowed=false
        AND cardinality(pii_fields)=0
      )
    ),
  ADD CONSTRAINT supplier_onboarding_capability_automated_contract_check
    CHECK (
      status<>'verified'
      OR execution_mode='manual_only'
      OR NULLIF(BTRIM(contract_ref),'') IS NOT NULL
    ),
  ADD CONSTRAINT supplier_onboarding_capability_write_safety_check
    CHECK (
      status<>'verified'
      OR execution_mode<>'automated_write'
      OR (
        write_allowed=true
        AND idempotency_known=true
        AND lost_response_recovery_known=true
        AND NULLIF(BTRIM(contract_ref),'') IS NOT NULL
      )
    ),
  ADD CONSTRAINT supplier_onboarding_capability_order_pii_check
    CHECK (
      capability<>'order_submission'
      OR status<>'verified'
      OR execution_mode<>'automated_write'
      OR (
        pii_allowed=true
        AND pii_fields @> ARRAY['name','line1','city','postcode','country']::text[]
      )
    );

CREATE OR REPLACE FUNCTION public.server_admin_supplier_onboarding_capability_v1(
  p_actor_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_payload jsonb := COALESCE(p_payload,'{}'::jsonb);
  v_supplier_id uuid;
  v_territory text := upper(BTRIM(COALESCE(v_payload->>'territory','GB')));
  v_capability text := lower(BTRIM(COALESCE(v_payload->>'capability','')));
  v_status text := lower(BTRIM(COALESCE(v_payload->>'status','unverified')));
  v_sources jsonb := COALESCE(v_payload->'sourceRefs','[]'::jsonb);
  v_execution_mode text := lower(BTRIM(COALESCE(v_payload->>'executionMode','manual_only')));
  v_write_allowed boolean := COALESCE((v_payload->>'writeAllowed')::boolean,false);
  v_pii_allowed boolean := COALESCE((v_payload->>'piiAllowed')::boolean,false);
  v_pii_json jsonb := COALESCE(v_payload->'piiFields','[]'::jsonb);
  v_pii_fields text[] := '{}'::text[];
  v_idempotency_known boolean := COALESCE((v_payload->>'idempotencyKnown')::boolean,false);
  v_lost_response_known boolean := COALESCE((v_payload->>'lostResponseRecoveryKnown')::boolean,false);
  v_rate_limit_known boolean := COALESCE((v_payload->>'rateLimitKnown')::boolean,false);
  v_contract_ref text := NULLIF(BTRIM(v_payload->>'contractRef'),'');
  v_row private.supplier_onboarding_capability_evidence%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload must be an object' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_supplier_id := NULLIF(v_payload->>'supplierId','')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'supplierId must be a UUID' USING ERRCODE='22023';
  END;
  IF v_supplier_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id=v_supplier_id
  ) THEN
    RAISE EXCEPTION 'supplier not found' USING ERRCODE='P0002';
  END IF;
  IF v_territory !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'territory must be a two-letter country code' USING ERRCODE='22023';
  END IF;
  IF v_capability NOT IN (
    'supplier_identity','catalog','variants','stock','price','shipping',
    'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement'
  ) THEN
    RAISE EXCEPTION 'unsupported supplier capability' USING ERRCODE='22023';
  END IF;
  IF v_status NOT IN ('unverified','verified','rejected','stale','blocked') THEN
    RAISE EXCEPTION 'unsupported supplier capability status' USING ERRCODE='22023';
  END IF;
  IF v_execution_mode NOT IN ('manual_only','automated_read','automated_write') THEN
    RAISE EXCEPTION 'unsupported supplier execution mode' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(v_sources) <> 'array' THEN
    RAISE EXCEPTION 'sourceRefs must be an array' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(v_pii_json) <> 'array' THEN
    RAISE EXCEPTION 'piiFields must be an array' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT lower(BTRIM(value)) ORDER BY lower(BTRIM(value))), '{}'::text[])
    INTO v_pii_fields
    FROM jsonb_array_elements_text(v_pii_json);
  IF v_status='verified' AND jsonb_array_length(v_sources)=0 THEN
    RAISE EXCEPTION 'verified supplier capability requires sourceRefs' USING ERRCODE='23514';
  END IF;

  INSERT INTO private.supplier_onboarding_capability_evidence(
    supplier_id,territory,capability,status,source_refs,evidence_summary,evidence_hash,
    verified_at,expires_at,verified_by,execution_mode,write_allowed,pii_allowed,pii_fields,
    idempotency_known,lost_response_recovery_known,rate_limit_known,contract_ref
  ) VALUES (
    v_supplier_id,v_territory,v_capability,v_status,v_sources,
    NULLIF(BTRIM(v_payload->>'evidenceSummary'),''),
    NULLIF(BTRIM(v_payload->>'evidenceHash'),''),
    CASE WHEN v_status='verified' THEN now() ELSE NULL END,
    NULLIF(v_payload->>'expiresAt','')::timestamptz,
    CASE WHEN v_status='verified' THEN p_actor_id ELSE NULL END,
    v_execution_mode,v_write_allowed,v_pii_allowed,v_pii_fields,
    v_idempotency_known,v_lost_response_known,v_rate_limit_known,v_contract_ref
  )
  ON CONFLICT (supplier_id,territory,capability) DO UPDATE SET
    status=EXCLUDED.status,
    source_refs=EXCLUDED.source_refs,
    evidence_summary=EXCLUDED.evidence_summary,
    evidence_hash=EXCLUDED.evidence_hash,
    verified_at=EXCLUDED.verified_at,
    expires_at=EXCLUDED.expires_at,
    verified_by=EXCLUDED.verified_by,
    execution_mode=EXCLUDED.execution_mode,
    write_allowed=EXCLUDED.write_allowed,
    pii_allowed=EXCLUDED.pii_allowed,
    pii_fields=EXCLUDED.pii_fields,
    idempotency_known=EXCLUDED.idempotency_known,
    lost_response_recovery_known=EXCLUDED.lost_response_recovery_known,
    rate_limit_known=EXCLUDED.rate_limit_known,
    contract_ref=EXCLUDED.contract_ref,
    version=private.supplier_onboarding_capability_evidence.version+1,
    updated_at=now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok',true,
    'supplierId',v_supplier_id,
    'territory',v_row.territory,
    'capability',v_row.capability,
    'status',v_row.status,
    'executionMode',v_row.execution_mode,
    'writeAllowed',v_row.write_allowed,
    'piiAllowed',v_row.pii_allowed,
    'piiFields',to_jsonb(v_row.pii_fields),
    'idempotencyKnown',v_row.idempotency_known,
    'lostResponseRecoveryKnown',v_row.lost_response_recovery_known,
    'rateLimitKnown',v_row.rate_limit_known,
    'contractRef',v_row.contract_ref,
    'version',v_row.version,
    'activationChanged',false,
    'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_onboarding_capability_v1(uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_onboarding_capability_v1(uuid,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_capability_execution_v1(
  p_supplier_id uuid,
  p_territory text,
  p_capability text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_territory text := upper(BTRIM(COALESCE(p_territory,'GB')));
  v_capability text := lower(BTRIM(COALESCE(p_capability,'')));
  v_row private.supplier_onboarding_capability_evidence%ROWTYPE;
  v_current boolean := false;
  v_available boolean := false;
  v_external_mutation boolean := false;
  v_pii_disclosure boolean := false;
  v_reason text := 'capability_evidence_missing';
BEGIN
  IF p_supplier_id IS NULL OR v_territory !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object('found',false,'availability','unavailable','reason','invalid_scope','interfaceVersion',1);
  END IF;
  SELECT * INTO v_row
  FROM private.supplier_onboarding_capability_evidence
  WHERE supplier_id=p_supplier_id AND territory=v_territory AND capability=v_capability
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found',false,'supplierId',p_supplier_id,'territory',v_territory,'capability',v_capability,
      'availability','unavailable','reason',v_reason,'externalMutationAllowed',false,
      'piiDisclosureAllowed',false,'interfaceVersion',1
    );
  END IF;

  v_current := v_row.status='verified'
    AND v_row.verified_at IS NOT NULL
    AND (v_row.expires_at IS NULL OR v_row.expires_at>now())
    AND jsonb_array_length(v_row.source_refs)>0;

  IF NOT v_current THEN
    v_reason := CASE
      WHEN v_row.status<>'verified' THEN 'capability_not_verified'
      WHEN v_row.expires_at IS NOT NULL AND v_row.expires_at<=now() THEN 'capability_evidence_stale'
      ELSE 'capability_evidence_incomplete'
    END;
  ELSIF v_row.execution_mode='manual_only' THEN
    v_reason := 'verified_manual_only';
  ELSIF v_row.execution_mode='automated_read' THEN
    v_available := true;
    v_reason := 'verified_automated_read';
  ELSIF v_row.execution_mode='automated_write'
    AND v_row.write_allowed=true
    AND v_row.idempotency_known=true
    AND v_row.lost_response_recovery_known=true
    AND NULLIF(BTRIM(v_row.contract_ref),'') IS NOT NULL THEN
    v_available := true;
    v_external_mutation := true;
    v_pii_disclosure := v_row.pii_allowed;
    v_reason := 'verified_automated_write';
  ELSE
    v_reason := 'automated_write_safety_evidence_incomplete';
  END IF;

  RETURN jsonb_build_object(
    'found',true,'supplierId',p_supplier_id,'territory',v_territory,'capability',v_capability,
    'availability',CASE WHEN v_available THEN 'available' WHEN v_current AND v_row.execution_mode='manual_only' THEN 'manual_only' ELSE 'unavailable' END,
    'reason',v_reason,'executionMode',v_row.execution_mode,
    'externalMutationAllowed',v_external_mutation,'piiDisclosureAllowed',v_pii_disclosure,
    'piiFields',to_jsonb(v_row.pii_fields),'idempotencyKnown',v_row.idempotency_known,
    'lostResponseRecoveryKnown',v_row.lost_response_recovery_known,'rateLimitKnown',v_row.rate_limit_known,
    'contractRef',v_row.contract_ref,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_capability_execution_v1(uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_capability_execution_v1(uuid,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_adapter_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_capability text;
  v_evidence private.supplier_onboarding_capability_evidence%ROWTYPE;
BEGIN
  NEW.provider_key := lower(BTRIM(NEW.provider_key));
  NEW.adapter_key := lower(BTRIM(NEW.adapter_key));
  NEW.territory := upper(BTRIM(NEW.territory));
  IF cardinality(NEW.capabilities) <> (SELECT count(DISTINCT capability) FROM unnest(NEW.capabilities) AS capability) THEN
    RAISE EXCEPTION 'adapter capabilities must be unique' USING ERRCODE='23514';
  END IF;

  IF NEW.status='active' THEN
    FOREACH v_capability IN ARRAY NEW.capabilities LOOP
      IF NEW.provider_key='direct_supplier' THEN
        SELECT * INTO v_evidence
        FROM private.supplier_onboarding_capability_evidence ce
        WHERE ce.supplier_id=NEW.supplier_id AND ce.territory=NEW.territory
          AND ce.capability=v_capability AND ce.status='verified' AND ce.verified_at IS NOT NULL
          AND (ce.expires_at IS NULL OR ce.expires_at>now()) AND jsonb_array_length(ce.source_refs)>0
        LIMIT 1;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'current supplier-specific capability evidence is required for active direct supplier adapter: %', v_capability USING ERRCODE='23514';
        END IF;
        IF v_evidence.execution_mode='manual_only' THEN
          RAISE EXCEPTION 'manual-only direct supplier capability cannot be advertised by an active adapter: %', v_capability USING ERRCODE='23514';
        END IF;
        IF v_capability IN ('order_submission','cancellation','returns') AND (
          v_evidence.execution_mode<>'automated_write' OR v_evidence.write_allowed IS DISTINCT FROM true
          OR v_evidence.idempotency_known IS DISTINCT FROM true OR v_evidence.lost_response_recovery_known IS DISTINCT FROM true
          OR NULLIF(BTRIM(v_evidence.contract_ref),'') IS NULL
        ) THEN
          RAISE EXCEPTION 'write safety evidence is incomplete for active direct supplier capability: %', v_capability USING ERRCODE='23514';
        END IF;
        IF v_capability='order_submission' AND (
          v_evidence.pii_allowed IS DISTINCT FROM true
          OR NOT (v_evidence.pii_fields @> ARRAY['name','line1','city','postcode','country']::text[])
        ) THEN
          RAISE EXCEPTION 'minimum fulfilment PII permission is required for direct supplier order submission' USING ERRCODE='23514';
        END IF;
      ELSE
        IF NOT EXISTS (
          SELECT 1 FROM private.supplier_commerce_provider_capabilities pc
          WHERE pc.provider_key=NEW.provider_key AND pc.territory=NEW.territory AND pc.capability=v_capability
            AND pc.status='verified' AND pc.verified_at IS NOT NULL AND pc.reverify_due_at>now()
            AND jsonb_array_length(pc.official_source_refs)>0
        ) THEN
          RAISE EXCEPTION 'current verified provider capability evidence is required for active adapter: %', v_capability USING ERRCODE='23514';
        END IF;
      END IF;
    END LOOP;
    IF NEW.provider_key='direct_supplier' AND 'order_submission'=ANY(NEW.capabilities)
      AND NOT ('acknowledgement'=ANY(NEW.capabilities)) THEN
      RAISE EXCEPTION 'direct supplier order submission requires acknowledgement capability in the same active adapter' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_supplier_adapter_evidence_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_readiness_v1(p_pilot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_foundation jsonb;
  v_governance jsonb;
  v_offer record;
  v_decision jsonb;
  v_offer_count integer:=0;
  v_product_count integer:=0;
  v_direct_evidence_count integer:=0;
  v_failures jsonb:='[]'::jsonb;
  v_required_capabilities text[]:=ARRAY[
    'catalog','stock','price','shipping','order_submission','acknowledgement',
    'tracking','cancellation','returns','reimbursement'
  ]::text[];
BEGIN
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','pilot_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_pilot.supplier_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_not_found','interfaceVersion',1); END IF;

  v_foundation:=public.server_supplier_foundation_decision_v1(v_supplier.supplier_key,'GB','catalog');
  IF COALESCE((v_foundation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','supplier_foundation','detail',v_foundation));
  END IF;
  v_governance:=public.server_supplier_governance_decision_v1(v_pilot.supplier_id,v_pilot.provider_key);
  IF COALESCE((v_governance->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','supplier_governance','detail',v_governance));
  END IF;

  IF v_pilot.provider_key='direct_supplier' THEN
    SELECT count(DISTINCT ce.capability)::integer INTO v_direct_evidence_count
    FROM private.supplier_onboarding_capability_evidence ce
    WHERE ce.supplier_id=v_pilot.supplier_id AND ce.territory='GB'
      AND ce.capability=ANY(v_required_capabilities) AND ce.status='verified' AND ce.verified_at IS NOT NULL
      AND (ce.expires_at IS NULL OR ce.expires_at>now()) AND jsonb_array_length(ce.source_refs)>0
      AND ce.execution_mode<>'manual_only';
    IF v_direct_evidence_count<>cardinality(v_required_capabilities) THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'check','direct_supplier_capability_evidence',
        'reason','current_supplier_specific_pilot_capability_evidence_missing',
        'verifiedAutomatedCount',v_direct_evidence_count,'requiredCount',cardinality(v_required_capabilities)
      ));
    END IF;
  ELSIF NOT EXISTS(
    SELECT 1 FROM private.supplier_commerce_provider_capabilities c
    WHERE c.provider_key=v_pilot.provider_key AND c.territory='GB'
      AND c.role IN ('supplier','fulfilment_provider') AND c.status='verified'
      AND c.verified_at IS NOT NULL AND c.reverify_due_at>now() AND jsonb_array_length(c.official_source_refs)>0
  ) THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','provider_capability_register','reason','current_verified_provider_capability_missing'
    ));
  END IF;

  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
  WHERE a.supplier_id=v_pilot.supplier_id AND a.provider_key=v_pilot.provider_key AND a.territory='GB'
    AND a.status='active' AND a.interface_version=1 AND a.verified_at IS NOT NULL AND a.verified_by IS NOT NULL
    AND NULLIF(BTRIM(a.config_ref),'') IS NOT NULL AND a.capabilities @> v_required_capabilities
  ORDER BY a.verified_at DESC LIMIT 1;
  IF NOT FOUND THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','single_verified_full_capability_adapter',
      'reason','one_active_verified_gb_adapter_version_with_all_pilot_capabilities_is_required',
      'requiredCapabilities',to_jsonb(v_required_capabilities)
    ));
  END IF;

  SELECT count(*),count(DISTINCT o.canonical_product_id) INTO v_offer_count,v_product_count
  FROM private.supplier_pilot_offers po JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
  WHERE po.pilot_id=v_pilot.id;
  IF v_offer_count<v_pilot.minimum_product_count OR v_offer_count>v_pilot.maximum_product_count OR v_product_count<>v_offer_count THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','pilot_product_set','offerCount',v_offer_count,'distinctProductCount',v_product_count,
      'minimum',v_pilot.minimum_product_count,'maximum',v_pilot.maximum_product_count
    ));
  END IF;

  FOR v_offer IN
    SELECT po.supplier_offer_id,po.external_variant_ref,o.canonical_product_id,o.offer_key
    FROM private.supplier_pilot_offers po JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
    WHERE po.pilot_id=v_pilot.id
  LOOP
    v_decision:=public.server_supplier_catalog_decision_v1(v_offer.canonical_product_id,v_offer.supplier_offer_id,'GB');
    IF COALESCE((v_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','catalog_readiness','offer',v_offer.offer_key,'detail',v_decision));
    END IF;
    v_decision:=public.server_supplier_stock_price_decision_v1(
      v_offer.supplier_offer_id,v_offer.canonical_product_id,'loadify_supplier_fulfilled','GB',v_offer.external_variant_ref
    );
    IF COALESCE((v_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','stock_price_readiness','offer',v_offer.offer_key,'detail',v_decision));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ready',jsonb_array_length(v_failures)=0,
    'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_ready' ELSE 'controlled_pilot_not_ready' END,
    'pilotId',v_pilot.id,'supplierId',v_pilot.supplier_id,'providerKey',v_pilot.provider_key,'territory','GB',
    'adapterId',CASE WHEN v_adapter.id IS NULL THEN NULL ELSE v_adapter.id END,
    'adapterKey',CASE WHEN v_adapter.id IS NULL THEN NULL ELSE v_adapter.adapter_key END,
    'adapterVersion',CASE WHEN v_adapter.id IS NULL THEN NULL ELSE v_adapter.adapter_version END,
    'offerCount',v_offer_count,'distinctProductCount',v_product_count,'failures',v_failures,
    'simulatorPassIsNotPilotPass',true,'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_pilot_readiness_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_readiness_v1(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_prepare_supplier_pilot_v1(
  p_actor_id uuid,p_pilot_id uuid,p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_foundation jsonb;
  v_governance jsonb;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot preparation reason required'; END IF;
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status NOT IN ('draft','paused') THEN RAISE EXCEPTION 'pilot must be draft or paused to enter preparation'; END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_pilot.supplier_id;
  v_foundation:=public.server_supplier_foundation_decision_v1(v_supplier.supplier_key,'GB','catalog');
  IF COALESCE((v_foundation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_foundation_not_ready','detail',v_foundation,'interfaceVersion',1);
  END IF;
  v_governance:=public.server_supplier_governance_decision_v1(v_pilot.supplier_id,v_pilot.provider_key);
  IF COALESCE((v_governance->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_governance_not_ready','detail',v_governance,'interfaceVersion',1);
  END IF;

  IF v_pilot.provider_key='direct_supplier' THEN
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_onboarding_capability_evidence ce
      WHERE ce.supplier_id=v_pilot.supplier_id AND ce.territory='GB' AND ce.capability='catalog'
        AND ce.status='verified' AND ce.verified_at IS NOT NULL AND (ce.expires_at IS NULL OR ce.expires_at>now())
        AND jsonb_array_length(ce.source_refs)>0 AND ce.execution_mode='automated_read'
    ) THEN
      RETURN jsonb_build_object('ok',false,'reason','direct_supplier_capability_not_current','capability','catalog','interfaceVersion',2);
    END IF;
  ELSIF NOT EXISTS(
    SELECT 1 FROM private.supplier_commerce_provider_capabilities c
    WHERE c.provider_key=v_pilot.provider_key AND c.territory='GB' AND c.status='verified' AND c.reverify_due_at>now()
  ) THEN
    RETURN jsonb_build_object('ok',false,'reason','provider_capability_not_current','interfaceVersion',1);
  END IF;

  UPDATE private.supplier_pilot_programs
  SET status='preparing',prepared_by=COALESCE(prepared_by,p_actor_id),prepared_at=COALESCE(prepared_at,now()),updated_at=now()
  WHERE id=v_pilot.id;
  PERFORM private.set_supplier_pilot_master_control_v1(p_actor_id,true,'Phase O preparation: '||BTRIM(p_reason));
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,previous_status,new_status,evidence)
  VALUES(v_pilot.id,p_actor_id,'prepare',v_pilot.status,'preparing',jsonb_build_object('reason',BTRIM(p_reason)));
  RETURN jsonb_build_object('ok',true,'pilotId',v_pilot.id,'status','preparing','buyerFacingOperationsEnabled',false,'interfaceVersion',2);
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_prepare_supplier_pilot_v1(uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_prepare_supplier_pilot_v1(uuid,uuid,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_order_fulfilment_disclosure_v1(
  p_handshake_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_evidence private.supplier_onboarding_capability_evidence%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_control jsonb;
  v_address jsonb;
  v_recipient jsonb := '{}'::jsonb;
  v_name text; v_line1 text; v_line2 text; v_city text; v_region text;
  v_postcode text; v_country text; v_phone text; v_email text;
  v_order_count integer := 0;
BEGIN
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','handshake_not_found','piiDisclosed',false,'interfaceVersion',1); END IF;
  IF v_h.provider_key<>'direct_supplier' THEN RETURN jsonb_build_object('eligible',false,'reason','direct_supplier_only','piiDisclosed',false,'interfaceVersion',1); END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=v_h.order_id;
  IF NOT FOUND OR v_order."commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled' THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_fulfilled_order_required','piiDisclosed',false,'interfaceVersion',1);
  END IF;
  IF lower(COALESCE(v_order.status,'')) IN ('cancelled','refunded') THEN
    RETURN jsonb_build_object('eligible',false,'reason','order_not_fulfillable','piiDisclosed',false,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_h.supplier_id;
  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=v_h.supplier_offer_id AND supplier_id=v_h.supplier_id;
  IF v_supplier.id IS NULL OR v_offer.id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_identity_missing','piiDisclosed',false,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
  WHERE a.supplier_id=v_h.supplier_id AND a.provider_key='direct_supplier' AND a.territory=v_offer.territory
    AND a.status='active' AND a.interface_version=1 AND a.adapter_version=v_h.adapter_version
    AND 'order_submission'=ANY(a.capabilities) AND 'acknowledgement'=ANY(a.capabilities)
    AND a.verified_at IS NOT NULL AND a.verified_by IS NOT NULL AND NULLIF(BTRIM(a.config_ref),'') IS NOT NULL
  ORDER BY a.verified_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','active_order_adapter_missing','piiDisclosed',false,'interfaceVersion',1); END IF;

  SELECT * INTO v_evidence FROM private.supplier_onboarding_capability_evidence ce
  WHERE ce.supplier_id=v_h.supplier_id AND ce.territory=v_offer.territory AND ce.capability='order_submission'
    AND ce.status='verified' AND ce.verified_at IS NOT NULL AND (ce.expires_at IS NULL OR ce.expires_at>now())
    AND jsonb_array_length(ce.source_refs)>0 AND ce.execution_mode='automated_write' AND ce.write_allowed=true
    AND ce.pii_allowed=true AND ce.idempotency_known=true AND ce.lost_response_recovery_known=true
    AND ce.pii_fields @> ARRAY['name','line1','city','postcode','country']::text[]
    AND NULLIF(BTRIM(ce.contract_ref),'') IS NOT NULL
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','order_submission_pii_evidence_not_ready','piiDisclosed',false,'interfaceVersion',1);
  END IF;

  SELECT p.* INTO v_pilot FROM private.supplier_pilot_programs p
  JOIN private.supplier_pilot_offers po ON po.pilot_id=p.id AND po.supplier_offer_id=v_h.supplier_offer_id
  JOIN private.supplier_pilot_cohort_members m ON m.pilot_id=p.id AND m.buyer_id=v_order."buyerId"
  WHERE p.status='active' AND p.supplier_id=v_h.supplier_id AND p.provider_key='direct_supplier' AND p.territory=v_offer.territory
  ORDER BY p.activated_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','active_pilot_scope_missing','piiDisclosed',false,'interfaceVersion',1); END IF;

  IF round(v_order.total*100)::bigint>v_pilot.maximum_order_value_minor THEN
    RETURN jsonb_build_object('eligible',false,'reason','pilot_order_value_limit_exceeded','piiDisclosed',false,'interfaceVersion',1);
  END IF;

  SELECT count(DISTINCT h2.order_id)::integer INTO v_order_count
  FROM private.supplier_order_handshakes h2
  JOIN private.supplier_pilot_offers po2 ON po2.pilot_id=v_pilot.id AND po2.supplier_offer_id=h2.supplier_offer_id
  WHERE h2.supplier_id=v_pilot.supplier_id AND h2.provider_key=v_pilot.provider_key AND h2.created_at>=v_pilot.activated_at;
  IF v_order_count>v_pilot.maximum_order_count THEN
    RETURN jsonb_build_object('eligible',false,'reason','pilot_order_count_limit_exceeded','piiDisclosed',false,'interfaceVersion',1);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1(
    'supplier_order',
    jsonb_build_object(
      'providerRef',v_h.provider_key,'supplierRef',v_supplier.supplier_key,'offerRef',v_offer.id::text,
      'productRef',v_offer.canonical_product_id::text,'territory',v_offer.territory,'cohort',v_pilot.cohort_key
    )
  );
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','supplier_order_control_disabled','controlReason',v_control->>'reason',
      'piiDisclosed',false,'interfaceVersion',1
    );
  END IF;

  v_address:=COALESCE(v_order."shippingAddress",'{}'::jsonb);
  IF jsonb_typeof(v_address)<>'object' THEN RETURN jsonb_build_object('eligible',false,'reason','shipping_address_invalid','piiDisclosed',false,'interfaceVersion',1); END IF;
  v_name:=NULLIF(BTRIM(COALESCE(v_address->>'name',v_order."buyerNameSnapshot",'')),'');
  v_line1:=NULLIF(BTRIM(COALESCE(v_address->>'line1',v_address->>'address1','')),'');
  v_line2:=NULLIF(BTRIM(COALESCE(v_address->>'line2',v_address->>'address2','')),'');
  v_city:=NULLIF(BTRIM(COALESCE(v_address->>'city','')),'');
  v_region:=NULLIF(BTRIM(COALESCE(v_address->>'county',v_address->>'state','')),'');
  v_postcode:=NULLIF(BTRIM(COALESCE(v_address->>'postcode',v_address->>'postal_code','')),'');
  v_country:=upper(BTRIM(COALESCE(v_address->>'countryCode',v_address->>'country','')));
  IF v_country IN ('UNITED KINGDOM','UK') THEN v_country:='GB'; END IF;
  v_phone:=NULLIF(BTRIM(COALESCE(v_address->>'phone','')),'');
  v_email:=NULLIF(BTRIM(COALESCE(v_address->>'email',v_order."buyerEmailSnapshot",'')),'');
  IF v_name IS NULL OR v_line1 IS NULL OR v_city IS NULL OR v_postcode IS NULL OR v_country IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','minimum_delivery_address_missing','piiDisclosed',false,'interfaceVersion',1);
  END IF;
  IF v_country<>v_pilot.territory THEN
    RETURN jsonb_build_object('eligible',false,'reason','delivery_territory_mismatch','piiDisclosed',false,'interfaceVersion',1);
  END IF;

  IF 'name'=ANY(v_evidence.pii_fields) THEN v_recipient:=v_recipient||jsonb_build_object('name',v_name); END IF;
  IF 'line1'=ANY(v_evidence.pii_fields) THEN v_recipient:=v_recipient||jsonb_build_object('line1',v_line1); END IF;
  IF 'line2'=ANY(v_evidence.pii_fields) AND v_line2 IS NOT NULL THEN v_recipient:=v_recipient||jsonb_build_object('line2',v_line2); END IF;
  IF 'city'=ANY(v_evidence.pii_fields) THEN v_recipient:=v_recipient||jsonb_build_object('city',v_city); END IF;
  IF 'region'=ANY(v_evidence.pii_fields) AND v_region IS NOT NULL THEN v_recipient:=v_recipient||jsonb_build_object('region',v_region); END IF;
  IF 'postcode'=ANY(v_evidence.pii_fields) THEN v_recipient:=v_recipient||jsonb_build_object('postcode',v_postcode); END IF;
  IF 'country'=ANY(v_evidence.pii_fields) THEN v_recipient:=v_recipient||jsonb_build_object('country',v_country); END IF;
  IF 'phone'=ANY(v_evidence.pii_fields) AND v_phone IS NOT NULL THEN v_recipient:=v_recipient||jsonb_build_object('phone',v_phone); END IF;
  IF 'email'=ANY(v_evidence.pii_fields) AND v_email IS NOT NULL THEN v_recipient:=v_recipient||jsonb_build_object('email',v_email); END IF;

  RETURN jsonb_build_object(
    'eligible',true,'reason','minimum_fulfilment_disclosure_ready','handshakeId',v_h.id,'orderId',v_order.id,
    'supplierId',v_h.supplier_id,'supplierKey',v_supplier.supplier_key,'pilotId',v_pilot.id,
    'recipient',v_recipient,'disclosedFields',to_jsonb(v_evidence.pii_fields),
    'piiDisclosed',true,'billingAddressDisclosed',false,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_order_fulfilment_disclosure_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_order_fulfilment_disclosure_v1(uuid)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_order_fulfilment_disclosure_v1(uuid) IS
  'Server-only fail-closed minimum delivery PII disclosure for an active Direct Supplier controlled pilot. Billing data is never returned.';
