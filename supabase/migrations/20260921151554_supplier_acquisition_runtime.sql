ALTER TABLE private.supplier_onboarding_profiles
  ADD COLUMN IF NOT EXISTS acquisition_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acquisition_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS acquisition_config_version integer NOT NULL DEFAULT 1;

ALTER TABLE private.supplier_onboarding_profiles
  DROP CONSTRAINT IF EXISTS supplier_onboarding_acquisition_mode_check;
ALTER TABLE private.supplier_onboarding_profiles
  ADD CONSTRAINT supplier_onboarding_acquisition_mode_check
  CHECK (acquisition_mode IN ('manual','scheduled'));

ALTER TABLE private.supplier_onboarding_profiles
  DROP CONSTRAINT IF EXISTS supplier_onboarding_acquisition_version_check;
ALTER TABLE private.supplier_onboarding_profiles
  ADD CONSTRAINT supplier_onboarding_acquisition_version_check
  CHECK (acquisition_config_version > 0);

ALTER TABLE private.supplier_onboarding_profiles
  DROP CONSTRAINT IF EXISTS supplier_onboarding_scheduled_refresh_check;
ALTER TABLE private.supplier_onboarding_profiles
  ADD CONSTRAINT supplier_onboarding_scheduled_refresh_check CHECK (
    NOT acquisition_enabled
    OR acquisition_mode <> 'scheduled'
    OR catalog_refresh_minutes BETWEEN 15 AND 10080
  );

CREATE TABLE IF NOT EXISTS private.supplier_acquisition_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  trigger text NOT NULL,
  transport text NOT NULL,
  source_format text NOT NULL,
  config_ref text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  payload_bytes integer,
  normalized_records integer,
  accepted_records integer,
  quarantined_records integer,
  source_digest text,
  remote_etag text,
  remote_last_modified text,
  error_code text,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_acquisition_trigger_check CHECK (trigger IN ('manual','scheduled')),
  CONSTRAINT supplier_acquisition_transport_check CHECK (transport IN ('json_api','json_feed','feed_url','sftp')),
  CONSTRAINT supplier_acquisition_source_format_check CHECK (source_format IN ('json','csv','xml','canonical_json')),
  CONSTRAINT supplier_acquisition_status_check CHECK (status IN ('running','succeeded','failed','blocked')),
  CONSTRAINT supplier_acquisition_config_ref_check CHECK (config_ref ~ '^env:[A-Z][A-Z0-9_]{2,127}$'),
  CONSTRAINT supplier_acquisition_counts_check CHECK (
    COALESCE(payload_bytes,0) >= 0
    AND COALESCE(normalized_records,0) >= 0
    AND COALESCE(accepted_records,0) >= 0
    AND COALESCE(quarantined_records,0) >= 0
  ),
  CONSTRAINT supplier_acquisition_digest_check CHECK (
    source_digest IS NULL OR source_digest ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT supplier_acquisition_completion_check CHECK (
    (status='running' AND completed_at IS NULL)
    OR (status<>'running' AND completed_at IS NOT NULL)
  )
);

ALTER TABLE private.supplier_acquisition_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.supplier_acquisition_runs FROM PUBLIC, anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS supplier_acquisition_runs_supplier_started_idx
  ON private.supplier_acquisition_runs(supplier_id, started_at DESC);
