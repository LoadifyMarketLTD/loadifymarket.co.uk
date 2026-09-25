-- EU/RO product-level safety and traceability gate.
-- Market-level compliance evidence is necessary but not sufficient: every
-- Romania product must also carry reviewed product-specific evidence.

ALTER TABLE private.supplier_import_compliance_reviews
  DROP CONSTRAINT IF EXISTS supplier_import_compliance_class_check,
  ADD CONSTRAINT supplier_import_compliance_class_check CHECK (
    review_class IN (
      'product_safety','restricted_goods','claims','labelling','documentation','marketability',
      'manufacturer_identity','eu_responsible_person_assessment','traceability','safety_information'
    )
  );

CREATE OR REPLACE FUNCTION public.server_product_market_compliance_decision_v1(
  p_supplier_catalog_item_id uuid,
  p_canonical_product_id uuid,
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text := upper(BTRIM(COALESCE(p_market_code,'')));
  v_item private.supplier_import_items%ROWTYPE;
  v_market_decision jsonb;
  v_required text;
  v_missing text[] := '{}';
  v_required_ro constant text[] := ARRAY[
    'product_safety',
    'labelling',
    'documentation',
    'marketability',
    'manufacturer_identity',
    'eu_responsible_person_assessment',
    'traceability',
    'safety_information'
  ]::text[];
BEGIN
  IF v_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object('eligible',false,'reason','unsupported_market','interfaceVersion',1);
  END IF;

  SELECT * INTO v_item
  FROM private.supplier_import_items
  WHERE supplier_catalog_item_id=p_supplier_catalog_item_id
    AND canonical_product_id=p_canonical_product_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND OR v_item.status<>'approved' THEN
    RETURN jsonb_build_object('eligible',false,'reason','import_item_not_approved','interfaceVersion',1);
  END IF;

  IF v_market='GB' THEN
    RETURN public.server_supplier_import_decision_v1(
      p_supplier_catalog_item_id,
      p_canonical_product_id
    );
  END IF;

  v_market_decision := public.server_market_compliance_readiness_v1('RO');
  IF COALESCE((v_market_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','market_compliance_not_ready',
      'market','RO',
      'interfaceVersion',1
    );
  END IF;

  FOREACH v_required IN ARRAY v_required_ro LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_import_compliance_reviews c
      WHERE c.import_item_id=v_item.id
        AND c.territory='RO'
        AND c.review_class=v_required
        AND c.status='approved'
        AND c.reviewed_by IS NOT NULL
        AND c.reviewed_at IS NOT NULL
        AND jsonb_array_length(c.evidence_refs)>0
        AND (c.expires_at IS NULL OR c.expires_at>now())
    ) THEN
      v_missing:=array_append(v_missing,v_required);
    END IF;
  END LOOP;

  IF cardinality(v_missing)>0 THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','product_market_compliance_incomplete',
      'market','RO',
      'supplierCatalogItemId',p_supplier_catalog_item_id,
      'canonicalProductId',p_canonical_product_id,
      'missingEvidence',to_jsonb(v_missing),
      'interfaceVersion',1
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM private.supplier_import_compliance_reviews c
    WHERE c.import_item_id=v_item.id
      AND c.territory='RO'
      AND c.review_class IN ('restricted_goods','claims')
      AND (
        c.status<>'approved'
        OR (c.expires_at IS NOT NULL AND c.expires_at<=now())
      )
  ) THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','product_market_restriction_review_failed',
      'market','RO',
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','product_market_compliance_ready',
    'market','RO',
    'supplierCatalogItemId',p_supplier_catalog_item_id,
    'canonicalProductId',p_canonical_product_id,
    'verifiedReviewClasses',to_jsonb(v_required_ro),
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_product_market_compliance_decision_v1(uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_product_market_compliance_decision_v1(uuid,uuid,text)
  TO service_role;

COMMENT ON FUNCTION public.server_product_market_compliance_decision_v1(uuid,uuid,text) IS
  'Fail-closed product-specific GB/RO compliance decision. RO requires market readiness plus reviewed safety, manufacturer identity, EU responsible-person applicability/evidence, traceability, labelling, documentation and safety-information evidence.';
