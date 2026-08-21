-- 616_supplier_commerce_platform_control_foundations.sql
--
-- Phase C1 — Platform Control Foundations.
-- Gate B is PASS. This migration introduces the server-enforced control plane,
-- operational evidence, incident/recovery framework, provider capability
-- evidence register and retention registry required before Supplier Commerce
-- provider/runtime slices are allowed to become active.
--
-- Safety defaults are intentionally OFF / fail-closed. No Supplier Commerce
-- operation becomes enabled merely because this migration exists.

CREATE SCHEMA IF NOT EXISTS private;

-- ---------------------------------------------------------------------------
-- Control plane
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_commerce_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  scope_type text NOT NULL,
  scope_ref text,
  scope_ref_key text GENERATED ALWAYS AS (COALESCE(scope_ref, '')) STORED,
  enabled boolean NOT NULL DEFAULT false,
  reason text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_commerce_controls_operation_check
    CHECK (operation IN ('*', 'import', 'publish', 'checkout', 'reservation', 'supplier_order', 'tracking_ingest', 'return_recovery')),
  CONSTRAINT supplier_commerce_controls_scope_type_check
    CHECK (scope_type IN ('global', 'provider', 'supplier', 'offer', 'product', 'category', 'territory', 'cohort')),
  CONSTRAINT supplier_commerce_controls_scope_ref_check
    CHECK (
      (scope_type = 'global' AND scope_ref IS NULL)
      OR
      (scope_type <> 'global' AND NULLIF(BTRIM(scope_ref), '') IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_commerce_controls_scope_unique
  ON private.supplier_commerce_controls(operation, scope_type, scope_ref_key);

CREATE INDEX IF NOT EXISTS supplier_commerce_controls_lookup_idx
  ON private.supplier_commerce_controls(operation, scope_type, scope_ref_key, enabled);

CREATE TABLE IF NOT EXISTS private.supplier_commerce_control_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid REFERENCES private.supplier_commerce_controls(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  operation text NOT NULL,
  scope_type text NOT NULL,
  scope_ref text,
  previous_enabled boolean,
  new_enabled boolean NOT NULL,
  previous_version integer,
  new_version integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_commerce_control_audit_created_idx
  ON private.supplier_commerce_control_audit(created_at DESC);

-- Canonical defaults: migration presence does not authorize commerce.
INSERT INTO private.supplier_commerce_controls(operation, scope_type, scope_ref, enabled, reason)
VALUES
  ('*', 'global', NULL, false, 'Phase C safe default: Supplier Commerce globally disabled until controlled rollout'),
  ('import', 'global', NULL, false, 'Phase C safe default'),
  ('publish', 'global', NULL, false, 'Phase C safe default'),
  ('checkout', 'global', NULL, false, 'Phase C safe default'),
  ('reservation', 'global', NULL, false, 'Phase C safe default'),
  ('supplier_order', 'global', NULL, false, 'Phase C safe default'),
  ('tracking_ingest', 'global', NULL, false, 'Phase C safe default'),
  ('return_recovery', 'global', NULL, false, 'Phase C safe default')
ON CONFLICT (operation, scope_type, scope_ref_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Operational evidence / observability
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_commerce_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id uuid NOT NULL,
  request_id text,
  operation text NOT NULL,
  interface_version integer NOT NULL DEFAULT 1 CHECK (interface_version > 0),
  provider_ref text,
  supplier_ref text,
  entity_type text,
  entity_ref text,
  result_class text NOT NULL,
  error_class text,
  recovery_state text NOT NULL DEFAULT 'none',
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  external_ref text,
  customer_impact text,
  financial_impact text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_commerce_operations_result_check
    CHECK (result_class IN (
      'SUCCESS', 'ACCEPTED_PENDING', 'BLOCKED_BY_CONTROL', 'RETRYABLE_FAILURE',
      'PERMANENT_REJECTION', 'AUTH_CONFIGURATION_FAILURE', 'RATE_LIMITED',
      'PRICE_CHANGED', 'STOCK_CHANGED', 'UNKNOWN_OUTCOME', 'MANUAL_REVIEW_REQUIRED'
    )),
  CONSTRAINT supplier_commerce_operations_recovery_check
    CHECK (recovery_state IN ('none', 'retry_pending', 'query_before_retry', 'reconcile', 'manual_review', 'resolved'))
);

CREATE INDEX IF NOT EXISTS supplier_commerce_operations_correlation_idx
  ON private.supplier_commerce_operations(correlation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS supplier_commerce_operations_unresolved_idx
  ON private.supplier_commerce_operations(recovery_state, created_at)
  WHERE recovery_state <> 'resolved' AND recovery_state <> 'none';

-- ---------------------------------------------------------------------------
-- Incident + durable recovery framework
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_commerce_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key text UNIQUE NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  title text NOT NULL,
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  provider_ref text,
  supplier_ref text,
  capability text,
  customer_impact text,
  financial_impact text,
  mitigation text,
  recovery_evidence text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT supplier_commerce_incidents_severity_check
    CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT supplier_commerce_incidents_status_check
    CHECK (status IN ('open', 'mitigating', 'monitoring', 'resolved', 'closed')),
  CONSTRAINT supplier_commerce_incidents_closed_check
    CHECK ((status = 'closed' AND closed_at IS NOT NULL) OR status <> 'closed')
);

CREATE INDEX IF NOT EXISTS supplier_commerce_incidents_open_idx
  ON private.supplier_commerce_incidents(severity, opened_at DESC)
  WHERE status <> 'closed';

CREATE TABLE IF NOT EXISTS private.supplier_commerce_recovery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id uuid NOT NULL,
  operation_id uuid REFERENCES private.supplier_commerce_operations(id) ON DELETE RESTRICT,
  incident_id uuid REFERENCES private.supplier_commerce_incidents(id) ON DELETE SET NULL,
  operation text NOT NULL,
  retry_class text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_error_class text,
  external_ref text,
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT supplier_commerce_recovery_retry_class_check
    CHECK (retry_class IN ('safe_retry', 'backoff', 'query_before_retry', 'manual_review', 'never_auto_retry')),
  CONSTRAINT supplier_commerce_recovery_status_check
    CHECK (status IN ('open', 'scheduled', 'reconciling', 'manual_review', 'resolved', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS supplier_commerce_recovery_open_idx
  ON private.supplier_commerce_recovery_queue(status, next_attempt_at, created_at)
  WHERE status NOT IN ('resolved', 'cancelled');

-- ---------------------------------------------------------------------------
-- Provider/legal capability evidence register framework
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_commerce_provider_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  role text NOT NULL,
  territory text NOT NULL,
  capability text NOT NULL,
  status text NOT NULL DEFAULT 'unverified',
  official_source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_at timestamptz,
  reverify_due_at timestamptz,
  adapter_version text,
  api_version text,
  auth_model text,
  rights_summary text,
  commercial_constraints text,
  legal_constraints text,
  monitoring_owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  kill_switch_operation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_commerce_provider_role_check
    CHECK (role IN ('discovery_source', 'catalog_source', 'supplier', 'fulfilment_provider', 'carrier', 'sales_channel', 'payment_finance_provider')),
  CONSTRAINT supplier_commerce_provider_status_check
    CHECK (status IN ('unverified', 'verified', 'stale', 'blocked', 'disabled')),
  CONSTRAINT supplier_commerce_provider_sources_check
    CHECK (jsonb_typeof(official_source_refs) = 'array'),
  CONSTRAINT supplier_commerce_provider_verified_check
    CHECK (
      status <> 'verified'
      OR (
        verified_at IS NOT NULL
        AND reverify_due_at IS NOT NULL
        AND jsonb_array_length(official_source_refs) > 0
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_commerce_provider_capability_unique
  ON private.supplier_commerce_provider_capabilities(provider_key, role, territory, capability);
CREATE INDEX IF NOT EXISTS supplier_commerce_provider_reverify_idx
  ON private.supplier_commerce_provider_capabilities(status, reverify_due_at);

-- ---------------------------------------------------------------------------
-- Privacy / retention registry framework
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.supplier_commerce_retention_registry (
  data_family text PRIMARY KEY,
  purpose text NOT NULL,
  data_owner text NOT NULL,
  sensitivity text NOT NULL,
  source text NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  retention_rule text NOT NULL,
  deletion_method text NOT NULL,
  backup_handling text NOT NULL,
  legal_hold_allowed boolean NOT NULL DEFAULT true,
  incident_classification text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_commerce_retention_sensitivity_check
    CHECK (sensitivity IN ('public', 'internal', 'confidential', 'personal', 'restricted'))
);

-- Revoke direct access. Canonical access is through reviewed server RPCs only.
REVOKE ALL ON TABLE private.supplier_commerce_controls FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_control_audit FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_operations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_incidents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_recovery_queue FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_provider_capabilities FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_retention_registry FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Canonical server control decision
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.server_supplier_commerce_control_decision_v1(
  p_operation text,
  p_scope jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_operation text := lower(BTRIM(COALESCE(p_operation, '')));
  v_global private.supplier_commerce_controls%ROWTYPE;
  v_operation_control private.supplier_commerce_controls%ROWTYPE;
  v_scope_type text;
  v_scope_ref text;
  v_blocker private.supplier_commerce_controls%ROWTYPE;
  v_scope_key text;
BEGIN
  IF v_operation NOT IN ('import', 'publish', 'checkout', 'reservation', 'supplier_order', 'tracking_ingest', 'return_recovery') THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'unknown_operation', 'interfaceVersion', 1);
  END IF;

  IF p_scope IS NULL OR jsonb_typeof(p_scope) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'invalid_scope', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_global
    FROM private.supplier_commerce_controls
   WHERE operation = '*' AND scope_type = 'global' AND scope_ref IS NULL
   LIMIT 1;

  IF NOT FOUND OR v_global.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'reason', 'supplier_commerce_global_disabled',
      'interfaceVersion', 1,
      'controlVersion', COALESCE(v_global.version, 0)
    );
  END IF;

  SELECT * INTO v_operation_control
    FROM private.supplier_commerce_controls
   WHERE operation = v_operation AND scope_type = 'global' AND scope_ref IS NULL
   LIMIT 1;

  IF NOT FOUND OR v_operation_control.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'reason', 'operation_disabled',
      'operation', v_operation,
      'interfaceVersion', 1,
      'controlVersion', COALESCE(v_operation_control.version, 0)
    );
  END IF;

  FOREACH v_scope_type IN ARRAY ARRAY['provider','supplier','offer','product','category','territory','cohort']::text[]
  LOOP
    v_scope_key := CASE v_scope_type
      WHEN 'provider' THEN 'providerRef'
      WHEN 'supplier' THEN 'supplierRef'
      WHEN 'offer' THEN 'offerRef'
      WHEN 'product' THEN 'productRef'
      WHEN 'category' THEN 'categoryRef'
      WHEN 'territory' THEN 'territory'
      WHEN 'cohort' THEN 'cohort'
    END;
    v_scope_ref := NULLIF(BTRIM(p_scope ->> v_scope_key), '');

    IF v_scope_ref IS NOT NULL THEN
      SELECT * INTO v_blocker
        FROM private.supplier_commerce_controls
       WHERE operation IN ('*', v_operation)
         AND scope_type = v_scope_type
         AND scope_ref = v_scope_ref
         AND enabled = false
       ORDER BY CASE WHEN operation = v_operation THEN 0 ELSE 1 END
       LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'enabled', false,
          'reason', 'scoped_kill_switch',
          'operation', v_operation,
          'scopeType', v_scope_type,
          'scopeRef', v_scope_ref,
          'interfaceVersion', 1,
          'controlVersion', v_blocker.version
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'enabled', true,
    'reason', 'enabled',
    'operation', v_operation,
    'interfaceVersion', 1,
    'controlVersion', GREATEST(v_global.version, v_operation_control.version)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_commerce_control_decision_v1(text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commerce_control_decision_v1(text, jsonb)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Canonical server control mutation, with live admin recheck + audit
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.server_set_supplier_commerce_control_v1(
  p_actor_id uuid,
  p_operation text,
  p_scope_type text,
  p_scope_ref text,
  p_enabled boolean,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_operation text := lower(BTRIM(COALESCE(p_operation, '')));
  v_scope_type text := lower(BTRIM(COALESCE(p_scope_type, '')));
  v_scope_ref text := NULLIF(BTRIM(p_scope_ref), '');
  v_reason text := NULLIF(BTRIM(p_reason), '');
  v_existing private.supplier_commerce_controls%ROWTYPE;
  v_saved private.supplier_commerce_controls%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = p_actor_id AND u.role = 'admin' AND u."isActive" = true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE = '42501';
  END IF;

  IF v_operation NOT IN ('*', 'import', 'publish', 'checkout', 'reservation', 'supplier_order', 'tracking_ingest', 'return_recovery') THEN
    RAISE EXCEPTION 'unsupported Supplier Commerce control operation' USING ERRCODE = '22023';
  END IF;
  IF v_scope_type NOT IN ('global', 'provider', 'supplier', 'offer', 'product', 'category', 'territory', 'cohort') THEN
    RAISE EXCEPTION 'unsupported Supplier Commerce control scope' USING ERRCODE = '22023';
  END IF;
  IF (v_scope_type = 'global' AND v_scope_ref IS NOT NULL)
     OR (v_scope_type <> 'global' AND v_scope_ref IS NULL)
  THEN
    RAISE EXCEPTION 'invalid Supplier Commerce control scope reference' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'control change reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
    FROM private.supplier_commerce_controls
   WHERE operation = v_operation
     AND scope_type = v_scope_type
     AND scope_ref_key = COALESCE(v_scope_ref, '')
   FOR UPDATE;

  IF FOUND THEN
    UPDATE private.supplier_commerce_controls
       SET enabled = p_enabled,
           reason = v_reason,
           version = version + 1,
           updated_by = p_actor_id,
           updated_at = now()
     WHERE id = v_existing.id
     RETURNING * INTO v_saved;
  ELSE
    INSERT INTO private.supplier_commerce_controls(
      operation, scope_type, scope_ref, enabled, reason, updated_by
    ) VALUES (
      v_operation, v_scope_type, v_scope_ref, p_enabled, v_reason, p_actor_id
    ) RETURNING * INTO v_saved;
  END IF;

  INSERT INTO private.supplier_commerce_control_audit(
    control_id, actor_id, operation, scope_type, scope_ref,
    previous_enabled, new_enabled, previous_version, new_version, reason
  ) VALUES (
    v_saved.id, p_actor_id, v_operation, v_scope_type, v_scope_ref,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE v_existing.enabled END,
    v_saved.enabled,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE v_existing.version END,
    v_saved.version,
    v_reason
  );

  RETURN jsonb_build_object(
    'id', v_saved.id,
    'operation', v_saved.operation,
    'scopeType', v_saved.scope_type,
    'scopeRef', v_saved.scope_ref,
    'enabled', v_saved.enabled,
    'version', v_saved.version,
    'updatedAt', v_saved.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_set_supplier_commerce_control_v1(uuid, text, text, text, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_set_supplier_commerce_control_v1(uuid, text, text, text, boolean, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_list_supplier_commerce_controls_v1(p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = p_actor_id AND u.role = 'admin' AND u."isActive" = true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'operation', c.operation,
    'scopeType', c.scope_type,
    'scopeRef', c.scope_ref,
    'enabled', c.enabled,
    'reason', c.reason,
    'version', c.version,
    'updatedBy', c.updated_by,
    'updatedAt', c.updated_at
  ) ORDER BY c.operation, c.scope_type, c.scope_ref_key), '[]'::jsonb)
  INTO v_result
  FROM private.supplier_commerce_controls c;

  RETURN jsonb_build_object('interfaceVersion', 1, 'controls', v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.server_list_supplier_commerce_controls_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_list_supplier_commerce_controls_v1(uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Structured operational evidence writer
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.server_record_supplier_commerce_operation_v1(
  p_correlation_id uuid,
  p_request_id text,
  p_operation text,
  p_provider_ref text,
  p_supplier_ref text,
  p_entity_type text,
  p_entity_ref text,
  p_result_class text,
  p_error_class text,
  p_recovery_state text,
  p_retry_count integer,
  p_external_ref text,
  p_customer_impact text,
  p_financial_impact text,
  p_started_at timestamptz,
  p_finished_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'correlation id required' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_operation, '')), '') IS NULL THEN
    RAISE EXCEPTION 'operation required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.supplier_commerce_operations(
    correlation_id, request_id, operation, interface_version,
    provider_ref, supplier_ref, entity_type, entity_ref,
    result_class, error_class, recovery_state, retry_count,
    external_ref, customer_impact, financial_impact, started_at, finished_at
  ) VALUES (
    p_correlation_id, NULLIF(BTRIM(p_request_id), ''), BTRIM(p_operation), 1,
    NULLIF(BTRIM(p_provider_ref), ''), NULLIF(BTRIM(p_supplier_ref), ''),
    NULLIF(BTRIM(p_entity_type), ''), NULLIF(BTRIM(p_entity_ref), ''),
    p_result_class, NULLIF(BTRIM(p_error_class), ''), COALESCE(NULLIF(BTRIM(p_recovery_state), ''), 'none'), COALESCE(p_retry_count, 0),
    NULLIF(BTRIM(p_external_ref), ''), NULLIF(BTRIM(p_customer_impact), ''), NULLIF(BTRIM(p_financial_impact), ''),
    COALESCE(p_started_at, now()), p_finished_at
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.server_record_supplier_commerce_operation_v1(
  uuid, text, text, text, text, text, text, text, text, text, integer, text, text, text, timestamptz, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_commerce_operation_v1(
  uuid, text, text, text, text, text, text, text, text, text, integer, text, text, text, timestamptz, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.server_supplier_commerce_control_decision_v1(text, jsonb) IS
  'Phase C v1 server-only Supplier Commerce rollout/kill-switch decision. Missing/invalid control evidence fails closed.';
COMMENT ON TABLE private.supplier_commerce_provider_capabilities IS
  'Versioned provider/legal capability evidence register framework. Verified state requires current official-source evidence and re-verification due date.';
COMMENT ON TABLE private.supplier_commerce_retention_registry IS
  'Supplier Commerce privacy/retention registry framework; actual retention rules must be populated and verified before affected capabilities activate.';

DO $$
BEGIN
  IF to_regprocedure('public.server_supplier_commerce_control_decision_v1(text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Supplier Commerce control decision RPC missing';
  END IF;
  IF to_regprocedure('public.server_set_supplier_commerce_control_v1(uuid,text,text,text,boolean,text)') IS NULL THEN
    RAISE EXCEPTION 'Supplier Commerce control mutation RPC missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM private.supplier_commerce_controls
     WHERE operation = '*' AND scope_type = 'global' AND enabled = false
  ) THEN
    RAISE EXCEPTION 'Supplier Commerce global safe-default control missing';
  END IF;
END;
$$;
