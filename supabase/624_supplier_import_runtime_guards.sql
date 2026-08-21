-- 624_supplier_import_runtime_guards.sql
-- Phase F closure: Phase C import control enforcement, durable checkpoints,
-- and idempotent normalized-fact recording.

ALTER TABLE private.normalized_product_facts
  ADD COLUMN IF NOT EXISTS fact_idempotency_key text;
UPDATE private.normalized_product_facts
   SET fact_idempotency_key = COALESCE(fact_idempotency_key, 'legacy:' || id::text)
 WHERE fact_idempotency_key IS NULL;
ALTER TABLE private.normalized_product_facts ALTER COLUMN fact_idempotency_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS normalized_product_fact_idempotency_unique
  ON private.normalized_product_facts(import_item_id, fact_idempotency_key);

CREATE OR REPLACE FUNCTION private.guard_supplier_import_control_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_control jsonb;
BEGIN
  v_control := public.server_supplier_commerce_control_decision_v1(
    'import',
    jsonb_build_object(
      'providerRef', NEW.provider_key,
      'supplierRef', NEW.supplier_id::text
    )
  );
  IF COALESCE((v_control->>'enabled')::boolean, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier import blocked by Phase C control: %', COALESCE(v_control->>'reason', 'unknown');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_import_control_v1 ON private.supplier_import_batches;
CREATE TRIGGER trg_guard_supplier_import_control_v1
BEFORE INSERT ON private.supplier_import_batches
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_import_control_v1();

CREATE OR REPLACE FUNCTION public.server_checkpoint_supplier_import_v1(
  p_actor_id uuid,
  p_batch_id uuid,
  p_checkpoint text,
  p_resume_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_batch private.supplier_import_batches%ROWTYPE;
  v_checkpoint text := NULLIF(BTRIM(p_checkpoint), '');
BEGIN
  IF NOT private.phase_f_actor_is_active_admin(p_actor_id) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF v_checkpoint IS NULL THEN RAISE EXCEPTION 'checkpoint is required'; END IF;

  SELECT * INTO v_batch FROM private.supplier_import_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'import batch not found'; END IF;
  IF v_batch.status IN ('accepted','rejected','failed') THEN
    RAISE EXCEPTION 'terminal import batch cannot be resumed';
  END IF;

  UPDATE private.supplier_import_batches
     SET last_checkpoint = v_checkpoint,
         resume_token = COALESCE(NULLIF(BTRIM(p_resume_token), ''), resume_token),
         updated_at = now()
   WHERE id = p_batch_id
   RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'ok', true,
    'batchId', v_batch.id,
    'lastCheckpoint', v_batch.last_checkpoint,
    'resumable', true
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_checkpoint_supplier_import_v1(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_checkpoint_supplier_import_v1(uuid, uuid, text, text)
  TO service_role;

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
  DO UPDATE SET updated_at = private.normalized_product_facts.updated_at
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

-- Source-only migration. No Phase C controls are enabled here.
