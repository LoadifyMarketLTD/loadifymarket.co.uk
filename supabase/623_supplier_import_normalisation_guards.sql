-- 623_supplier_import_normalisation_guards.sql
-- Phase F hard guards + active-admin mutation boundary.
-- Import is auditable, resumable and idempotent. AI proposals never become facts.

CREATE OR REPLACE FUNCTION private.phase_f_actor_is_active_admin(p_actor_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = p_actor_id
       AND u.role = 'admin'
       AND u."isActive" = true
  );
$$;
REVOKE ALL ON FUNCTION private.phase_f_actor_is_active_admin(uuid) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE private.supplier_import_batches
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS resume_token text,
  ADD COLUMN IF NOT EXISTS last_checkpoint text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE private.supplier_import_batches
   SET idempotency_key = COALESCE(idempotency_key, 'legacy:' || id::text)
 WHERE idempotency_key IS NULL;
ALTER TABLE private.supplier_import_batches ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS supplier_import_batch_idempotency_unique
  ON private.supplier_import_batches(supplier_id, provider_key, idempotency_key);

ALTER TABLE private.supplier_import_items
  ADD COLUMN IF NOT EXISTS item_idempotency_key text;
UPDATE private.supplier_import_items
   SET item_idempotency_key = COALESCE(item_idempotency_key, 'legacy:' || id::text)
 WHERE item_idempotency_key IS NULL;
ALTER TABLE private.supplier_import_items ALTER COLUMN item_idempotency_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS supplier_import_item_idempotency_unique
  ON private.supplier_import_items(batch_id, item_idempotency_key);

CREATE OR REPLACE FUNCTION private.guard_normalized_product_fact_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_item_product uuid;
BEGIN
  SELECT canonical_product_id INTO v_item_product
    FROM private.supplier_import_items
   WHERE id = NEW.import_item_id;

  IF NOT FOUND OR v_item_product IS NULL OR v_item_product <> NEW.canonical_product_id THEN
    RAISE EXCEPTION 'normalized fact canonical identity must match import item';
  END IF;

  IF NEW.source_class = 'ai_proposed' THEN
    IF NEW.review_status = 'verified' THEN
      RAISE EXCEPTION 'AI FACTS LOCK: AI proposal cannot become a verified fact';
    END IF;
    IF NULLIF(BTRIM(NEW.ai_model_ref), '') IS NULL THEN
      RAISE EXCEPTION 'AI proposal requires model provenance';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.review_status = 'verified' AND (
    NEW.fact_key IS DISTINCT FROM OLD.fact_key
    OR NEW.fact_value IS DISTINCT FROM OLD.fact_value
    OR NEW.source_class IS DISTINCT FROM OLD.source_class
    OR NEW.source_ref IS DISTINCT FROM OLD.source_ref
    OR NEW.source_evidence_hash IS DISTINCT FROM OLD.source_evidence_hash
  ) THEN
    RAISE EXCEPTION 'verified normalized fact evidence is immutable';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_normalized_product_fact_v1 ON private.normalized_product_facts;
CREATE TRIGGER trg_guard_normalized_product_fact_v1
BEFORE INSERT OR UPDATE ON private.normalized_product_facts
FOR EACH ROW EXECUTE FUNCTION private.guard_normalized_product_fact_v1();

CREATE OR REPLACE FUNCTION private.guard_import_item_approval_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_required text;
BEGIN
  IF NEW.status = 'approved' THEN
    IF NEW.canonical_product_id IS NULL THEN
      RAISE EXCEPTION 'approved import item requires canonical product mapping';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM private.normalized_product_facts f
       WHERE f.import_item_id = NEW.id
         AND f.review_status = 'verified'
         AND f.source_class <> 'ai_proposed'
    ) THEN
      RAISE EXCEPTION 'approved import item requires verified non-AI facts';
    END IF;

    IF EXISTS (
      SELECT 1 FROM private.normalized_product_facts f
       WHERE f.import_item_id = NEW.id
         AND f.review_status IN ('pending','stale')
    ) THEN
      RAISE EXCEPTION 'pending or stale facts block import approval';
    END IF;

    FOREACH v_required IN ARRAY ARRAY[
      'product_safety','restricted_goods','claims','labelling','documentation','marketability'
    ]::text[] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM private.supplier_import_compliance_reviews c
         WHERE c.import_item_id = NEW.id
           AND c.territory = 'GB'
           AND c.review_class = v_required
           AND c.status = 'approved'
           AND (c.expires_at IS NULL OR c.expires_at > now())
      ) THEN
        RAISE EXCEPTION 'complete current GB compliance review is required before import approval';
      END IF;
    END LOOP;

    IF EXISTS (
      SELECT 1 FROM private.supplier_import_asset_rights r
       WHERE r.import_item_id = NEW.id
         AND r.rights_status <> 'verified'
    ) THEN
      RAISE EXCEPTION 'uncleared asset rights block import approval';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_import_item_approval_v1 ON private.supplier_import_items;
