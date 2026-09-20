CREATE OR REPLACE FUNCTION public.server_get_verified_canonical_product_facts_v1(
  p_canonical_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_facts jsonb;
BEGIN
  IF p_canonical_product_id IS NULL THEN
    RAISE EXCEPTION 'canonical product id is required';
  END IF;

  SELECT COALESCE(jsonb_object_agg(fact_key, fact_value), '{}'::jsonb)
  INTO v_facts
  FROM (
    SELECT DISTINCT ON (fact_key) fact_key, fact_value
    FROM private.normalized_product_facts
    WHERE canonical_product_id = p_canonical_product_id
      AND review_status = 'verified'
      AND source_class <> 'ai_proposed'
    ORDER BY fact_key, fact_version DESC, reviewed_at DESC, created_at DESC
  ) verified;

  RETURN jsonb_build_object(
    'interfaceVersion', 1,
    'canonicalProductId', p_canonical_product_id,
    'factsVerified', true,
    'facts', v_facts,
    'factCount', jsonb_object_length(v_facts)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_get_verified_canonical_product_facts_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.server_get_verified_canonical_product_facts_v1(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.server_get_verified_canonical_product_facts_v1(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.server_get_verified_canonical_product_facts_v1(uuid) TO service_role;
