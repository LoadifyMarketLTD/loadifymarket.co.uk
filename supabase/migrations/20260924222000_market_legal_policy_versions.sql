-- Versioned market legal policy evidence used for transaction-time snapshots.
-- No legal text is invented here; only reviewed policy versions may become active.

CREATE TABLE IF NOT EXISTS private.market_legal_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL,
  policy_type text NOT NULL,
  locale text NOT NULL,
  version text NOT NULL,
  source_ref text NOT NULL,
  evidence_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_legal_policy_market_check CHECK (market_code IN ('GB','RO')),
  CONSTRAINT market_legal_policy_type_check CHECK (policy_type IN (
    'buyer_terms','privacy','returns_policy','shipping_policy'
  )),
  CONSTRAINT market_legal_policy_locale_check CHECK (
    (market_code='GB' AND locale='en-GB')
    OR (market_code='RO' AND locale='ro-RO')
  ),
  CONSTRAINT market_legal_policy_status_check CHECK (status IN ('draft','verified','retired','rejected')),
  CONSTRAINT market_legal_policy_version_check CHECK (NULLIF(BTRIM(version),'') IS NOT NULL),
  CONSTRAINT market_legal_policy_source_check CHECK (NULLIF(BTRIM(source_ref),'') IS NOT NULL),
  CONSTRAINT market_legal_policy_hash_check CHECK (NULLIF(BTRIM(evidence_hash),'') IS NOT NULL),
  CONSTRAINT market_legal_policy_dates_check CHECK (effective_to IS NULL OR effective_to>effective_from),
  CONSTRAINT market_legal_policy_verified_check CHECK (
    status<>'verified'
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS market_legal_policy_one_current_verified_unique
  ON private.market_legal_policy_versions(market_code,policy_type)
  WHERE status='verified' AND effective_to IS NULL;

CREATE INDEX IF NOT EXISTS market_legal_policy_lookup_idx
  ON private.market_legal_policy_versions(market_code,policy_type,status,effective_from DESC);

REVOKE ALL ON TABLE private.market_legal_policy_versions
  FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.server_market_legal_policy_snapshot_v1(
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'')));
  v_locale text;
  v_required text;
  v_missing text[]:='{}';
  v_required_types constant text[]:=ARRAY[
    'buyer_terms','privacy','returns_policy','shipping_policy'
  ]::text[];
  v_snapshot jsonb:='{}'::jsonb;
  v_row private.market_legal_policy_versions%ROWTYPE;
BEGIN
  IF v_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object('eligible',false,'reason','unsupported_market','interfaceVersion',1);
  END IF;

  IF v_market='GB' THEN
    RETURN jsonb_build_object(
      'eligible',true,
      'reason','existing_uk_legal_policy_boundary',
      'market','GB',
      'locale','en-GB',
      'interfaceVersion',1
    );
  END IF;

  v_locale:='ro-RO';

  FOREACH v_required IN ARRAY v_required_types LOOP
    SELECT * INTO v_row
    FROM private.market_legal_policy_versions p
    WHERE p.market_code='RO'
      AND p.policy_type=v_required
      AND p.locale=v_locale
      AND p.status='verified'
      AND p.effective_from<=now()
      AND (p.effective_to IS NULL OR p.effective_to>now())
    ORDER BY p.effective_from DESC
    LIMIT 1;

    IF NOT FOUND THEN
      v_missing:=array_append(v_missing,v_required);
    ELSE
      v_snapshot:=v_snapshot || jsonb_build_object(
        v_required,
        jsonb_build_object(
          'version',v_row.version,
          'sourceRef',v_row.source_ref,
          'evidenceHash',v_row.evidence_hash,
          'effectiveFrom',v_row.effective_from
        )
      );
    END IF;
  END LOOP;

  IF cardinality(v_missing)>0 THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','legal_policy_versions_incomplete',
      'market','RO',
      'locale',v_locale,
      'missingPolicies',to_jsonb(v_missing),
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','legal_policy_versions_ready',
    'market','RO',
    'locale',v_locale,
    'policies',v_snapshot,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_market_legal_policy_snapshot_v1(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_market_legal_policy_snapshot_v1(text)
  TO service_role;

COMMENT ON TABLE private.market_legal_policy_versions IS
  'Reviewed version identities for market-specific legal policies. Does not store or approve legal text by itself.';