CREATE TRIGGER trg_guard_import_item_approval_v1
BEFORE INSERT OR UPDATE ON private.supplier_import_items
FOR EACH ROW EXECUTE FUNCTION private.guard_import_item_approval_v1();

CREATE OR REPLACE FUNCTION private.guard_import_batch_terminal_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IN ('accepted','rejected','failed')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'terminal import batch status is immutable; resume through a new idempotent batch attempt';
  END IF;
  IF NEW.status IN ('accepted','rejected','failed') AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_import_batch_terminal_v1 ON private.supplier_import_batches;
CREATE TRIGGER trg_guard_import_batch_terminal_v1
BEFORE UPDATE ON private.supplier_import_batches
FOR EACH ROW EXECUTE FUNCTION private.guard_import_batch_terminal_v1();

CREATE OR REPLACE FUNCTION public.server_mutate_supplier_import_v1(
  p_actor_id uuid,
  p_action text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action text := lower(BTRIM(COALESCE(p_action, '')));
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_batch private.supplier_import_batches%ROWTYPE;
  v_item private.supplier_import_items%ROWTYPE;
  v_fact private.normalized_product_facts%ROWTYPE;
  v_supplier_id uuid;
  v_batch_id uuid;
  v_item_id uuid;
  v_product_id uuid;
  v_status text;
  v_source_class text;
  v_now timestamptz := now();
BEGIN
  IF NOT private.phase_f_actor_is_active_admin(p_actor_id) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN RAISE EXCEPTION 'payload must be an object'; END IF;

  IF v_action = 'create_import_batch' THEN
    v_supplier_id := NULLIF(v_payload->>'supplierId','')::uuid;
    IF NOT EXISTS (
      SELECT 1 FROM private.supplier_foundation_suppliers s
       WHERE s.id = v_supplier_id AND s.lifecycle_status = 'approved'
    ) THEN RAISE EXCEPTION 'approved supplier is required'; END IF;
    IF NULLIF(BTRIM(v_payload->>'providerKey'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'sourceRef'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'adapterVersion'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'idempotencyKey'),'') IS NULL THEN
      RAISE EXCEPTION 'providerKey, sourceRef, adapterVersion and idempotencyKey are required';
    END IF;

    INSERT INTO private.supplier_import_batches(
      supplier_id, provider_key, source_ref, source_observed_at, adapter_version,
      idempotency_key, resume_token, last_checkpoint, created_by
    ) VALUES (
      v_supplier_id, BTRIM(v_payload->>'providerKey'), BTRIM(v_payload->>'sourceRef'),
      COALESCE(NULLIF(v_payload->>'sourceObservedAt','')::timestamptz, v_now),
      BTRIM(v_payload->>'adapterVersion'), BTRIM(v_payload->>'idempotencyKey'),
      NULLIF(BTRIM(v_payload->>'resumeToken'),''), 'received', p_actor_id
    )
    ON CONFLICT (supplier_id, provider_key, idempotency_key)
    DO UPDATE SET resume_token = COALESCE(EXCLUDED.resume_token, private.supplier_import_batches.resume_token),
                  updated_at = v_now
    RETURNING * INTO v_batch;
    RETURN jsonb_build_object('ok', true, 'batchId', v_batch.id, 'status', v_batch.status, 'idempotent', true);
  END IF;

  IF v_action = 'record_import_item' THEN
    v_batch_id := NULLIF(v_payload->>'batchId','')::uuid;
    IF NULLIF(BTRIM(v_payload->>'itemIdempotencyKey'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'sourcePayloadRef'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'sourcePayloadHash'),'') IS NULL THEN
      RAISE EXCEPTION 'itemIdempotencyKey, sourcePayloadRef and sourcePayloadHash are required';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM private.supplier_import_batches b WHERE b.id = v_batch_id AND b.status NOT IN ('accepted','rejected','failed')) THEN
      RAISE EXCEPTION 'open import batch is required';
    END IF;

    INSERT INTO private.supplier_import_items(
      batch_id, supplier_catalog_item_id, canonical_product_id, source_payload_ref,
      source_payload_hash, source_observed_at, item_idempotency_key
    ) VALUES (
      v_batch_id, NULLIF(v_payload->>'supplierCatalogItemId','')::uuid,
      NULLIF(v_payload->>'canonicalProductId','')::uuid,
      BTRIM(v_payload->>'sourcePayloadRef'), BTRIM(v_payload->>'sourcePayloadHash'),
      COALESCE(NULLIF(v_payload->>'sourceObservedAt','')::timestamptz, v_now),
      BTRIM(v_payload->>'itemIdempotencyKey')
    )
    ON CONFLICT (batch_id, item_idempotency_key)
    DO UPDATE SET updated_at = v_now
    RETURNING * INTO v_item;
    RETURN jsonb_build_object('ok', true, 'importItemId', v_item.id, 'status', v_item.status, 'idempotent', true);
  END IF;

  IF v_action = 'record_normalized_fact' THEN
    v_item_id := NULLIF(v_payload->>'importItemId','')::uuid;
    v_product_id := NULLIF(v_payload->>'canonicalProductId','')::uuid;
    v_source_class := lower(BTRIM(COALESCE(v_payload->>'sourceClass','')));
    IF v_source_class NOT IN ('supplier_source','verified_external_source','admin_asserted','ai_proposed') THEN
      RAISE EXCEPTION 'invalid fact source class';
    END IF;
    IF NULLIF(BTRIM(v_payload->>'factKey'),'') IS NULL OR NOT (v_payload ? 'factValue') THEN
      RAISE EXCEPTION 'factKey and factValue are required';
    END IF;
    INSERT INTO private.normalized_product_facts(
      import_item_id, canonical_product_id, fact_key, fact_value, source_class,
      source_ref, source_evidence_hash, ai_model_ref, confidence, review_status
    ) VALUES (
      v_item_id, v_product_id, lower(BTRIM(v_payload->>'factKey')), v_payload->'factValue', v_source_class,
      NULLIF(BTRIM(v_payload->>'sourceRef'),''), NULLIF(BTRIM(v_payload->>'sourceEvidenceHash'),''),
      NULLIF(BTRIM(v_payload->>'aiModelRef'),''), NULLIF(v_payload->>'confidence','')::numeric,
      'pending'
    ) RETURNING * INTO v_fact;
    INSERT INTO private.supplier_import_review_audit(import_item_id, actor_id, action, evidence)
    VALUES (v_item_id, p_actor_id, v_action, v_payload);
    RETURN jsonb_build_object('ok', true, 'factId', v_fact.id, 'reviewStatus', v_fact.review_status);
  END IF;

  IF v_action = 'review_normalized_fact' THEN
    SELECT * INTO v_fact FROM private.normalized_product_facts
     WHERE id = NULLIF(v_payload->>'factId','')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'normalized fact not found'; END IF;
    v_status := lower(BTRIM(COALESCE(v_payload->>'status','')));
    IF v_status NOT IN ('verified','rejected','stale') THEN RAISE EXCEPTION 'invalid fact review status'; END IF;
    IF v_status = 'verified' AND v_fact.source_class = 'ai_proposed' THEN
      RAISE EXCEPTION 'AI FACTS LOCK: AI proposal cannot become a verified fact';
    END IF;
    IF v_status = 'verified' AND (
      NULLIF(BTRIM(v_payload->>'sourceRef'),'') IS NULL OR NULLIF(BTRIM(v_payload->>'sourceEvidenceHash'),'') IS NULL
    ) THEN RAISE EXCEPTION 'verified fact requires non-AI evidence source and hash'; END IF;

    UPDATE private.normalized_product_facts
       SET review_status = v_status,
           source_ref = CASE WHEN v_status = 'verified' THEN BTRIM(v_payload->>'sourceRef') ELSE source_ref END,
           source_evidence_hash = CASE WHEN v_status = 'verified' THEN BTRIM(v_payload->>'sourceEvidenceHash') ELSE source_evidence_hash END,
           review_reason = NULLIF(BTRIM(v_payload->>'reason'),''),
           reviewed_by = p_actor_id, reviewed_at = v_now, updated_at = v_now
     WHERE id = v_fact.id RETURNING * INTO v_fact;
    INSERT INTO private.supplier_import_review_audit(import_item_id, actor_id, action, evidence)
    VALUES (v_fact.import_item_id, p_actor_id, v_action, v_payload);
    RETURN jsonb_build_object('ok', true, 'factId', v_fact.id, 'reviewStatus', v_fact.review_status);
  END IF;

  IF v_action = 'record_asset_rights' THEN
    v_item_id := NULLIF(v_payload->>'importItemId','')::uuid;
    v_status := lower(BTRIM(COALESCE(v_payload->>'rightsStatus','unknown')));
    IF NULLIF(BTRIM(v_payload->>'assetRef'),'') IS NULL OR NULLIF(BTRIM(v_payload->>'sourceRef'),'') IS NULL THEN
      RAISE EXCEPTION 'assetRef and sourceRef are required';
    END IF;
    IF v_status NOT IN ('unknown','verified','restricted','prohibited') THEN RAISE EXCEPTION 'invalid rights status'; END IF;
    INSERT INTO private.supplier_import_asset_rights(
      import_item_id, asset_ref, asset_type, source_ref, rights_status, rights_basis, evidence_hash, reviewed_by, reviewed_at
    ) VALUES (
      v_item_id, BTRIM(v_payload->>'assetRef'), lower(BTRIM(v_payload->>'assetType')), BTRIM(v_payload->>'sourceRef'),
      v_status, NULLIF(BTRIM(v_payload->>'rightsBasis'),''), NULLIF(BTRIM(v_payload->>'evidenceHash'),''),
      CASE WHEN v_status IN ('verified','restricted','prohibited') THEN p_actor_id ELSE NULL END,
      CASE WHEN v_status IN ('verified','restricted','prohibited') THEN v_now ELSE NULL END
    )
    ON CONFLICT (import_item_id, asset_ref) DO UPDATE SET
      rights_status = EXCLUDED.rights_status, rights_basis = EXCLUDED.rights_basis,
      evidence_hash = EXCLUDED.evidence_hash, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at;
    INSERT INTO private.supplier_import_review_audit(import_item_id, actor_id, action, evidence)
    VALUES (v_item_id, p_actor_id, v_action, v_payload);
    RETURN jsonb_build_object('ok', true, 'importItemId', v_item_id, 'rightsStatus', v_status);
  END IF;

  IF v_action = 'record_compliance_review' THEN
    v_item_id := NULLIF(v_payload->>'importItemId','')::uuid;
    v_status := lower(BTRIM(COALESCE(v_payload->>'status','pending')));
    IF v_status NOT IN ('pending','approved','manual_review','prohibited','stale') THEN RAISE EXCEPTION 'invalid compliance status'; END IF;
    IF v_status = 'approved' AND (NOT (v_payload ? 'evidenceRefs') OR jsonb_array_length(v_payload->'evidenceRefs') = 0) THEN
      RAISE EXCEPTION 'approved compliance review requires evidence';
    END IF;
    INSERT INTO private.supplier_import_compliance_reviews(
      import_item_id, territory, review_class, status, evidence_refs, decision_reason,
      reviewed_by, reviewed_at, expires_at
    ) VALUES (
      v_item_id, upper(BTRIM(COALESCE(v_payload->>'territory','GB'))), lower(BTRIM(v_payload->>'reviewClass')),
      v_status, COALESCE(v_payload->'evidenceRefs','[]'::jsonb), NULLIF(BTRIM(v_payload->>'reason'),''),
      CASE WHEN v_status <> 'pending' THEN p_actor_id ELSE NULL END,
      CASE WHEN v_status <> 'pending' THEN v_now ELSE NULL END,
      NULLIF(v_payload->>'expiresAt','')::timestamptz
    )
    ON CONFLICT (import_item_id, territory, review_class) DO UPDATE SET
      status = EXCLUDED.status, evidence_refs = EXCLUDED.evidence_refs,
      decision_reason = EXCLUDED.decision_reason, reviewed_by = EXCLUDED.reviewed_by,
      reviewed_at = EXCLUDED.reviewed_at, expires_at = EXCLUDED.expires_at;
    INSERT INTO private.supplier_import_review_audit(import_item_id, actor_id, action, evidence)
    VALUES (v_item_id, p_actor_id, v_action, v_payload);
    RETURN jsonb_build_object('ok', true, 'importItemId', v_item_id, 'complianceStatus', v_status);
  END IF;

  IF v_action = 'set_import_item_status' THEN
    v_item_id := NULLIF(v_payload->>'importItemId','')::uuid;
    v_status := lower(BTRIM(COALESCE(v_payload->>'status','')));
    IF v_status NOT IN ('captured','normalised','review','approved','restricted','rejected') THEN
      RAISE EXCEPTION 'invalid import item status';
    END IF;
    UPDATE private.supplier_import_items
       SET status = v_status, review_reason = NULLIF(BTRIM(v_payload->>'reason'),''), updated_at = v_now
     WHERE id = v_item_id RETURNING * INTO v_item;
    IF NOT FOUND THEN RAISE EXCEPTION 'import item not found'; END IF;
    INSERT INTO private.supplier_import_review_audit(import_item_id, actor_id, action, evidence)
    VALUES (v_item_id, p_actor_id, v_action, v_payload);
    RETURN jsonb_build_object('ok', true, 'importItemId', v_item.id, 'status', v_item.status);
  END IF;

  RAISE EXCEPTION 'unsupported supplier import action';