CREATE INDEX IF NOT EXISTS supplier_acquisition_runs_status_started_idx
  ON private.supplier_acquisition_runs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS supplier_acquisition_runs_actor_idx
  ON private.supplier_acquisition_runs(actor_id)
  WHERE actor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_acquisition_control_v1(
  p_actor_id uuid,
  p_supplier_id uuid,
  p_enabled boolean,
  p_mode text,
  p_refresh_minutes integer,
  p_config_ref text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_profile private.supplier_onboarding_profiles%ROWTYPE;
  v_mode text := lower(BTRIM(COALESCE(p_mode,'manual')));
  v_config_ref text := BTRIM(COALESCE(p_config_ref,''));
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_onboarding_profiles
  WHERE supplier_id=p_supplier_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier onboarding profile not found' USING ERRCODE='P0002';
  END IF;

  IF v_profile.source_class <> 'direct_supplier' THEN
    RAISE EXCEPTION 'acquisition runtime is limited to direct supplier profiles' USING ERRCODE='23514';
  END IF;
  IF v_profile.feed_transport NOT IN ('json_api','json_feed','feed_url','sftp') THEN
    RAISE EXCEPTION 'selected supplier transport is not remotely acquirable' USING ERRCODE='23514';
  END IF;
  IF v_mode NOT IN ('manual','scheduled') THEN
    RAISE EXCEPTION 'invalid acquisition mode' USING ERRCODE='22023';
  END IF;
  IF p_enabled AND v_config_ref !~ '^env:[A-Z][A-Z0-9_]{2,127}$' THEN
    RAISE EXCEPTION 'enabled acquisition requires an env: server config reference' USING ERRCODE='23514';
  END IF;
  IF p_enabled AND v_profile.onboarding_status <> 'approved' THEN
    RAISE EXCEPTION 'supplier onboarding must be approved before acquisition can be enabled' USING ERRCODE='23514';
  END IF;
  IF p_enabled AND v_mode='scheduled' AND (p_refresh_minutes IS NULL OR p_refresh_minutes NOT BETWEEN 15 AND 10080) THEN
    RAISE EXCEPTION 'scheduled acquisition refresh must be between 15 and 10080 minutes' USING ERRCODE='22023';
  END IF;

  UPDATE private.supplier_onboarding_profiles
  SET acquisition_enabled=COALESCE(p_enabled,false),
      acquisition_mode=v_mode,
      catalog_refresh_minutes=CASE
        WHEN v_mode='scheduled' THEN p_refresh_minutes
        ELSE catalog_refresh_minutes
      END,
      config_ref=CASE
        WHEN v_config_ref<>'' THEN v_config_ref
        ELSE config_ref
      END,
      acquisition_config_version=acquisition_config_version+1,
      updated_by=p_actor_id,
      updated_at=now()
  WHERE supplier_id=p_supplier_id
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'ok',true,
    'supplierId',p_supplier_id,
    'acquisitionEnabled',v_profile.acquisition_enabled,
    'acquisitionMode',v_profile.acquisition_mode,
    'catalogRefreshMinutes',v_profile.catalog_refresh_minutes,
    'configRef',v_profile.config_ref,
    'acquisitionConfigVersion',v_profile.acquisition_config_version,
    'commercialActivationPerformed',false,
    'marketplaceListingPerformed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_acquisition_control_v1(uuid,uuid,boolean,text,integer,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_acquisition_control_v1(uuid,uuid,boolean,text,integer,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_acquisition_context_v1(
  p_supplier_key text,
  p_trigger text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_profile private.supplier_onboarding_profiles%ROWTYPE;
  v_trigger text := lower(BTRIM(COALESCE(p_trigger,'')));
  v_foundation jsonb;
  v_blockers text[] := '{}';
BEGIN
  IF v_trigger NOT IN ('manual','scheduled') THEN
    RAISE EXCEPTION 'invalid acquisition trigger' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE supplier_key=lower(BTRIM(COALESCE(p_supplier_key,'')))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','supplier_not_found',
      'blockers',jsonb_build_array('supplier_not_found'),
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_onboarding_profiles
  WHERE supplier_id=v_supplier.id;

  IF NOT FOUND THEN
    v_blockers:=array_append(v_blockers,'onboarding_profile_missing');
  ELSE
    IF v_profile.source_class<>'direct_supplier' THEN
      v_blockers:=array_append(v_blockers,'not_direct_supplier');
    END IF;
    IF v_profile.onboarding_status<>'approved' THEN
      v_blockers:=array_append(v_blockers,'onboarding_not_approved');
    END IF;
    IF NOT v_profile.acquisition_enabled THEN
      v_blockers:=array_append(v_blockers,'acquisition_disabled');
    END IF;
    IF v_trigger='scheduled' AND v_profile.acquisition_mode<>'scheduled' THEN
      v_blockers:=array_append(v_blockers,'scheduled_acquisition_not_enabled');
    END IF;
    IF v_profile.feed_transport NOT IN ('json_api','json_feed','feed_url','sftp') THEN
      v_blockers:=array_append(v_blockers,'transport_not_remotely_acquirable');
    END IF;
    IF COALESCE(v_profile.config_ref,'') !~ '^env:[A-Z][A-Z0-9_]{2,127}$' THEN
      v_blockers:=array_append(v_blockers,'server_config_reference_invalid');
    END IF;
  END IF;

  v_foundation:=public.server_supplier_foundation_decision_v1(
    v_supplier.supplier_key,
    'GB',
    'catalog'
  );
  IF COALESCE((v_foundation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_blockers:=array_append(v_blockers,'foundation:'||COALESCE(v_foundation->>'reason','unavailable'));
  END IF;

  RETURN jsonb_build_object(
    'eligible',cardinality(v_blockers)=0,
    'reason',CASE WHEN cardinality(v_blockers)=0 THEN 'acquisition_ready' ELSE 'acquisition_blocked' END,
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'legalName',COALESCE(v_supplier.legal_name,v_supplier.display_name),
    'registrationCountry',COALESCE(v_supplier.business_country,'GB'),
    'warehouseRefs',COALESCE(v_supplier.warehouse_refs,'[]'::jsonb),
    'supportedTerritories',CASE WHEN v_profile.supplier_id IS NULL THEN '[]'::jsonb ELSE to_jsonb(v_profile.supported_territories) END,
    'requestedCapabilities',CASE WHEN v_profile.supplier_id IS NULL THEN '[]'::jsonb ELSE to_jsonb(v_profile.requested_capabilities) END,
    'transport',CASE WHEN v_profile.supplier_id IS NULL THEN NULL ELSE v_profile.feed_transport END,
    'sourceFormat',CASE WHEN v_profile.supplier_id IS NULL THEN NULL ELSE v_profile.source_format END,
    'configRef',CASE WHEN v_profile.supplier_id IS NULL THEN NULL ELSE v_profile.config_ref END,
    'acquisitionMode',CASE WHEN v_profile.supplier_id IS NULL THEN NULL ELSE v_profile.acquisition_mode END,
    'catalogRefreshMinutes',CASE WHEN v_profile.supplier_id IS NULL THEN NULL ELSE v_profile.catalog_refresh_minutes END,
    'blockers',to_jsonb(v_blockers),
    'foundation',v_foundation,
    'externalMutationPerformed',false,
    'commercialActivationPerformed',false,
    'marketplaceListingPerformed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_acquisition_context_v1(text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_acquisition_context_v1(text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_acquisition_due_v1(
  p_limit integer DEFAULT 20
) RETURNS TABLE(supplier_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT s.supplier_key
  FROM private.supplier_foundation_suppliers s
  JOIN private.supplier_onboarding_profiles p ON p.supplier_id=s.id
  WHERE p.source_class='direct_supplier'
    AND p.onboarding_status='approved'
    AND p.acquisition_enabled=true
    AND p.acquisition_mode='scheduled'
    AND p.feed_transport IN ('json_api','json_feed','feed_url','sftp')
    AND p.config_ref ~ '^env:[A-Z][A-Z0-9_]{2,127}$'
    AND p.catalog_refresh_minutes BETWEEN 15 AND 10080
    AND NOT EXISTS (
      SELECT 1
      FROM private.supplier_acquisition_runs r
      WHERE r.supplier_id=s.id
        AND r.status='running'
        AND r.started_at > now()-interval '30 minutes'
    )
    AND COALESCE((
      SELECT max(r.completed_at)
      FROM private.supplier_acquisition_runs r
      WHERE r.supplier_id=s.id
        AND r.status='succeeded'
    ), '-infinity'::timestamptz)
      <= now() - make_interval(mins => p.catalog_refresh_minutes)
  ORDER BY COALESCE((
    SELECT max(r.completed_at)
    FROM private.supplier_acquisition_runs r
    WHERE r.supplier_id=s.id
      AND r.status='succeeded'
  ), '-infinity'::timestamptz) ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit,20),1),50)
$$;

REVOKE ALL ON FUNCTION public.server_supplier_acquisition_due_v1(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_acquisition_due_v1(integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_acquisition_run_v1(
  p_action text,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action text := lower(BTRIM(COALESCE(p_action,'')));
  v_payload jsonb := COALESCE(p_payload,'{}'::jsonb);
  v_run private.supplier_acquisition_runs%ROWTYPE;
  v_supplier_id uuid;
  v_run_id uuid;
  v_status text;
BEGIN
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload must be an object' USING ERRCODE='22023';
  END IF;

  IF v_action='start' THEN
    BEGIN v_supplier_id:=NULLIF(v_payload->>'supplierId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'supplierId must be a UUID' USING ERRCODE='22023';
    END;

    IF v_supplier_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id=v_supplier_id
    ) THEN
      RAISE EXCEPTION 'supplier not found' USING ERRCODE='P0002';
    END IF;

    INSERT INTO private.supplier_acquisition_runs(
      supplier_id,actor_id,trigger,transport,source_format,config_ref,status
    ) VALUES (
      v_supplier_id,
      NULLIF(v_payload->>'actorId','')::uuid,
      lower(BTRIM(v_payload->>'trigger')),
      lower(BTRIM(v_payload->>'transport')),
      lower(BTRIM(v_payload->>'sourceFormat')),
      BTRIM(v_payload->>'configRef'),
      'running'
    )
    RETURNING * INTO v_run;

    RETURN jsonb_build_object(
      'ok',true,'runId',v_run.id,'status',v_run.status,
      'startedAt',v_run.started_at,
      'commercialActivationPerformed',false,
      'marketplaceListingPerformed',false,
      'interfaceVersion',1
    );
  END IF;

  IF v_action='finish' THEN
    BEGIN v_run_id:=NULLIF(v_payload->>'runId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'runId must be a UUID' USING ERRCODE='22023';
    END;
    v_status:=lower(BTRIM(COALESCE(v_payload->>'status','')));
    IF v_run_id IS NULL THEN
      RAISE EXCEPTION 'runId is required' USING ERRCODE='22023';
    END IF;
    IF v_status NOT IN ('succeeded','failed','blocked') THEN
      RAISE EXCEPTION 'invalid acquisition completion status' USING ERRCODE='22023';
    END IF;

    UPDATE private.supplier_acquisition_runs
    SET status=v_status,
        completed_at=now(),
        payload_bytes=NULLIF(v_payload->>'payloadBytes','')::integer,
        normalized_records=NULLIF(v_payload->>'normalizedRecords','')::integer,
        accepted_records=NULLIF(v_payload->>'acceptedRecords','')::integer,
        quarantined_records=NULLIF(v_payload->>'quarantinedRecords','')::integer,
        source_digest=NULLIF(lower(BTRIM(v_payload->>'sourceDigest')),''),
        remote_etag=LEFT(NULLIF(BTRIM(v_payload->>'remoteEtag'),''),512),
        remote_last_modified=LEFT(NULLIF(BTRIM(v_payload->>'remoteLastModified'),''),512),
        error_code=LEFT(NULLIF(BTRIM(v_payload->>'errorCode'),''),96),
        error_summary=LEFT(NULLIF(BTRIM(v_payload->>'errorSummary'),''),1000)
    WHERE id=v_run_id AND status='running'
    RETURNING * INTO v_run;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'acquisition run not found or already completed' USING ERRCODE='P0002';
    END IF;

    RETURN jsonb_build_object(
      'ok',true,'runId',v_run.id,'status',v_run.status,
      'completedAt',v_run.completed_at,
      'commercialActivationPerformed',false,
      'marketplaceListingPerformed',false,
      'interfaceVersion',1
    );
  END IF;

  RAISE EXCEPTION 'unknown acquisition run action' USING ERRCODE='22023';
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_acquisition_run_v1(text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_acquisition_run_v1(text,jsonb)
  TO service_role;

COMMENT ON TABLE private.supplier_acquisition_runs IS
  'Server-only Direct Supplier acquisition audit. Stores no raw feed payload and no supplier credential material.';
COMMENT ON FUNCTION public.server_supplier_acquisition_context_v1(text,text) IS
  'Service-role-only fail-closed acquisition readiness snapshot. Returns config reference only, never secret material.';
COMMENT ON FUNCTION public.server_supplier_acquisition_due_v1(integer) IS
  'Service-role-only scheduler selector for explicitly enabled Direct Supplier profiles.';
COMMENT ON FUNCTION public.server_supplier_acquisition_run_v1(text,jsonb) IS
  'Service-role-only acquisition run audit boundary. No supplier activation, commerce mutation or marketplace publication.';
