-- 625_supplier_import_fact_idempotency_closure.sql
-- Portable final definition of the idempotent Phase F fact-recording boundary.

CREATE OR REPLACE FUNCTION public.server_record_supplier_import_fact_v1(
  p_actor_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_item_id uuid;
  v_product_id uuid;
  v_source_class text;
  v_key text;
  v_fact private.normalized_product_facts%ROWTYPE;
BEGIN
  IF NOT private.phase_f_actor_is_active_admin(p_actor_id) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN RAISE EXCEPTION 'payload must be an object'; END IF;

  v_item_id := NULLIF(v_payload->>'importItemId','')::uuid;
  v_product_id := NULLIF(v_payload->>'canonicalProductId','')::uuid;
  v_source_class := lower(BTRIM(COALESCE(v_payload->>'sourceClass','')));
  v_key := NULLIF(BTRIM(v_payload->>'factIdempotencyKey'), '');

  IF v_key IS NULL THEN RAISE EXCEPTION 'factIdempotencyKey is required'; END IF;
  IF v_source_class NOT IN ('supplier_source','verified_external_source','admin_asserted','ai_proposed') THEN
    RAISE EXCEPTION 'invalid fact source class';
  END IF;
  IF NULLIF(BTRIM(v_payload->>'factKey'),'') IS NULL OR NOT (v_payload ? 'factValue') THEN
    RAISE EXCEPTION 'factKey and factValue are required';
  END IF;

  INSERT INTO private.normalized_product_facts(
    import_item_id, canonical_product_id, fact_key, fact_value, source_class,
    source_ref, source_evidence_hash, ai_model_ref, confidence, review_status,
    fact_idempotency_key
  ) VALUES (
    v_item_id, v_product_id, lower(BTRIM(v_payload->>'factKey')), v_payload->'factValue', v_source_class,
    NULLIF(BTRIM(v_payload->>'sourceRef'),''), NULLIF(BTRIM(v_payload->>'sourceEvidenceHash'),''),
    NULLIF(BTRIM(v_payload->>'aiModelRef'),''), NULLIF(v_payload->>'confidence','')::numeric,
    'pending', v_key
  )
  ON CONFLICT (import_item_id, fact_idempotency_key)
  DO UPDATE SET fact_idempotency_key = EXCLUDED.fact_idempotency_key
  RETURNING * INTO v_fact;

  INSERT INTO private.supplier_import_review_audit(import_item_id, actor_id, action, evidence)
  VALUES (v_item_id, p_actor_id, 'record_normalized_fact', jsonb_build_object(
    'factId', v_fact.id,
    'factIdempotencyKey', v_key,
    'idempotent', true
  ));

  RETURN jsonb_build_object(
    'ok', true,
    'factId', v_fact.id,
    'reviewStatus', v_fact.review_status,
    'idempotent', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_record_supplier_import_fact_v1(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_import_fact_v1(uuid, jsonb)
  TO service_role;