END;
$$;

REVOKE ALL ON FUNCTION public.server_mutate_supplier_import_v1(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_mutate_supplier_import_v1(uuid, text, jsonb) TO service_role;

-- Strengthen readiness: compliance is required, not merely checked when present.
CREATE OR REPLACE FUNCTION public.server_supplier_import_decision_v1(
  p_supplier_catalog_item_id uuid,
  p_canonical_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item private.supplier_import_items%ROWTYPE;
  v_required text;
BEGIN
  SELECT * INTO v_item FROM private.supplier_import_items
   WHERE supplier_catalog_item_id = p_supplier_catalog_item_id
     AND canonical_product_id = p_canonical_product_id
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reason', 'import_item_not_found', 'interfaceVersion', 1); END IF;
  IF v_item.status <> 'approved' THEN RETURN jsonb_build_object('eligible', false, 'reason', 'import_item_not_approved', 'interfaceVersion', 1); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM private.normalized_product_facts f
     WHERE f.import_item_id = v_item.id AND f.review_status = 'verified' AND f.source_class <> 'ai_proposed'
  ) THEN RETURN jsonb_build_object('eligible', false, 'reason', 'verified_facts_missing', 'interfaceVersion', 1); END IF;

  IF EXISTS (
    SELECT 1 FROM private.normalized_product_facts f
     WHERE f.import_item_id = v_item.id AND f.review_status IN ('pending','stale')
  ) THEN RETURN jsonb_build_object('eligible', false, 'reason', 'fact_review_incomplete', 'interfaceVersion', 1); END IF;

  IF EXISTS (
    SELECT 1 FROM private.supplier_import_asset_rights r
     WHERE r.import_item_id = v_item.id AND r.rights_status <> 'verified'
  ) THEN RETURN jsonb_build_object('eligible', false, 'reason', 'asset_rights_not_clear', 'interfaceVersion', 1); END IF;

  FOREACH v_required IN ARRAY ARRAY[
    'product_safety','restricted_goods','claims','labelling','documentation','marketability'
  ]::text[] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM private.supplier_import_compliance_reviews c
       WHERE c.import_item_id = v_item.id AND c.territory = 'GB'
         AND c.review_class = v_required AND c.status = 'approved'
         AND (c.expires_at IS NULL OR c.expires_at > now())
    ) THEN RETURN jsonb_build_object('eligible', false, 'reason', 'import_compliance_incomplete', 'missingReviewClass', v_required, 'interfaceVersion', 1); END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'eligible', true, 'reason', 'supplier_import_ready',
    'supplierCatalogItemId', p_supplier_catalog_item_id,
    'canonicalProductId', p_canonical_product_id,
    'interfaceVersion', 1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_import_decision_v1(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_import_decision_v1(uuid, uuid) TO service_role;

-- No Supplier Commerce control is enabled by Phase F.
