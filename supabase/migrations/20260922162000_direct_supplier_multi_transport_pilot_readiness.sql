-- Align Direct Supplier controlled-pilot readiness with the Universal Supplier Integration Kit.
-- Direct Supplier may use different verified transports per capability.
-- Non-direct providers retain the existing single-adapter rule.

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
  v_direct_binding_count integer:=0;
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
    WHERE ce.supplier_id=v_pilot.supplier_id
      AND ce.territory='GB'
      AND ce.capability=ANY(v_required_capabilities)
      AND ce.status='verified'
      AND ce.verified_at IS NOT NULL
      AND (ce.expires_at IS NULL OR ce.expires_at>now())
      AND jsonb_array_length(ce.source_refs)>0;

    IF v_direct_evidence_count<>cardinality(v_required_capabilities) THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'check','direct_supplier_capability_evidence',
        'reason','current_supplier_specific_pilot_capability_evidence_missing',
        'verifiedCount',v_direct_evidence_count,
        'requiredCount',cardinality(v_required_capabilities)
      ));
    END IF;

    SELECT count(DISTINCT p.capability)::integer INTO v_direct_binding_count
    FROM private.supplier_integration_profiles p
    WHERE p.supplier_id=v_pilot.supplier_id
      AND p.territory='GB'
      AND p.capability=ANY(v_required_capabilities)
      AND p.status='verified'
      AND p.contract_ref IS NOT NULL
      AND (
        p.execution_mode='manual_only'
        OR NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
      );

    IF v_direct_binding_count<>cardinality(v_required_capabilities) THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'check','direct_supplier_integration_bindings',
        'reason','verified_transport_binding_missing',
        'verifiedBindingCount',v_direct_binding_count,
        'requiredCount',cardinality(v_required_capabilities)
      ));
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_pilot.supplier_id
        AND p.territory='GB'
        AND p.capability='order_submission'
        AND p.status='verified'
        AND p.execution_mode='automated_write'
        AND p.transport IN ('http_rest','graphql')
        AND NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
    ) THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'check','direct_supplier_order_runtime',
        'reason','verified_automated_order_binding_required'
      ));
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_pilot.supplier_id
        AND p.territory='GB'
        AND p.capability='acknowledgement'
        AND p.status='verified'
        AND p.execution_mode IN ('automated_read','automated_write')
        AND p.transport IN ('http_rest','graphql','webhook')
    ) THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'check','direct_supplier_ack_runtime',
        'reason','verified_acknowledgement_binding_required'
      ));
    END IF;
  ELSE
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_commerce_provider_capabilities c
      WHERE c.provider_key=v_pilot.provider_key AND c.territory='GB'
        AND c.role IN ('supplier','fulfilment_provider') AND c.status='verified'
        AND c.verified_at IS NOT NULL AND c.reverify_due_at>now()
        AND jsonb_array_length(c.official_source_refs)>0
    ) THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'check','provider_capability_register','reason','current_verified_provider_capability_missing'
      ));
    END IF;

    SELECT * INTO v_adapter
    FROM private.supplier_adapter_registrations a
    WHERE a.supplier_id=v_pilot.supplier_id
      AND a.provider_key=v_pilot.provider_key
      AND a.territory='GB'
      AND a.status='active'
      AND a.interface_version=1
      AND a.verified_at IS NOT NULL
      AND a.verified_by IS NOT NULL
      AND NULLIF(BTRIM(a.config_ref),'') IS NOT NULL
      AND a.capabilities @> v_required_capabilities
    ORDER BY a.verified_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'check','single_verified_full_capability_adapter',
        'reason','one_active_verified_gb_adapter_version_with_all_pilot_capabilities_is_required',
        'requiredCapabilities',to_jsonb(v_required_capabilities)
      ));
    END IF;
  END IF;

  SELECT count(*),count(DISTINCT o.canonical_product_id) INTO v_offer_count,v_product_count
  FROM private.supplier_pilot_offers po
  JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
  WHERE po.pilot_id=v_pilot.id;

  IF v_offer_count<v_pilot.minimum_product_count OR v_offer_count>v_pilot.maximum_product_count OR v_product_count<>v_offer_count THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','pilot_product_set','offerCount',v_offer_count,'distinctProductCount',v_product_count,
      'minimum',v_pilot.minimum_product_count,'maximum',v_pilot.maximum_product_count
    ));
  END IF;

  FOR v_offer IN
    SELECT po.supplier_offer_id,po.external_variant_ref,o.canonical_product_id,o.offer_key
    FROM private.supplier_pilot_offers po
    JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
    WHERE po.pilot_id=v_pilot.id
  LOOP
    v_decision:=public.server_supplier_catalog_decision_v1(v_offer.canonical_product_id,v_offer.supplier_offer_id,'GB');
    IF COALESCE((v_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','catalog_readiness','offer',v_offer.offer_key,'detail',v_decision));
    END IF;

    v_decision:=public.server_supplier_stock_price_decision_v1(
      v_offer.supplier_offer_id,v_offer.canonical_product_id,
      'loadify_supplier_fulfilled','GB',v_offer.external_variant_ref
    );
    IF COALESCE((v_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','stock_price_readiness','offer',v_offer.offer_key,'detail',v_decision));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ready',jsonb_array_length(v_failures)=0,
    'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_ready' ELSE 'controlled_pilot_not_ready' END,
    'pilotId',v_pilot.id,'supplierId',v_pilot.supplier_id,'providerKey',v_pilot.provider_key,'territory','GB',
    'adapterId',CASE WHEN v_pilot.provider_key='direct_supplier' THEN NULL ELSE v_adapter.id END,
    'adapterKey',CASE WHEN v_pilot.provider_key='direct_supplier' THEN 'universal_supplier_integration_kit' ELSE v_adapter.adapter_key END,
    'adapterVersion',CASE WHEN v_pilot.provider_key='direct_supplier' THEN '1.0.0' ELSE v_adapter.adapter_version END,
    'offerCount',v_offer_count,'distinctProductCount',v_product_count,'failures',v_failures,
    'simulatorPassIsNotPilotPass',true,'interfaceVersion',3
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_pilot_readiness_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_readiness_v1(uuid)
  TO service_role;
