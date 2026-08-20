-- 619_canonical_supplier_data.sql
-- Phase E — Canonical Supplier Data: Canonical Product, Supplier Offers,
-- Catalog Identity and Deduplication.
--
-- This migration deliberately does NOT implement import/normalisation, pricing,
-- stock, checkout or supplier ordering. Later canonical phases own those concerns.
-- Supplier Commerce remains fail-closed under the Phase C control plane.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.canonical_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_key text NOT NULL UNIQUE,
  working_label text NOT NULL,
  product_kind text NOT NULL DEFAULT 'physical_good',
  status text NOT NULL DEFAULT 'draft',
  identity_version integer NOT NULL DEFAULT 1 CHECK (identity_version > 0),
  identity_reason text NOT NULL DEFAULT 'Canonical identity created',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_products_catalog_key_check CHECK (
    catalog_key = lower(BTRIM(catalog_key))
    AND catalog_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'
  ),
  CONSTRAINT canonical_products_kind_check CHECK (
    product_kind IN ('physical_good','bundle','lot','service')
  ),
  CONSTRAINT canonical_products_status_check CHECK (
    status IN ('draft','review','active','restricted','retired')
  ),
  CONSTRAINT canonical_products_active_review_check CHECK (
    status <> 'active' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS canonical_products_status_idx
  ON private.canonical_products(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS private.canonical_product_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  identifier_type text NOT NULL,
  identifier_namespace text NOT NULL DEFAULT 'global',
  raw_value text NOT NULL,
  normalized_value text NOT NULL,
  verification_status text NOT NULL DEFAULT 'unverified',
  source_ref text,
  evidence_hash text,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_identifier_type_check CHECK (
    identifier_type IN ('gtin','ean','upc','isbn','mpn','brand_mpn','internal')
  ),
  CONSTRAINT canonical_identifier_namespace_check CHECK (
    NULLIF(BTRIM(identifier_namespace), '') IS NOT NULL
  ),
  CONSTRAINT canonical_identifier_value_check CHECK (
    NULLIF(BTRIM(raw_value), '') IS NOT NULL
    AND normalized_value = lower(BTRIM(normalized_value))
    AND NULLIF(BTRIM(normalized_value), '') IS NOT NULL
  ),
  CONSTRAINT canonical_identifier_namespace_semantics_check CHECK (
    (identifier_type IN ('gtin','ean','upc','isbn') AND identifier_namespace = 'global')
    OR (identifier_type IN ('mpn','brand_mpn','internal') AND identifier_namespace <> 'global')
  ),
  CONSTRAINT canonical_identifier_verification_check CHECK (
    verification_status IN ('unverified','verified','rejected','stale')
  ),
  CONSTRAINT canonical_identifier_verified_evidence_check CHECK (
    verification_status <> 'verified'
    OR (
      verified_by IS NOT NULL
      AND verified_at IS NOT NULL
      AND NULLIF(BTRIM(source_ref), '') IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_identifier_per_product_unique
  ON private.canonical_product_identifiers(
    canonical_product_id, identifier_type, identifier_namespace, normalized_value
  );
CREATE UNIQUE INDEX IF NOT EXISTS canonical_verified_identifier_global_unique
  ON private.canonical_product_identifiers(identifier_type, identifier_namespace, normalized_value)
  WHERE verification_status = 'verified';
CREATE INDEX IF NOT EXISTS canonical_identifier_lookup_idx
  ON private.canonical_product_identifiers(identifier_type, identifier_namespace, normalized_value, verification_status);

CREATE TABLE IF NOT EXISTS private.supplier_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  external_product_ref text NOT NULL,
  external_variant_ref text,
  source_ref text NOT NULL,
  source_observed_at timestamptz NOT NULL,
  raw_identity_hash text NOT NULL,
  raw_snapshot_ref text,
  status text NOT NULL DEFAULT 'captured',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_catalog_external_product_ref_check CHECK (NULLIF(BTRIM(external_product_ref), '') IS NOT NULL),
  CONSTRAINT supplier_catalog_source_ref_check CHECK (NULLIF(BTRIM(source_ref), '') IS NOT NULL),
  CONSTRAINT supplier_catalog_hash_check CHECK (NULLIF(BTRIM(raw_identity_hash), '') IS NOT NULL),
  CONSTRAINT supplier_catalog_status_check CHECK (
    status IN ('captured','identity_review','linked','restricted','retired')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_catalog_item_identity_unique
  ON private.supplier_catalog_items(
    supplier_id,
    external_product_ref,
    COALESCE(external_variant_ref, '')
  );
CREATE INDEX IF NOT EXISTS supplier_catalog_items_supplier_idx
  ON private.supplier_catalog_items(supplier_id, status, source_observed_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_catalog_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  identifier_type text NOT NULL,
  identifier_namespace text NOT NULL DEFAULT 'global',
  raw_value text NOT NULL,
  normalized_value text NOT NULL,
  evidence_source_ref text NOT NULL,
  observed_at timestamptz NOT NULL,
  verification_status text NOT NULL DEFAULT 'observed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_catalog_identifier_type_check CHECK (
    identifier_type IN ('gtin','ean','upc','isbn','mpn','brand_mpn','internal')
  ),
  CONSTRAINT supplier_catalog_identifier_value_check CHECK (
    NULLIF(BTRIM(raw_value), '') IS NOT NULL
    AND normalized_value = lower(BTRIM(normalized_value))
    AND NULLIF(BTRIM(normalized_value), '') IS NOT NULL
  ),
  CONSTRAINT supplier_catalog_identifier_namespace_semantics_check CHECK (
    (identifier_type IN ('gtin','ean','upc','isbn') AND identifier_namespace = 'global')
    OR (identifier_type IN ('mpn','brand_mpn','internal') AND identifier_namespace <> 'global')
  ),
  CONSTRAINT supplier_catalog_identifier_status_check CHECK (
    verification_status IN ('observed','verified','rejected','stale')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_catalog_identifier_unique
  ON private.supplier_catalog_identifiers(
    supplier_catalog_item_id, identifier_type, identifier_namespace, normalized_value
  );
CREATE INDEX IF NOT EXISTS supplier_catalog_identifier_lookup_idx
  ON private.supplier_catalog_identifiers(identifier_type, identifier_namespace, normalized_value, verification_status);

CREATE TABLE IF NOT EXISTS private.supplier_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_key text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  external_offer_ref text NOT NULL,
  territory text NOT NULL DEFAULT 'GB',
  status text NOT NULL DEFAULT 'candidate',
  identity_method text NOT NULL,
  identity_confidence numeric(6,5) CHECK (identity_confidence IS NULL OR identity_confidence BETWEEN 0 AND 1),
  identity_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  linked_at timestamptz,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_offer_key_check CHECK (
    offer_key = lower(BTRIM(offer_key))
    AND offer_key ~ '^[a-z0-9][a-z0-9._-]{2,159}$'
  ),
  CONSTRAINT supplier_offer_external_ref_check CHECK (NULLIF(BTRIM(external_offer_ref), '') IS NOT NULL),
  CONSTRAINT supplier_offer_territory_check CHECK (territory = upper(BTRIM(territory)) AND territory ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_offer_status_check CHECK (
    status IN ('candidate','review','approved','restricted','retired')
  ),
  CONSTRAINT supplier_offer_identity_method_check CHECK (
    identity_method IN ('verified_identifier','manual_review','dedup_resolution')
  ),
  CONSTRAINT supplier_offer_identity_evidence_check CHECK (jsonb_typeof(identity_evidence) = 'object'),
  CONSTRAINT supplier_offer_link_check CHECK (
    linked_by IS NOT NULL AND linked_at IS NOT NULL
  ),
  CONSTRAINT supplier_offer_approved_check CHECK (
    status <> 'approved'
    OR (
      approved_by IS NOT NULL
      AND approved_at IS NOT NULL
      AND jsonb_object_length(identity_evidence) > 0
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_offer_external_unique
  ON private.supplier_offers(supplier_id, territory, external_offer_ref);
CREATE INDEX IF NOT EXISTS supplier_offer_canonical_idx
  ON private.supplier_offers(canonical_product_id, status, territory);
CREATE INDEX IF NOT EXISTS supplier_offer_supplier_idx
  ON private.supplier_offers(supplier_id, status, territory);

CREATE TABLE IF NOT EXISTS private.catalog_dedup_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  candidate_canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  candidate_key text NOT NULL,
  score numeric(6,5) CHECK (score IS NULL OR score BETWEEN 0 AND 1),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision text NOT NULL DEFAULT 'pending',
  decision_reason text,
  resolution_version integer NOT NULL DEFAULT 1 CHECK (resolution_version > 0),
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_dedup_candidate_key_check CHECK (NULLIF(BTRIM(candidate_key), '') IS NOT NULL),
  CONSTRAINT catalog_dedup_evidence_check CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT catalog_dedup_decision_check CHECK (
    decision IN ('pending','same_product','different_product','manual_review')
  ),
  CONSTRAINT catalog_dedup_resolution_check CHECK (
    decision = 'pending'
    OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND NULLIF(BTRIM(decision_reason), '') IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_dedup_candidate_unique
  ON private.catalog_dedup_candidates(supplier_catalog_item_id, candidate_canonical_product_id);
CREATE INDEX IF NOT EXISTS catalog_dedup_pending_idx
  ON private.catalog_dedup_candidates(decision, score DESC, created_at)
  WHERE decision IN ('pending','manual_review');

CREATE TABLE IF NOT EXISTS private.catalog_identity_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_version integer,
  new_version integer,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_identity_audit_entity_check CHECK (
    entity_type IN ('canonical_product','canonical_identifier','supplier_catalog_item','supplier_offer','dedup_candidate')
  ),
  CONSTRAINT catalog_identity_audit_evidence_check CHECK (jsonb_typeof(evidence) = 'object')
);

CREATE INDEX IF NOT EXISTS catalog_identity_audit_entity_idx
  ON private.catalog_identity_audit(entity_type, entity_id, created_at DESC);

REVOKE ALL ON TABLE private.canonical_products FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.canonical_product_identifiers FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_catalog_items FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_catalog_identifiers FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_offers FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.catalog_dedup_candidates FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.catalog_identity_audit FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_catalog_decision_v1(
  p_canonical_product_id uuid,
  p_supplier_offer_id uuid,
  p_territory text DEFAULT 'GB'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_product private.canonical_products%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_foundation jsonb;
BEGIN
  SELECT * INTO v_product
    FROM private.canonical_products
   WHERE id = p_canonical_product_id;

  IF NOT FOUND OR v_product.status <> 'active' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'canonical_product_not_active', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_offer
    FROM private.supplier_offers
   WHERE id = p_supplier_offer_id
     AND canonical_product_id = p_canonical_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_offer_not_linked', 'interfaceVersion', 1);
  END IF;

  IF v_offer.status <> 'approved' THEN
    RETURN jsonb_build_object(
      'eligible', false, 'reason', 'supplier_offer_not_approved',
      'canonicalProductId', v_product.id, 'supplierOfferId', v_offer.id, 'interfaceVersion', 1
    );
  END IF;

  IF upper(BTRIM(COALESCE(p_territory, 'GB'))) <> v_offer.territory THEN
    RETURN jsonb_build_object(
      'eligible', false, 'reason', 'supplier_offer_territory_mismatch',
      'canonicalProductId', v_product.id, 'supplierOfferId', v_offer.id, 'interfaceVersion', 1
    );
  END IF;

  SELECT * INTO v_supplier
    FROM private.supplier_foundation_suppliers
   WHERE id = v_offer.supplier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_not_found', 'interfaceVersion', 1);
  END IF;

  v_foundation := public.server_supplier_foundation_decision_v1(v_supplier.supplier_key, v_offer.territory, 'catalog');
  IF COALESCE((v_foundation->>'eligible')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'eligible', false, 'reason', 'supplier_foundation_not_ready',
      'canonicalProductId', v_product.id, 'supplierOfferId', v_offer.id,
      'supplierId', v_supplier.id, 'supplierFoundation', v_foundation, 'interfaceVersion', 1
    );
  END IF;

  IF EXISTS (
    SELECT 1
      FROM private.catalog_dedup_candidates d
     WHERE d.supplier_catalog_item_id = v_offer.supplier_catalog_item_id
       AND d.decision IN ('pending','manual_review')
  ) THEN
    RETURN jsonb_build_object(
      'eligible', false, 'reason', 'catalog_identity_unresolved',
      'canonicalProductId', v_product.id, 'supplierOfferId', v_offer.id,
      'supplierId', v_supplier.id, 'interfaceVersion', 1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'supplier_catalog_ready',
    'canonicalProductId', v_product.id,
    'supplierOfferId', v_offer.id,
    'supplierId', v_supplier.id,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_catalog_decision_v1(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_catalog_decision_v1(uuid, uuid, text) TO service_role;

COMMENT ON TABLE private.canonical_products IS
  'Phase E internal canonical product identity. It is not customer-facing product copy and does not authorize trading.';
COMMENT ON TABLE private.supplier_offers IS
  'Provider-neutral link between one supplier catalog identity and one canonical product. Price/stock are intentionally deferred to later phases.';
COMMENT ON FUNCTION public.server_supplier_catalog_decision_v1(uuid, uuid, text) IS
  'Fail-closed Phase E identity/readiness decision. Phase C controls and later commerce gates remain authoritative.';
