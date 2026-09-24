-- Romania / EU market compliance evidence gate.
-- Evidence records are private and versioned. This gate does not constitute
-- legal advice and cannot activate checkout by itself.

CREATE TABLE IF NOT EXISTS private.market_compliance_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL,
  evidence_domain text NOT NULL,
  source_type text NOT NULL,
  source_ref text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_compliance_market_check CHECK (market_code IN ('GB','RO')),
  CONSTRAINT market_compliance_domain_check CHECK (evidence_domain IN (
    'trader_traceability',
    'product_safety_listing',
    'responsible_person_identity',
    'consumer_distance_contract',
    'withdrawal_returns',
    'vat_ecommerce',
    'legal_disclosures',
    'product_category_restrictions',
    'complaints_moderation',
    'recall_cooperation'
  )),
  CONSTRAINT market_compliance_source_type_check CHECK (source_type IN (
    'authoritative_source','legal_review','tax_review','policy_review','operational_evidence'
  )),
  CONSTRAINT market_compliance_status_check CHECK (status IN ('draft','verified','expired','rejected')),
  CONSTRAINT market_compliance_source_ref_check CHECK (NULLIF(BTRIM(source_ref),'') IS NOT NULL),
  CONSTRAINT market_compliance_hash_check CHECK (NULLIF(BTRIM(evidence_hash),'') IS NOT NULL),
  CONSTRAINT market_compliance_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT market_compliance_dates_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT market_compliance_verified_check CHECK (
    status <> 'verified'
    OR (
      reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND evidence <> '{}'::jsonb
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS market_compliance_evidence_version_unique
  ON private.market_compliance_evidence(market_code,evidence_domain,version);

CREATE UNIQUE INDEX IF NOT EXISTS market_compliance_one_current_verified_unique
  ON private.market_compliance_evidence(market_code,evidence_domain)
  WHERE status='verified' AND valid_to IS NULL;

CREATE INDEX IF NOT EXISTS market_compliance_readiness_lookup_idx
  ON private.market_compliance_evidence(market_code,evidence_domain,status,valid_from DESC);

REVOKE ALL ON TABLE private.market_compliance_evidence
  FROM PUBLIC, anon, authenticated, service_role;

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
    'recall_cooperation'
  ]::text[];
BEGIN
  IF v_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','unsupported_market',
      'interfaceVersion',1
    );
  END IF;

  -- GB is the existing live market and is governed by the existing UK
  -- compliance controls. This new ledger is the incremental RO/EU gate.
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

COMMENT ON TABLE private.market_compliance_evidence IS
  'Versioned market compliance evidence. Records do not themselves activate checkout or create legal conclusions.';
COMMENT ON FUNCTION public.server_market_compliance_readiness_v1(text) IS
  'Fail-closed Romania/EU compliance readiness gate. GB remains governed by the existing UK compliance boundary.';
