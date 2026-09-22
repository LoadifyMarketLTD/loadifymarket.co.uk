-- Universal Supplier Integration Kit foundation.
-- Private, admin-governed per-capability transport bindings.
-- No supplier, adapter, pilot, listing, order, payment or commerce activation occurs here.

CREATE TABLE IF NOT EXISTS private.supplier_integration_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  territory text NOT NULL,
  capability text NOT NULL,
  transport text NOT NULL,
  execution_mode text NOT NULL DEFAULT 'manual_only',
  config_ref text,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  contract_ref text,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT supplier_integration_profile_territory_check
    CHECK (territory = upper(BTRIM(territory)) AND territory ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_integration_profile_capability_check
    CHECK (capability IN (
      'supplier_identity','catalog','variants','stock','price','shipping',
      'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement'
    )),
  CONSTRAINT supplier_integration_profile_transport_check
    CHECK (transport IN (
      'http_rest','graphql','feed_url','sftp','ftps','ftp',
      'webhook','email','manual_portal','manual_file'
    )),
  CONSTRAINT supplier_integration_profile_execution_mode_check
    CHECK (execution_mode IN ('manual_only','automated_read','automated_write')),
  CONSTRAINT supplier_integration_profile_status_check
    CHECK (status IN ('draft','verified','blocked','stale')),
  CONSTRAINT supplier_integration_profile_mapping_object_check
    CHECK (jsonb_typeof(mapping) = 'object'),
  CONSTRAINT supplier_integration_profile_config_ref_check
    CHECK (
      config_ref IS NULL
      OR config_ref ~ '^env:[A-Z][A-Z0-9_]{2,127}$'
    ),
  CONSTRAINT supplier_integration_profile_plain_ftp_check
    CHECK (transport <> 'ftp' OR execution_mode = 'manual_only'),
  CONSTRAINT supplier_integration_profile_webhook_mode_check
    CHECK (transport <> 'webhook' OR execution_mode <> 'automated_write'),
  CONSTRAINT supplier_integration_profile_automated_config_check
    CHECK (
      execution_mode = 'manual_only'
      OR NULLIF(BTRIM(config_ref),'') IS NOT NULL
    ),
  CONSTRAINT supplier_integration_profile_verified_contract_check
    CHECK (
      status <> 'verified'
      OR NULLIF(BTRIM(contract_ref),'') IS NOT NULL
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_integration_profile_scope_uq
  ON private.supplier_integration_profiles(supplier_id, territory, capability);

CREATE INDEX IF NOT EXISTS supplier_integration_profile_status_idx
  ON private.supplier_integration_profiles(status, transport, updated_at DESC);

REVOKE ALL ON TABLE private.supplier_integration_profiles
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_integration_profile_v1(
  p_actor_id uuid,
  p_action text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action text := lower(BTRIM(COALESCE(p_action,'')));
  v_payload jsonb := COALESCE(p_payload,'{}'::jsonb);
  v_supplier_id uuid;
  v_territory text := upper(BTRIM(COALESCE(v_payload->>'territory','GB')));
  v_capability text := lower(BTRIM(COALESCE(v_payload->>'capability','')));
  v_transport text := lower(BTRIM(COALESCE(v_payload->>'transport','')));
  v_execution_mode text := lower(BTRIM(COALESCE(v_payload->>'executionMode','manual_only')));
  v_status text := lower(BTRIM(COALESCE(v_payload->>'status','draft')));
  v_config_ref text := NULLIF(BTRIM(v_payload->>'configRef'),'');
  v_contract_ref text := NULLIF(BTRIM(v_payload->>'contractRef'),'');
  v_mapping jsonb := COALESCE(v_payload->'mapping','{}'::jsonb);
  v_notes text := NULLIF(BTRIM(v_payload->>'notes'),'');
  v_profile private.supplier_integration_profiles%ROWTYPE;
  v_profiles jsonb;
  v_secret_key_pattern text := '"(password|secret|token|api[_-]?key|authorization|private[_-]?key)"[[:space:]]*:';
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_actor_id
      AND u.role = 'admin'
      AND u."isActive" = true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE='42501';
  END IF;

  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload must be an object' USING ERRCODE='22023';
  END IF;

  BEGIN
    v_supplier_id := NULLIF(v_payload->>'supplierId','')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'supplierId must be a UUID' USING ERRCODE='22023';
  END;

  IF v_supplier_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id = v_supplier_id
  ) THEN
    RAISE EXCEPTION 'supplier not found' USING ERRCODE='P0002';
  END IF;

  IF v_action = 'list' THEN
    SELECT COALESCE(
      jsonb_agg(to_jsonb(p) ORDER BY p.territory, p.capability),
      '[]'::jsonb
    )
    INTO v_profiles
    FROM private.supplier_integration_profiles p
    WHERE p.supplier_id = v_supplier_id;

    RETURN jsonb_build_object(
      'ok', true,
      'supplierId', v_supplier_id,
      'profiles', v_profiles,
      'activationChanged', false,
      'interfaceVersion', 1
    );
  END IF;

  IF v_action <> 'upsert' THEN
    RAISE EXCEPTION 'unsupported supplier integration profile action' USING ERRCODE='22023';
  END IF;

  IF v_territory !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'territory must be a two-letter country code' USING ERRCODE='22023';
  END IF;

  IF v_capability NOT IN (
    'supplier_identity','catalog','variants','stock','price','shipping',
    'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement'
  ) THEN
    RAISE EXCEPTION 'unsupported supplier capability' USING ERRCODE='22023';
  END IF;

  IF v_transport NOT IN (
    'http_rest','graphql','feed_url','sftp','ftps','ftp',
    'webhook','email','manual_portal','manual_file'
  ) THEN
    RAISE EXCEPTION 'unsupported supplier integration transport' USING ERRCODE='22023';
  END IF;

  IF v_execution_mode NOT IN ('manual_only','automated_read','automated_write') THEN
    RAISE EXCEPTION 'unsupported supplier integration execution mode' USING ERRCODE='22023';
  END IF;

  IF v_status NOT IN ('draft','verified','blocked','stale') THEN
    RAISE EXCEPTION 'unsupported supplier integration profile status' USING ERRCODE='22023';
  END IF;

  IF jsonb_typeof(v_mapping) <> 'object' THEN
    RAISE EXCEPTION 'mapping must be an object' USING ERRCODE='22023';
  END IF;

  IF v_mapping::text ~* v_secret_key_pattern THEN
    RAISE EXCEPTION 'mapping must not contain credentials or secret material' USING ERRCODE='22023';
  END IF;

  IF v_config_ref IS NOT NULL AND v_config_ref !~ '^env:[A-Z][A-Z0-9_]{2,127}$' THEN
    RAISE EXCEPTION 'configRef must use env:VARIABLE_NAME format' USING ERRCODE='22023';
  END IF;

  IF v_execution_mode <> 'manual_only' AND v_config_ref IS NULL THEN
    RAISE EXCEPTION 'automated integration profiles require a server-side configRef' USING ERRCODE='23514';
  END IF;

  IF v_transport = 'ftp' AND v_execution_mode <> 'manual_only' THEN
    RAISE EXCEPTION 'plain FTP is never eligible for automated execution; use SFTP or FTPS' USING ERRCODE='23514';
  END IF;

  IF v_transport = 'webhook' AND v_execution_mode = 'automated_write' THEN
    RAISE EXCEPTION 'webhook transport is inbound/read-side only' USING ERRCODE='23514';
  END IF;

  IF v_status = 'verified' THEN
    IF v_contract_ref IS NULL THEN
      RAISE EXCEPTION 'verified integration profile requires contractRef' USING ERRCODE='23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_onboarding_capability_evidence ce
      WHERE ce.supplier_id = v_supplier_id
        AND ce.territory = v_territory
        AND ce.capability = v_capability
        AND ce.status = 'verified'
        AND ce.verified_at IS NOT NULL
        AND (ce.expires_at IS NULL OR ce.expires_at > now())
        AND jsonb_array_length(ce.source_refs) > 0
        AND ce.execution_mode = v_execution_mode
        AND (
          v_execution_mode <> 'automated_write'
          OR (
            ce.write_allowed = true
            AND ce.idempotency_known = true
            AND ce.lost_response_recovery_known = true
          )
        )
    ) THEN
      RAISE EXCEPTION 'verified integration profile requires matching current supplier capability evidence'
        USING ERRCODE='23514';
    END IF;
  END IF;

  INSERT INTO private.supplier_integration_profiles(
    supplier_id, territory, capability, transport, execution_mode,
    config_ref, mapping, contract_ref, status, notes,
    verified_by, verified_at, created_by, updated_by
  ) VALUES (
    v_supplier_id, v_territory, v_capability, v_transport, v_execution_mode,
    v_config_ref, v_mapping, v_contract_ref, v_status, v_notes,
    CASE WHEN v_status='verified' THEN p_actor_id ELSE NULL END,
    CASE WHEN v_status='verified' THEN now() ELSE NULL END,
    p_actor_id, p_actor_id
  )
  ON CONFLICT (supplier_id, territory, capability) DO UPDATE SET
    transport = EXCLUDED.transport,
    execution_mode = EXCLUDED.execution_mode,
    config_ref = EXCLUDED.config_ref,
    mapping = EXCLUDED.mapping,
    contract_ref = EXCLUDED.contract_ref,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    verified_by = EXCLUDED.verified_by,
    verified_at = EXCLUDED.verified_at,
    updated_by = p_actor_id,
    updated_at = now()
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'ok', true,
    'supplierId', v_supplier_id,
    'profile', to_jsonb(v_profile),
    'activationChanged', false,
    'externalAccessPerformed', false,
    'commerceActivationPerformed', false,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_integration_profile_v1(uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_integration_profile_v1(uuid,text,jsonb)
  TO service_role;

COMMENT ON TABLE private.supplier_integration_profiles IS
  'Private per-capability Supplier Integration Kit bindings. Stores only non-secret transport/mapping metadata and server-side config references.';

COMMENT ON FUNCTION public.server_admin_supplier_integration_profile_v1(uuid,text,jsonb) IS
  'Active-admin-only Supplier Integration Kit profile manager. It never activates commerce or performs external supplier access.';
