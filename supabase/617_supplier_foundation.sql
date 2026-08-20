-- 617_supplier_foundation.sql
--
-- Phase D — Supplier Foundation.
-- Canonical scope: Adapter, Qualification, SLA, Compliance, Provenance.
-- Gate B and Phase C are already PASS. This migration does not enable Supplier
-- Commerce. All runtime commerce operations remain controlled by the Phase C
-- fail-closed control plane.

CREATE SCHEMA IF NOT EXISTS private;

-- ---------------------------------------------------------------------------
-- Supplier identity + lifecycle
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_foundation_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  legal_name text,
  business_country text,
  origin_country text,
  warehouse_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  lifecycle_status text NOT NULL DEFAULT 'candidate',
  lifecycle_reason text NOT NULL DEFAULT 'Initial candidate record',
  lifecycle_version integer NOT NULL DEFAULT 1 CHECK (lifecycle_version > 0),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_foundation_supplier_key_check
    CHECK (supplier_key = lower(BTRIM(supplier_key)) AND supplier_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'),
  CONSTRAINT supplier_foundation_warehouse_refs_check
    CHECK (jsonb_typeof(warehouse_refs) = 'array'),
  CONSTRAINT supplier_foundation_lifecycle_check
    CHECK (lifecycle_status IN ('candidate','verification','approved','restricted','suspended','banned')),
  CONSTRAINT supplier_foundation_approved_check
    CHECK (
      (lifecycle_status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
      OR lifecycle_status <> 'approved'
    )
);

CREATE INDEX IF NOT EXISTS supplier_foundation_lifecycle_idx
  ON private.supplier_foundation_suppliers(lifecycle_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_foundation_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  previous_status text,
  new_status text NOT NULL,
  previous_version integer,
  new_version integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_foundation_lifecycle_audit_idx
  ON private.supplier_foundation_lifecycle_audit(supplier_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Qualification evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_qualification_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  evidence_type text NOT NULL,
  status text NOT NULL DEFAULT 'unverified',
  source_ref text,
  evidence_summary text,
  evidence_hash text,
  verified_at timestamptz,
  expires_at timestamptz,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_qualification_type_check CHECK (evidence_type IN (
    'identity','business_identity','warehouse_origin','uk_shipping','api_feed_capability',
    'sku_quality','variants','stock_reliability','price_reliability','tracking','returns',
    'documentation','compliance','content_rights','costs','performance'
  )),
  CONSTRAINT supplier_qualification_status_check
    CHECK (status IN ('unverified','verified','rejected','stale','not_applicable')),
  CONSTRAINT supplier_qualification_verified_check
    CHECK (
      status <> 'verified'
      OR (verified_at IS NOT NULL AND verified_by IS NOT NULL AND NULLIF(BTRIM(source_ref), '') IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_qualification_evidence_unique
  ON private.supplier_qualification_evidence(supplier_id, evidence_type);
CREATE INDEX IF NOT EXISTS supplier_qualification_evidence_status_idx
  ON private.supplier_qualification_evidence(supplier_id, status, expires_at);

-- ---------------------------------------------------------------------------
-- Versioned / effective-dated SLA
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_sla_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft',
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  acknowledgement_minutes integer CHECK (acknowledgement_minutes IS NULL OR acknowledgement_minutes > 0),
  dispatch_hours integer CHECK (dispatch_hours IS NULL OR dispatch_hours > 0),
  stock_freshness_minutes integer CHECK (stock_freshness_minutes IS NULL OR stock_freshness_minutes > 0),
  price_freshness_minutes integer CHECK (price_freshness_minutes IS NULL OR price_freshness_minutes > 0),
  tracking_deadline_hours integer CHECK (tracking_deadline_hours IS NULL OR tracking_deadline_hours > 0),
  return_window_days integer CHECK (return_window_days IS NULL OR return_window_days >= 0),
  refund_response_hours integer CHECK (refund_response_hours IS NULL OR refund_response_hours > 0),
  reimbursement_deadline_days integer CHECK (reimbursement_deadline_days IS NULL OR reimbursement_deadline_days > 0),
  defect_tolerance_pct numeric(6,3) CHECK (defect_tolerance_pct IS NULL OR defect_tolerance_pct BETWEEN 0 AND 100),
  stock_accuracy_target_pct numeric(6,3) CHECK (stock_accuracy_target_pct IS NULL OR stock_accuracy_target_pct BETWEEN 0 AND 100),
  cancellation_threshold_pct numeric(6,3) CHECK (cancellation_threshold_pct IS NULL OR cancellation_threshold_pct BETWEEN 0 AND 100),
  escalation_terms text,
  suspension_threshold text,
  kill_switch_threshold text,
  commercial_terms_ref text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT supplier_sla_status_check CHECK (status IN ('draft','active','superseded','terminated')),
  CONSTRAINT supplier_sla_dates_check CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT supplier_sla_active_approval_check
    CHECK (status <> 'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_sla_version_unique
  ON private.supplier_sla_versions(supplier_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_sla_one_active_unique
  ON private.supplier_sla_versions(supplier_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS supplier_sla_effective_idx
  ON private.supplier_sla_versions(supplier_id, effective_from DESC);

-- ---------------------------------------------------------------------------
-- Supplier-level compliance classification
-- Product-level compliance remains a later import/product concern.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_compliance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  territory text NOT NULL,
  risk_class text NOT NULL DEFAULT 'amber',
  status text NOT NULL DEFAULT 'unreviewed',
  evidence_summary text,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_compliance_risk_check CHECK (risk_class IN ('green','amber','red')),
  CONSTRAINT supplier_compliance_status_check CHECK (status IN ('unreviewed','approved','manual_review','prohibited','stale')),
  CONSTRAINT supplier_compliance_sources_check CHECK (jsonb_typeof(source_refs) = 'array'),
  CONSTRAINT supplier_compliance_approved_check CHECK (
    status <> 'approved'
    OR (risk_class <> 'red' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND jsonb_array_length(source_refs) > 0)
  ),
  CONSTRAINT supplier_compliance_prohibited_check CHECK (risk_class <> 'red' OR status IN ('prohibited','manual_review','stale'))
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_compliance_profile_unique
  ON private.supplier_compliance_profiles(supplier_id, territory);

-- ---------------------------------------------------------------------------
-- Provenance / rights evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_provenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  external_ref text NOT NULL,
  source_ref text NOT NULL,
  original_reference text,
  imported_at timestamptz,
  rights_status text NOT NULL DEFAULT 'unknown',
  transformation_status text NOT NULL DEFAULT 'original',
  review_status text NOT NULL DEFAULT 'unreviewed',
  evidence_hash text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_provenance_entity_check CHECK (entity_type IN ('supplier','catalog','product','variant','asset','document')),
  CONSTRAINT supplier_provenance_rights_check CHECK (rights_status IN ('unknown','verified','restricted','prohibited')),
  CONSTRAINT supplier_provenance_transform_check CHECK (transformation_status IN ('original','normalized','transformed')),
  CONSTRAINT supplier_provenance_review_check CHECK (review_status IN ('unreviewed','approved','manual_review','rejected')),
  CONSTRAINT supplier_provenance_approved_check CHECK (
    review_status <> 'approved'
    OR (rights_status = 'verified' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_provenance_unique
  ON private.supplier_provenance_records(supplier_id, entity_type, external_ref, source_ref);

-- ---------------------------------------------------------------------------
-- Provider-neutral adapter registration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_adapter_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  adapter_key text NOT NULL,
  interface_version integer NOT NULL DEFAULT 1 CHECK (interface_version > 0),
  adapter_version text NOT NULL,
  status text NOT NULL DEFAULT 'disabled',
  capabilities text[] NOT NULL DEFAULT '{}',
  config_ref text,
  deprecation_at timestamptz,
  removal_after timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_adapter_status_check CHECK (status IN ('disabled','verification','active','deprecated','blocked')),
  CONSTRAINT supplier_adapter_capabilities_check CHECK (
    capabilities <@ ARRAY['supplier_identity','catalog','variants','stock','price','shipping','order_submission','acknowledgement','tracking','cancellation','returns','reimbursement']::text[]
  ),
  CONSTRAINT supplier_adapter_active_check CHECK (
    status <> 'active'
    OR (verified_at IS NOT NULL AND verified_by IS NOT NULL AND NULLIF(BTRIM(config_ref), '') IS NOT NULL)
  ),
  CONSTRAINT supplier_adapter_deprecation_check CHECK (
    deprecation_at IS NULL OR removal_after IS NULL OR removal_after > deprecation_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_adapter_registration_unique
  ON private.supplier_adapter_registrations(provider_key, adapter_key, interface_version, adapter_version, COALESCE(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS supplier_adapter_active_idx
  ON private.supplier_adapter_registrations(status, provider_key, supplier_id);

-- ---------------------------------------------------------------------------
-- Access boundary
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE private.supplier_foundation_suppliers FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_foundation_lifecycle_audit FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_qualification_evidence FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_sla_versions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_compliance_profiles FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_provenance_records FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_adapter_registrations FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Qualification/readiness decision — server-only, fail-closed.
-- This decision does not enable commerce and never bypasses Phase C controls.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.server_supplier_foundation_decision_v1(
  p_supplier_key text,
  p_territory text DEFAULT 'GB',
  p_required_capability text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_missing text[] := '{}';
  v_required text;
  v_sla private.supplier_sla_versions%ROWTYPE;
  v_compliance private.supplier_compliance_profiles%ROWTYPE;
  v_adapter_count integer := 0;
BEGIN
  SELECT * INTO v_supplier
    FROM private.supplier_foundation_suppliers
   WHERE supplier_key = lower(BTRIM(COALESCE(p_supplier_key, '')))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_not_found', 'interfaceVersion', 1);
  END IF;

  IF v_supplier.lifecycle_status <> 'approved' THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'supplier_not_approved',
      'supplierId', v_supplier.id,
      'lifecycleStatus', v_supplier.lifecycle_status,
      'interfaceVersion', 1
    );
  END IF;

  FOREACH v_required IN ARRAY ARRAY[
    'identity','business_identity','warehouse_origin','uk_shipping','api_feed_capability',
    'stock_reliability','price_reliability','tracking','returns','documentation','compliance','content_rights'
  ]::text[]
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM private.supplier_qualification_evidence q
       WHERE q.supplier_id = v_supplier.id
         AND q.evidence_type = v_required
         AND q.status = 'verified'
         AND (q.expires_at IS NULL OR q.expires_at > now())
    ) THEN
      v_missing := array_append(v_missing, v_required);
    END IF;
  END LOOP;

  IF cardinality(v_missing) > 0 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'qualification_incomplete',
      'supplierId', v_supplier.id,
      'missingEvidence', to_jsonb(v_missing),
      'interfaceVersion', 1
    );
  END IF;

  SELECT * INTO v_sla
    FROM private.supplier_sla_versions s
   WHERE s.supplier_id = v_supplier.id
     AND s.status = 'active'
     AND s.effective_from <= now()
     AND (s.effective_to IS NULL OR s.effective_to > now())
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'active_sla_missing', 'supplierId', v_supplier.id, 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_compliance
    FROM private.supplier_compliance_profiles c
   WHERE c.supplier_id = v_supplier.id
     AND upper(c.territory) = upper(BTRIM(COALESCE(p_territory, 'GB')))
   LIMIT 1;

  IF NOT FOUND OR v_compliance.status <> 'approved' OR v_compliance.risk_class = 'red'
     OR (v_compliance.expires_at IS NOT NULL AND v_compliance.expires_at <= now()) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'compliance_not_approved', 'supplierId', v_supplier.id, 'interfaceVersion', 1);
  END IF;

  IF NULLIF(BTRIM(p_required_capability), '') IS NOT NULL THEN
    SELECT count(*) INTO v_adapter_count
      FROM private.supplier_adapter_registrations a
     WHERE a.status = 'active'
       AND (a.supplier_id IS NULL OR a.supplier_id = v_supplier.id)
       AND lower(BTRIM(p_required_capability)) = ANY(a.capabilities);

    IF v_adapter_count = 0 THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'adapter_capability_missing', 'supplierId', v_supplier.id, 'interfaceVersion', 1);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'supplier_foundation_ready',
    'supplierId', v_supplier.id,
    'supplierKey', v_supplier.supplier_key,
    'slaVersion', v_sla.version,
    'complianceVersion', v_compliance.version,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_foundation_decision_v1(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_foundation_decision_v1(text, text, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Canonical admin mutation boundary.
-- One reviewed RPC accepts a typed action envelope and audits lifecycle changes.
-- No provider secrets or raw arbitrary payloads are accepted.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.server_admin_supplier_foundation_v1(
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
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_supplier_id uuid;
  v_reason text;
  v_previous text;
  v_next text;
  v_next_version integer;
  v_sla_version integer;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = p_actor_id AND u.role = 'admin' AND u."isActive" = true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload must be an object' USING ERRCODE = '22023';
  END IF;

  IF v_action = 'upsert_supplier' THEN
    IF NULLIF(BTRIM(v_payload ->> 'supplierKey'), '') IS NULL
       OR NULLIF(BTRIM(v_payload ->> 'displayName'), '') IS NULL THEN
      RAISE EXCEPTION 'supplierKey and displayName are required' USING ERRCODE = '22023';
    END IF;

    INSERT INTO private.supplier_foundation_suppliers(
      supplier_key, display_name, legal_name, business_country, origin_country, warehouse_refs, created_by
    ) VALUES (
      lower(BTRIM(v_payload ->> 'supplierKey')),
      BTRIM(v_payload ->> 'displayName'),
      NULLIF(BTRIM(v_payload ->> 'legalName'), ''),
      NULLIF(upper(BTRIM(v_payload ->> 'businessCountry')), ''),
      NULLIF(upper(BTRIM(v_payload ->> 'originCountry')), ''),
      COALESCE(v_payload -> 'warehouseRefs', '[]'::jsonb),
      p_actor_id
    )
    ON CONFLICT (supplier_key) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      legal_name = EXCLUDED.legal_name,
      business_country = EXCLUDED.business_country,
      origin_country = EXCLUDED.origin_country,
      warehouse_refs = EXCLUDED.warehouse_refs,
      updated_at = now()
    RETURNING * INTO v_supplier;

    RETURN jsonb_build_object('ok', true, 'supplierId', v_supplier.id, 'supplierKey', v_supplier.supplier_key, 'interfaceVersion', 1);
  END IF;

  v_supplier_id := NULLIF(v_payload ->> 'supplierId', '')::uuid;
  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'supplierId is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id = v_supplier_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_action = 'set_lifecycle' THEN
    v_previous := v_supplier.lifecycle_status;
    v_next := lower(BTRIM(COALESCE(v_payload ->> 'status', '')));
    v_reason := NULLIF(BTRIM(v_payload ->> 'reason'), '');
    IF v_reason IS NULL THEN
      RAISE EXCEPTION 'lifecycle reason is required' USING ERRCODE = '22023';
    END IF;
    IF v_next NOT IN ('candidate','verification','approved','restricted','suspended','banned') THEN
      RAISE EXCEPTION 'invalid supplier lifecycle status' USING ERRCODE = '22023';
    END IF;
    IF NOT (
      (v_previous = 'candidate' AND v_next IN ('verification','banned')) OR
      (v_previous = 'verification' AND v_next IN ('approved','restricted','suspended','banned')) OR
      (v_previous = 'approved' AND v_next IN ('restricted','suspended','banned')) OR
      (v_previous = 'restricted' AND v_next IN ('verification','approved','suspended','banned')) OR
      (v_previous = 'suspended' AND v_next IN ('verification','restricted','approved','banned')) OR
      (v_previous = v_next)
    ) THEN
      RAISE EXCEPTION 'invalid supplier lifecycle transition' USING ERRCODE = '23514';
    END IF;

    IF v_next = 'approved' THEN
      IF EXISTS (
        SELECT 1 FROM unnest(ARRAY[
          'identity','business_identity','warehouse_origin','uk_shipping','api_feed_capability',
          'stock_reliability','price_reliability','tracking','returns','documentation','compliance','content_rights'
        ]::text[]) required(evidence_type)
        WHERE NOT EXISTS (
          SELECT 1 FROM private.supplier_qualification_evidence q
           WHERE q.supplier_id = v_supplier.id
             AND q.evidence_type = required.evidence_type
             AND q.status = 'verified'
             AND (q.expires_at IS NULL OR q.expires_at > now())
        )
      ) THEN
        RAISE EXCEPTION 'supplier qualification is incomplete' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM private.supplier_sla_versions s
         WHERE s.supplier_id = v_supplier.id AND s.status = 'active'
           AND s.effective_from <= now() AND (s.effective_to IS NULL OR s.effective_to > now())
      ) THEN
        RAISE EXCEPTION 'active supplier SLA is required for approval' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM private.supplier_compliance_profiles c
         WHERE c.supplier_id = v_supplier.id AND c.status = 'approved' AND c.risk_class <> 'red'
           AND (c.expires_at IS NULL OR c.expires_at > now())
      ) THEN
        RAISE EXCEPTION 'approved supplier compliance profile is required' USING ERRCODE = '23514';
      END IF;
    END IF;

    v_next_version := v_supplier.lifecycle_version + CASE WHEN v_previous = v_next THEN 0 ELSE 1 END;
    UPDATE private.supplier_foundation_suppliers
       SET lifecycle_status = v_next,
           lifecycle_reason = v_reason,
           lifecycle_version = v_next_version,
           approved_at = CASE WHEN v_next = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
           approved_by = CASE WHEN v_next = 'approved' THEN p_actor_id ELSE approved_by END,
           updated_at = now()
     WHERE id = v_supplier.id;

    INSERT INTO private.supplier_foundation_lifecycle_audit(
      supplier_id, actor_id, previous_status, new_status, previous_version, new_version, reason
    ) VALUES (v_supplier.id, p_actor_id, v_previous, v_next, v_supplier.lifecycle_version, v_next_version, v_reason);

    RETURN jsonb_build_object('ok', true, 'supplierId', v_supplier.id, 'status', v_next, 'lifecycleVersion', v_next_version, 'interfaceVersion', 1);
  END IF;

  IF v_action = 'set_qualification' THEN
    INSERT INTO private.supplier_qualification_evidence(
      supplier_id, evidence_type, status, source_ref, evidence_summary, evidence_hash,
      verified_at, expires_at, verified_by, version
    ) VALUES (
      v_supplier.id,
      lower(BTRIM(v_payload ->> 'evidenceType')),
      lower(BTRIM(v_payload ->> 'status')),
      NULLIF(BTRIM(v_payload ->> 'sourceRef'), ''),
      NULLIF(BTRIM(v_payload ->> 'evidenceSummary'), ''),
      NULLIF(BTRIM(v_payload ->> 'evidenceHash'), ''),
      CASE WHEN lower(BTRIM(v_payload ->> 'status')) = 'verified' THEN now() ELSE NULL END,
      NULLIF(v_payload ->> 'expiresAt', '')::timestamptz,
      CASE WHEN lower(BTRIM(v_payload ->> 'status')) = 'verified' THEN p_actor_id ELSE NULL END,
      1
    )
    ON CONFLICT (supplier_id, evidence_type) DO UPDATE SET
      status = EXCLUDED.status,
      source_ref = EXCLUDED.source_ref,
      evidence_summary = EXCLUDED.evidence_summary,
      evidence_hash = EXCLUDED.evidence_hash,
      verified_at = EXCLUDED.verified_at,
      expires_at = EXCLUDED.expires_at,
      verified_by = EXCLUDED.verified_by,
      version = private.supplier_qualification_evidence.version + 1,
      updated_at = now();

    RETURN jsonb_build_object('ok', true, 'supplierId', v_supplier.id, 'interfaceVersion', 1);
  END IF;

  IF v_action = 'activate_sla' THEN
    v_sla_version := COALESCE((v_payload ->> 'version')::integer, 1);
    UPDATE private.supplier_sla_versions
       SET status = 'superseded', effective_to = COALESCE(effective_to, now())
     WHERE supplier_id = v_supplier.id AND status = 'active';

    INSERT INTO private.supplier_sla_versions(
      supplier_id, version, status, effective_from, effective_to,
      acknowledgement_minutes, dispatch_hours, stock_freshness_minutes, price_freshness_minutes,
      tracking_deadline_hours, return_window_days, refund_response_hours, reimbursement_deadline_days,
      defect_tolerance_pct, stock_accuracy_target_pct, cancellation_threshold_pct,
      escalation_terms, suspension_threshold, kill_switch_threshold, commercial_terms_ref,
      created_by, approved_by, approved_at
    ) VALUES (
      v_supplier.id, v_sla_version, 'active',
      COALESCE(NULLIF(v_payload ->> 'effectiveFrom', '')::timestamptz, now()),
      NULLIF(v_payload ->> 'effectiveTo', '')::timestamptz,
      NULLIF(v_payload ->> 'acknowledgementMinutes', '')::integer,
      NULLIF(v_payload ->> 'dispatchHours', '')::integer,
      NULLIF(v_payload ->> 'stockFreshnessMinutes', '')::integer,
      NULLIF(v_payload ->> 'priceFreshnessMinutes', '')::integer,
      NULLIF(v_payload ->> 'trackingDeadlineHours', '')::integer,
      NULLIF(v_payload ->> 'returnWindowDays', '')::integer,
      NULLIF(v_payload ->> 'refundResponseHours', '')::integer,
      NULLIF(v_payload ->> 'reimbursementDeadlineDays', '')::integer,
      NULLIF(v_payload ->> 'defectTolerancePct', '')::numeric,
      NULLIF(v_payload ->> 'stockAccuracyTargetPct', '')::numeric,
      NULLIF(v_payload ->> 'cancellationThresholdPct', '')::numeric,
      NULLIF(BTRIM(v_payload ->> 'escalationTerms'), ''),
      NULLIF(BTRIM(v_payload ->> 'suspensionThreshold'), ''),
      NULLIF(BTRIM(v_payload ->> 'killSwitchThreshold'), ''),
      NULLIF(BTRIM(v_payload ->> 'commercialTermsRef'), ''),
      p_actor_id, p_actor_id, now()
    );

    RETURN jsonb_build_object('ok', true, 'supplierId', v_supplier.id, 'slaVersion', v_sla_version, 'interfaceVersion', 1);
  END IF;

  IF v_action = 'set_compliance' THEN
    INSERT INTO private.supplier_compliance_profiles(
      supplier_id, territory, risk_class, status, evidence_summary, source_refs,
      reviewed_at, reviewed_by, expires_at, version
    ) VALUES (
      v_supplier.id,
      upper(BTRIM(COALESCE(v_payload ->> 'territory', 'GB'))),
      lower(BTRIM(COALESCE(v_payload ->> 'riskClass', 'amber'))),
      lower(BTRIM(COALESCE(v_payload ->> 'status', 'unreviewed'))),
      NULLIF(BTRIM(v_payload ->> 'evidenceSummary'), ''),
      COALESCE(v_payload -> 'sourceRefs', '[]'::jsonb),
      CASE WHEN lower(BTRIM(v_payload ->> 'status')) IN ('approved','manual_review','prohibited') THEN now() ELSE NULL END,
      CASE WHEN lower(BTRIM(v_payload ->> 'status')) IN ('approved','manual_review','prohibited') THEN p_actor_id ELSE NULL END,
      NULLIF(v_payload ->> 'expiresAt', '')::timestamptz,
      1
    )
    ON CONFLICT (supplier_id, territory) DO UPDATE SET
      risk_class = EXCLUDED.risk_class,
      status = EXCLUDED.status,
      evidence_summary = EXCLUDED.evidence_summary,
      source_refs = EXCLUDED.source_refs,
      reviewed_at = EXCLUDED.reviewed_at,
      reviewed_by = EXCLUDED.reviewed_by,
      expires_at = EXCLUDED.expires_at,
      version = private.supplier_compliance_profiles.version + 1,
      updated_at = now();

    RETURN jsonb_build_object('ok', true, 'supplierId', v_supplier.id, 'interfaceVersion', 1);
  END IF;

  IF v_action = 'record_provenance' THEN
    INSERT INTO private.supplier_provenance_records(
      supplier_id, entity_type, external_ref, source_ref, original_reference, imported_at,
      rights_status, transformation_status, review_status, evidence_hash, reviewed_at, reviewed_by
    ) VALUES (
      v_supplier.id,
      lower(BTRIM(v_payload ->> 'entityType')),
      BTRIM(v_payload ->> 'externalRef'),
      BTRIM(v_payload ->> 'sourceRef'),
      NULLIF(BTRIM(v_payload ->> 'originalReference'), ''),
      NULLIF(v_payload ->> 'importedAt', '')::timestamptz,
      lower(BTRIM(COALESCE(v_payload ->> 'rightsStatus', 'unknown'))),
      lower(BTRIM(COALESCE(v_payload ->> 'transformationStatus', 'original'))),
      lower(BTRIM(COALESCE(v_payload ->> 'reviewStatus', 'unreviewed'))),
      NULLIF(BTRIM(v_payload ->> 'evidenceHash'), ''),
      CASE WHEN lower(BTRIM(v_payload ->> 'reviewStatus')) IN ('approved','manual_review','rejected') THEN now() ELSE NULL END,
      CASE WHEN lower(BTRIM(v_payload ->> 'reviewStatus')) IN ('approved','manual_review','rejected') THEN p_actor_id ELSE NULL END
    )
    ON CONFLICT (supplier_id, entity_type, external_ref, source_ref) DO UPDATE SET
      original_reference = EXCLUDED.original_reference,
      imported_at = EXCLUDED.imported_at,
      rights_status = EXCLUDED.rights_status,
      transformation_status = EXCLUDED.transformation_status,
      review_status = EXCLUDED.review_status,
      evidence_hash = EXCLUDED.evidence_hash,
      reviewed_at = EXCLUDED.reviewed_at,
      reviewed_by = EXCLUDED.reviewed_by,
      updated_at = now();

    RETURN jsonb_build_object('ok', true, 'supplierId', v_supplier.id, 'interfaceVersion', 1);
  END IF;

  IF v_action = 'register_adapter' THEN
    INSERT INTO private.supplier_adapter_registrations(
      supplier_id, provider_key, adapter_key, interface_version, adapter_version,
      status, capabilities, config_ref, deprecation_at, removal_after, verified_at, verified_by
    ) VALUES (
      CASE WHEN COALESCE((v_payload ->> 'globalAdapter')::boolean, false) THEN NULL ELSE v_supplier.id END,
      lower(BTRIM(v_payload ->> 'providerKey')),
      lower(BTRIM(v_payload ->> 'adapterKey')),
      COALESCE((v_payload ->> 'interfaceVersion')::integer, 1),
      BTRIM(v_payload ->> 'adapterVersion'),
      lower(BTRIM(COALESCE(v_payload ->> 'status', 'disabled'))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_payload -> 'capabilities', '[]'::jsonb))),
      NULLIF(BTRIM(v_payload ->> 'configRef'), ''),
      NULLIF(v_payload ->> 'deprecationAt', '')::timestamptz,
      NULLIF(v_payload ->> 'removalAfter', '')::timestamptz,
      CASE WHEN lower(BTRIM(v_payload ->> 'status')) = 'active' THEN now() ELSE NULL END,
      CASE WHEN lower(BTRIM(v_payload ->> 'status')) = 'active' THEN p_actor_id ELSE NULL END
    )
    ON CONFLICT (provider_key, adapter_key, interface_version, adapter_version, COALESCE(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      status = EXCLUDED.status,
      capabilities = EXCLUDED.capabilities,
      config_ref = EXCLUDED.config_ref,
      deprecation_at = EXCLUDED.deprecation_at,
      removal_after = EXCLUDED.removal_after,
      verified_at = EXCLUDED.verified_at,
      verified_by = EXCLUDED.verified_by,
      updated_at = now();

    RETURN jsonb_build_object('ok', true, 'supplierId', v_supplier.id, 'interfaceVersion', 1);
  END IF;

  RAISE EXCEPTION 'unknown supplier foundation action' USING ERRCODE = '22023';
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_foundation_v1(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_foundation_v1(uuid, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_foundation_decision_v1(text, text, text) IS
  'Phase D supplier qualification/SLA/compliance/adapter readiness decision. Does not enable commerce; Phase C controls still govern runtime operations.';
COMMENT ON FUNCTION public.server_admin_supplier_foundation_v1(uuid, text, jsonb) IS
  'Phase D active-admin mutation boundary for supplier lifecycle, qualification, SLA, compliance, provenance and provider-neutral adapters.';
