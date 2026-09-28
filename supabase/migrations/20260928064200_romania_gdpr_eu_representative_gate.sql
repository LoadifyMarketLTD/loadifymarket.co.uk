-- Romania GDPR Article 27 EU representative launch gate.
-- Romania remains prelaunch until a verified evidence record establishes the
-- controller's Article 27 position and, where required, the appointed EU representative.
-- No representative identity is invented or inferred in this migration.

ALTER TABLE private.market_compliance_evidence
  DROP CONSTRAINT IF EXISTS market_compliance_domain_check;

ALTER TABLE private.market_compliance_evidence
  ADD CONSTRAINT market_compliance_domain_check CHECK (evidence_domain IN (
    'trader_traceability',
    'product_safety_listing',
    'responsible_person_identity',
    'consumer_distance_contract',
    'withdrawal_returns',
    'vat_ecommerce',
    'legal_disclosures',
    'product_category_restrictions',
    'complaints_moderation',
    'recall_cooperation',
    'gdpr_eu_representative'
  ));

CREATE OR REPLACE FUNCTION public.server_market_compliance_readiness_v1(
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text := upper(BTRIM(COALESCE(p_market_code,'')));
  v_required text;
  v_missing text[] := '{}';
  v_required_domains constant text[] := ARRAY[
    'trader_traceability',
    'product_safety_listing',
    'responsible_person_identity',
    'consumer_distance_contract',
    'withdrawal_returns',
    'vat_ecommerce',
    'legal_disclosures',
    'product_category_restrictions',
    'complaints_moderation',
    'recall_cooperation',
    'gdpr_eu_representative'
  ]::text[];
BEGIN
  IF v_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','unsupported_market',
      'interfaceVersion',1
    );
  END IF;

  IF v_market='GB' THEN
    RETURN jsonb_build_object(
      'eligible',true,
      'reason','existing_uk_compliance_boundary',
      'market','GB',
      'interfaceVersion',1
    );
  END IF;

  FOREACH v_required IN ARRAY v_required_domains LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM private.market_compliance_evidence e
      WHERE e.market_code=v_market
        AND e.evidence_domain=v_required
        AND e.status='verified'
        AND e.valid_from<=now()
        AND (e.valid_to IS NULL OR e.valid_to>now())
    ) THEN
      v_missing := array_append(v_missing,v_required);
    END IF;
  END LOOP;

  IF cardinality(v_missing)>0 THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','market_compliance_incomplete',
      'market',v_market,
      'missingEvidence',to_jsonb(v_missing),
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','market_compliance_ready',
    'market',v_market,
    'verifiedDomains',to_jsonb(v_required_domains),
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_market_compliance_readiness_v1(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_market_compliance_readiness_v1(text)
  TO service_role;

COMMENT ON FUNCTION public.server_market_compliance_readiness_v1(text) IS
  'Fail-closed Romania/EU compliance readiness gate, including verified GDPR Article 27 EU-representative evidence. GB remains governed by the existing UK compliance boundary.';
