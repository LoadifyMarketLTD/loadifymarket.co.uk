-- Enforce supplier market capability inside the canonical Supplier Foundation decision.
-- Existing suppliers default to GB-only from the preceding capability migration.

CREATE OR REPLACE FUNCTION public.server_supplier_foundation_decision_v1(
  p_supplier_key text,
  p_territory text DEFAULT 'GB',
  p_required_capability text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_missing text[] := '{}';
  v_required text;
  v_territory text := upper(BTRIM(COALESCE(p_territory,'GB')));
  v_sla private.supplier_sla_versions%ROWTYPE;
  v_compliance private.supplier_compliance_profiles%ROWTYPE;
BEGIN
  IF v_territory NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object('eligible',false,'reason','unsupported_market','interfaceVersion',1);
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE supplier_key=lower(BTRIM(COALESCE(p_supplier_key,'')))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_found','interfaceVersion',1);
  END IF;

  IF NOT (v_territory = ANY(COALESCE(v_supplier.market_codes, ARRAY['GB']::text[]))) THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_market_not_enabled',
      'supplierId',v_supplier.id,
      'requestedMarket',v_territory,
      'interfaceVersion',1
    );
  END IF;

  IF v_supplier.lifecycle_status <> 'approved' THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','supplierId',v_supplier.id,'lifecycleStatus',v_supplier.lifecycle_status,'interfaceVersion',1);
  END IF;

  FOREACH v_required IN ARRAY ARRAY[
    'identity','business_identity','warehouse_origin','uk_shipping','api_feed_capability',
    'stock_reliability','price_reliability','tracking','returns','documentation',
    'compliance','content_rights'
  ]::text[] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM private.supplier_qualification_evidence q
      WHERE q.supplier_id=v_supplier.id
        AND q.evidence_type=v_required
        AND q.status='verified'
        AND (q.expires_at IS NULL OR q.expires_at>now())
    ) THEN
      v_missing:=array_append(v_missing,v_required);
    END IF;
  END LOOP;

  IF cardinality(v_missing)>0 THEN
    RETURN jsonb_build_object('eligible',false,'reason','qualification_incomplete','supplierId',v_supplier.id,'missingEvidence',to_jsonb(v_missing),'interfaceVersion',1);
  END IF;

  SELECT * INTO v_sla
  FROM private.supplier_sla_versions s
  WHERE s.supplier_id=v_supplier.id
    AND s.status='active'
    AND s.effective_from<=now()
    AND (s.effective_to IS NULL OR s.effective_to>now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','active_sla_missing','supplierId',v_supplier.id,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_compliance
  FROM private.supplier_compliance_profiles c
  WHERE c.supplier_id=v_supplier.id
    AND upper(c.territory)=v_territory
  LIMIT 1;

  IF NOT FOUND OR v_compliance.status<>'approved' OR v_compliance.risk_class='red'
     OR (v_compliance.expires_at IS NOT NULL AND v_compliance.expires_at<=now()) THEN
    RETURN jsonb_build_object('eligible',false,'reason','compliance_not_approved','supplierId',v_supplier.id,'interfaceVersion',1);
  END IF;

  IF NULLIF(lower(BTRIM(p_required_capability)),'') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM private.supplier_adapter_registrations a
       WHERE a.supplier_id=v_supplier.id
         AND a.status='active'
         AND lower(BTRIM(p_required_capability))=ANY(a.capabilities)
     ) THEN
    RETURN jsonb_build_object('eligible',false,'reason','adapter_capability_missing','supplierId',v_supplier.id,'interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_foundation_ready',
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'market',v_territory,
    'slaVersion',v_sla.version,
    'complianceVersion',v_compliance.version,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_foundation_decision_v1(text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_foundation_decision_v1(text,text,text)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_foundation_decision_v1(text,text,text) IS
  'Supplier qualification/SLA/compliance/adapter readiness decision with explicit GB/RO market eligibility. Fail-closed for unsupported or disabled markets.';
