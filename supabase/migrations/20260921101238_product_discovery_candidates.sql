CREATE TABLE IF NOT EXISTS private.product_discovery_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  final_url text NOT NULL,
  source_host text NOT NULL,
  source_digest text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('json_ld_product','open_graph_fallback')),
  observed_at timestamptz NOT NULL,
  facts_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','rejected','supplier_linked')),
  operator_note text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  supplier_key text,
  canonical_product_id uuid REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_discovery_candidates_source_digest_check
    CHECK (source_digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT product_discovery_candidates_facts_object_check
    CHECK (jsonb_typeof(facts_snapshot)='object')
);

CREATE UNIQUE INDEX IF NOT EXISTS product_discovery_candidates_digest_unique
  ON private.product_discovery_candidates(source_digest);

REVOKE ALL ON TABLE private.product_discovery_candidates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE private.product_discovery_candidates TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_save_product_discovery_candidate_v1(
  p_actor_id uuid,
  p_source_url text,
  p_final_url text,
  p_source_host text,
  p_source_digest text,
  p_source_type text,
  p_observed_at timestamptz,
  p_facts_snapshot jsonb,
  p_operator_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_row private.product_discovery_candidates%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_source_url,'')),'') IS NULL
     OR NULLIF(BTRIM(COALESCE(p_final_url,'')),'') IS NULL
     OR NULLIF(BTRIM(COALESCE(p_source_host,'')),'') IS NULL THEN
    RAISE EXCEPTION 'source URL identity is required';
  END IF;
  IF COALESCE(p_source_digest,'') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'source digest is invalid';
  END IF;
  IF p_source_type NOT IN ('json_ld_product','open_graph_fallback') THEN
    RAISE EXCEPTION 'source type is invalid';
  END IF;
  IF jsonb_typeof(p_facts_snapshot)<>'object' THEN
    RAISE EXCEPTION 'facts snapshot must be a JSON object';
  END IF;

  INSERT INTO private.product_discovery_candidates(
    source_url,final_url,source_host,source_digest,source_type,observed_at,
    facts_snapshot,status,operator_note,created_by
  ) VALUES(
    BTRIM(p_source_url),BTRIM(p_final_url),lower(BTRIM(p_source_host)),p_source_digest,
    p_source_type,p_observed_at,p_facts_snapshot,'candidate',COALESCE(p_operator_note,''),p_actor_id
  )
  ON CONFLICT (source_digest) DO UPDATE SET
    final_url=EXCLUDED.final_url,
    source_host=EXCLUDED.source_host,
    source_type=EXCLUDED.source_type,
    observed_at=EXCLUDED.observed_at,
    facts_snapshot=EXCLUDED.facts_snapshot,
    operator_note=CASE
      WHEN EXCLUDED.operator_note<>'' THEN EXCLUDED.operator_note
      ELSE private.product_discovery_candidates.operator_note
    END,
    updated_at=now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok',true,
    'candidateId',v_row.id,
    'status',v_row.status,
    'sourceDigest',v_row.source_digest,
    'supplierLinked',v_row.supplier_key IS NOT NULL,
    'canonicalProductLinked',v_row.canonical_product_id IS NOT NULL,
    'marketplaceListingAllowed',false,
    'commercialActivationAllowed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_save_product_discovery_candidate_v1(
  uuid,text,text,text,text,text,timestamptz,jsonb,text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_save_product_discovery_candidate_v1(
  uuid,text,text,text,text,text,timestamptz,jsonb,text
) TO service_role;

COMMENT ON TABLE private.product_discovery_candidates IS
'Operator product-discovery evidence only. Rows are not supplier offers, canonical products, marketplace listings or commercial activation evidence.';

COMMENT ON FUNCTION public.server_admin_save_product_discovery_candidate_v1(
  uuid,text,text,text,text,text,timestamptz,jsonb,text
) IS
'Stores an admin-reviewed discovery candidate from a server-side product URL preview. Does not create supplier identity, canonical product, listing, checkout eligibility or provider activation.';
