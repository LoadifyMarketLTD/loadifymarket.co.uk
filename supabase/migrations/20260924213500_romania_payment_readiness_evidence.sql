-- Romania payment-readiness evidence. This proves capability only; it does
-- not switch on checkout or payment endpoints.

CREATE TABLE IF NOT EXISTS private.market_payment_readiness_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL,
  evidence_domain text NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  source_ref text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_payment_readiness_market_check CHECK (market_code IN ('GB','RO')),
  CONSTRAINT market_payment_readiness_domain_check CHECK (evidence_domain IN (
    'ron_charge_support',
    'merchant_account_capability',
    'sca_3ds_support',
    'refund_support',
    'settlement_reconciliation'
  )),
  CONSTRAINT market_payment_readiness_status_check CHECK (status IN ('draft','verified','expired','rejected')),
  CONSTRAINT market_payment_readiness_source_ref_check CHECK (NULLIF(BTRIM(source_ref),'') IS NOT NULL),
  CONSTRAINT market_payment_readiness_hash_check CHECK (NULLIF(BTRIM(evidence_hash),'') IS NOT NULL),
  CONSTRAINT market_payment_readiness_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT market_payment_readiness_dates_check CHECK (valid_to IS NULL OR valid_to>valid_from),
  CONSTRAINT market_payment_readiness_verified_check CHECK (
    status<>'verified'
    OR (
      reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND evidence<>'{}'::jsonb
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS market_payment_readiness_current_verified_unique
  ON private.market_payment_readiness_evidence(market_code,evidence_domain,provider)
  WHERE status='verified' AND valid_to IS NULL;

CREATE INDEX IF NOT EXISTS market_payment_readiness_lookup_idx
  ON private.market_payment_readiness_evidence(market_code,evidence_domain,status,valid_from DESC);

REVOKE ALL ON TABLE private.market_payment_readiness_evidence
  FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.server_market_payment_readiness_v1(
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'')));
  v_required text;
  v_missing text[]:='{}';
  v_required_ro constant text[]:=ARRAY[
    'ron_charge_support',
    'merchant_account_capability',
    'sca_3ds_support',
    'refund_support',
    'settlement_reconciliation'
  ]::text[];
BEGIN
  IF v_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object('eligible',false,'reason','unsupported_market','interfaceVersion',1);
  END IF;

  IF v_market='GB' THEN
    RETURN jsonb_build_object(
      'eligible',true,
      'reason','existing_uk_payment_boundary',
      'market','GB',
      'currency','GBP',
      'interfaceVersion',1
    );
  END IF;

  FOREACH v_required IN ARRAY v_required_ro LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM private.market_payment_readiness_evidence e
      WHERE e.market_code='RO'
        AND e.evidence_domain=v_required
        AND e.provider='stripe'
        AND e.status='verified'
        AND e.valid_from<=now()
        AND (e.valid_to IS NULL OR e.valid_to>now())
    ) THEN
      v_missing:=array_append(v_missing,v_required);
    END IF;
  END LOOP;

  IF cardinality(v_missing)>0 THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','payment_readiness_incomplete',
      'market','RO',
      'currency','RON',
      'provider','stripe',
      'missingEvidence',to_jsonb(v_missing),
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','payment_readiness_ready',
    'market','RO',
    'currency','RON',
    'provider','stripe',
    'verifiedDomains',to_jsonb(v_required_ro),
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_market_payment_readiness_v1(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_market_payment_readiness_v1(text)
  TO service_role;

COMMENT ON FUNCTION public.server_market_payment_readiness_v1(text) IS
  'Evidence-backed payment capability decision. It does not activate Romania checkout or Stripe payment endpoints.';
