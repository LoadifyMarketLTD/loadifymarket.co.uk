-- 622_supplier_import_normalisation.sql
-- Phase F — Import / Normalisation: AI Facts Lock, Rights, Compliance, Review.
-- Supplier Commerce remains fail-closed under Phase C controls.
-- Phase G commercial economics are intentionally deferred.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  source_ref text NOT NULL,
  source_observed_at timestamptz NOT NULL,
  adapter_version text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT supplier_import_batch_status_check CHECK (
    status IN ('received','normalising','review','accepted','rejected','failed')
  ),
  CONSTRAINT supplier_import_batch_source_check CHECK (
    NULLIF(BTRIM(provider_key), '') IS NOT NULL
    AND NULLIF(BTRIM(source_ref), '') IS NOT NULL
    AND NULLIF(BTRIM(adapter_version), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS supplier_import_batches_supplier_idx
  ON private.supplier_import_batches(supplier_id, created_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES private.supplier_import_batches(id) ON DELETE RESTRICT,
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  canonical_product_id uuid REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  source_payload_ref text NOT NULL,
  source_payload_hash text NOT NULL,
  source_observed_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'captured',
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_import_item_status_check CHECK (
    status IN ('captured','normalised','review','approved','restricted','rejected')
  ),
  CONSTRAINT supplier_import_item_source_check CHECK (
    NULLIF(BTRIM(source_payload_ref), '') IS NOT NULL
    AND NULLIF(BTRIM(source_payload_hash), '') IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_import_item_unique
  ON private.supplier_import_items(batch_id, supplier_catalog_item_id);
CREATE INDEX IF NOT EXISTS supplier_import_item_review_idx
  ON private.supplier_import_items(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS private.normalized_product_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id uuid NOT NULL REFERENCES private.supplier_import_items(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  fact_key text NOT NULL,
  fact_value jsonb NOT NULL,
  source_class text NOT NULL,
  source_ref text,
  source_evidence_hash text,
  ai_model_ref text,
  confidence numeric(6,5) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'pending',
  review_reason text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  fact_version integer NOT NULL DEFAULT 1 CHECK (fact_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT normalized_fact_key_check CHECK (
    fact_key = lower(BTRIM(fact_key)) AND fact_key ~ '^[a-z0-9][a-z0-9._-]{1,127}$'
  ),
  CONSTRAINT normalized_fact_source_class_check CHECK (
    source_class IN ('supplier_source','verified_external_source','admin_asserted','ai_proposed')
  ),
  CONSTRAINT normalized_fact_review_status_check CHECK (
    review_status IN ('pending','verified','rejected','stale')
  ),
  CONSTRAINT normalized_fact_verified_evidence_check CHECK (
    review_status <> 'verified'
    OR (
      reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND NULLIF(BTRIM(source_ref), '') IS NOT NULL
      AND NULLIF(BTRIM(source_evidence_hash), '') IS NOT NULL
      AND source_class <> 'ai_proposed'
    )
  ),
  CONSTRAINT normalized_fact_ai_lock_check CHECK (
    source_class <> 'ai_proposed'
    OR review_status <> 'verified'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS normalized_product_fact_unique
  ON private.normalized_product_facts(import_item_id, fact_key, fact_version);
CREATE INDEX IF NOT EXISTS normalized_product_fact_lookup_idx
  ON private.normalized_product_facts(canonical_product_id, fact_key, review_status);

CREATE TABLE IF NOT EXISTS private.supplier_import_asset_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id uuid NOT NULL REFERENCES private.supplier_import_items(id) ON DELETE RESTRICT,
  asset_ref text NOT NULL,
  asset_type text NOT NULL,
  source_ref text NOT NULL,
  rights_status text NOT NULL DEFAULT 'unknown',
  rights_basis text,
  evidence_hash text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_import_asset_type_check CHECK (
    asset_type IN ('image','video','document','copy','specification')
  ),
  CONSTRAINT supplier_import_asset_rights_status_check CHECK (
    rights_status IN ('unknown','verified','restricted','prohibited')
  ),
  CONSTRAINT supplier_import_asset_verified_check CHECK (
    rights_status <> 'verified'
    OR (
      NULLIF(BTRIM(rights_basis), '') IS NOT NULL
      AND NULLIF(BTRIM(evidence_hash), '') IS NOT NULL
      AND reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_import_asset_rights_unique
  ON private.supplier_import_asset_rights(import_item_id, asset_ref);

CREATE TABLE IF NOT EXISTS private.supplier_import_compliance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id uuid NOT NULL REFERENCES private.supplier_import_items(id) ON DELETE RESTRICT,
  territory text NOT NULL DEFAULT 'GB',
  review_class text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_reason text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_import_compliance_territory_check CHECK (
    territory = upper(BTRIM(territory)) AND territory ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT supplier_import_compliance_class_check CHECK (
    review_class IN ('product_safety','restricted_goods','claims','labelling','documentation','marketability')
  ),
  CONSTRAINT supplier_import_compliance_status_check CHECK (
    status IN ('pending','approved','manual_review','prohibited','stale')
  ),
  CONSTRAINT supplier_import_compliance_evidence_check CHECK (jsonb_typeof(evidence_refs) = 'array'),
  CONSTRAINT supplier_import_compliance_approved_check CHECK (
    status <> 'approved'
    OR (
      reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND jsonb_array_length(evidence_refs) > 0
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_import_compliance_unique
  ON private.supplier_import_compliance_reviews(import_item_id, territory, review_class);

CREATE TABLE IF NOT EXISTS private.supplier_import_review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id uuid NOT NULL REFERENCES private.supplier_import_items(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_import_review_audit_evidence_check CHECK (jsonb_typeof(evidence) = 'object')
);

REVOKE ALL ON TABLE private.supplier_import_batches FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_import_items FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.normalized_product_facts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_import_asset_rights FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_import_compliance_reviews FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_import_review_audit FROM PUBLIC, anon, authenticated, service_role;

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
BEGIN
  SELECT * INTO v_item
    FROM private.supplier_import_items
   WHERE supplier_catalog_item_id = p_supplier_catalog_item_id
     AND canonical_product_id = p_canonical_product_id
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'import_item_not_found', 'interfaceVersion', 1);
  END IF;

  IF v_item.status <> 'approved' THEN
    RETURN jsonb_build_object(
      'eligible', false, 'reason', 'import_item_not_approved',
      'supplierCatalogItemId', p_supplier_catalog_item_id,
      'canonicalProductId', p_canonical_product_id,
      'interfaceVersion', 1
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM private.normalized_product_facts f
     WHERE f.import_item_id = v_item.id
       AND f.source_class = 'ai_proposed'
       AND f.review_status = 'verified'
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'ai_fact_lock_violation', 'interfaceVersion', 1);
  END IF;

  IF EXISTS (
    SELECT 1 FROM private.normalized_product_facts f
     WHERE f.import_item_id = v_item.id
       AND f.review_status IN ('pending','stale')
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'fact_review_incomplete', 'interfaceVersion', 1);
  END IF;

  IF EXISTS (
    SELECT 1 FROM private.supplier_import_asset_rights r
     WHERE r.import_item_id = v_item.id
       AND r.rights_status IN ('unknown','restricted','prohibited')
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'asset_rights_not_clear', 'interfaceVersion', 1);
  END IF;

  IF EXISTS (
    SELECT 1 FROM private.supplier_import_compliance_reviews c
     WHERE c.import_item_id = v_item.id
       AND (
         c.status <> 'approved'
         OR (c.expires_at IS NOT NULL AND c.expires_at <= now())
       )
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'import_compliance_not_approved', 'interfaceVersion', 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM private.normalized_product_facts f
     WHERE f.import_item_id = v_item.id AND f.review_status = 'verified'
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'verified_facts_missing', 'interfaceVersion', 1);
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'supplier_import_ready',
    'supplierCatalogItemId', p_supplier_catalog_item_id,
    'canonicalProductId', p_canonical_product_id,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_import_decision_v1(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_import_decision_v1(uuid, uuid) TO service_role;

COMMENT ON TABLE private.normalized_product_facts IS
  'Phase F factual normalisation evidence. AI proposals are suggestions only and can never become verified facts without non-AI source evidence.';
COMMENT ON FUNCTION public.server_supplier_import_decision_v1(uuid, uuid) IS
  'Fail-closed Phase F import/normalisation readiness decision. Does not enable Supplier Commerce or Phase G economics.';
