CREATE TABLE IF NOT EXISTS private.supplier_onboarding_capability_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  territory text NOT NULL DEFAULT 'GB',
  capability text NOT NULL,
  status text NOT NULL DEFAULT 'unverified',
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_summary text,
  evidence_hash text,
  verified_at timestamptz,
  expires_at timestamptz,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_onboarding_capability_territory_check
    CHECK (territory = upper(BTRIM(territory)) AND territory ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_onboarding_capability_name_check
    CHECK (capability IN (
      'supplier_identity','catalog','variants','stock','price','shipping',
      'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement'
    )),
  CONSTRAINT supplier_onboarding_capability_status_check
    CHECK (status IN ('unverified','verified','rejected','stale','blocked')),
  CONSTRAINT supplier_onboarding_capability_sources_check
    CHECK (jsonb_typeof(source_refs)='array'),
  CONSTRAINT supplier_onboarding_capability_verified_check
    CHECK (
      status <> 'verified'
      OR (
        verified_at IS NOT NULL
        AND verified_by IS NOT NULL
        AND jsonb_array_length(source_refs) > 0
        AND (expires_at IS NULL OR expires_at > verified_at)
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_onboarding_capability_unique
  ON private.supplier_onboarding_capability_evidence(supplier_id, territory, capability);
CREATE INDEX IF NOT EXISTS supplier_onboarding_capability_status_idx
  ON private.supplier_onboarding_capability_evidence(status, expires_at, supplier_id);

REVOKE ALL ON TABLE private.supplier_onboarding_capability_evidence
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_onboarding_capability_v1(
  p_actor_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_payload jsonb := COALESCE(p_payload,'{}'::jsonb);
  v_supplier_id uuid;
  v_territory text := upper(BTRIM(COALESCE(v_payload->>'territory','GB')));
  v_capability text := lower(BTRIM(COALESCE(v_payload->>'capability','')));
  v_status text := lower(BTRIM(COALESCE(v_payload->>'status','unverified')));
  v_sources jsonb := COALESCE(v_payload->'sourceRefs','[]'::jsonb);
  v_row private.supplier_onboarding_capability_evidence%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
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
    SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id=v_supplier_id
  ) THEN
    RAISE EXCEPTION 'supplier not found' USING ERRCODE='P0002';
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
  IF v_status NOT IN ('unverified','verified','rejected','stale','blocked') THEN
    RAISE EXCEPTION 'unsupported supplier capability status' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(v_sources) <> 'array' THEN
    RAISE EXCEPTION 'sourceRefs must be an array' USING ERRCODE='22023';
  END IF;
  IF v_status='verified' AND jsonb_array_length(v_sources)=0 THEN
    RAISE EXCEPTION 'verified supplier capability requires sourceRefs' USING ERRCODE='23514';
  END IF;

  INSERT INTO private.supplier_onboarding_capability_evidence(
    supplier_id,territory,capability,status,source_refs,evidence_summary,evidence_hash,
    verified_at,expires_at,verified_by
  ) VALUES (
    v_supplier_id,v_territory,v_capability,v_status,v_sources,
    NULLIF(BTRIM(v_payload->>'evidenceSummary'),''),
    NULLIF(BTRIM(v_payload->>'evidenceHash'),''),
    CASE WHEN v_status='verified' THEN now() ELSE NULL END,
    NULLIF(v_payload->>'expiresAt','')::timestamptz,
    CASE WHEN v_status='verified' THEN p_actor_id ELSE NULL END
  )
  ON CONFLICT (supplier_id,territory,capability) DO UPDATE SET
    status=EXCLUDED.status,
    source_refs=EXCLUDED.source_refs,
    evidence_summary=EXCLUDED.evidence_summary,
    evidence_hash=EXCLUDED.evidence_hash,
    verified_at=EXCLUDED.verified_at,
    expires_at=EXCLUDED.expires_at,
    verified_by=EXCLUDED.verified_by,
    version=private.supplier_onboarding_capability_evidence.version+1,
    updated_at=now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok',true,
    'supplierId',v_supplier_id,
    'territory',v_row.territory,
    'capability',v_row.capability,
    'status',v_row.status,
    'version',v_row.version,
    'activationChanged',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_onboarding_capability_v1(uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_onboarding_capability_v1(uuid,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_adapter_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE v_capability text;
BEGIN
  NEW.provider_key := lower(BTRIM(NEW.provider_key));
  NEW.adapter_key := lower(BTRIM(NEW.adapter_key));
  NEW.territory := upper(BTRIM(NEW.territory));

  IF cardinality(NEW.capabilities) <> (
    SELECT count(DISTINCT capability) FROM unnest(NEW.capabilities) AS capability
  ) THEN
    RAISE EXCEPTION 'adapter capabilities must be unique' USING ERRCODE='23514';
  END IF;

  IF NEW.status='active' THEN
    FOREACH v_capability IN ARRAY NEW.capabilities LOOP
      IF NEW.provider_key='direct_supplier' THEN
        IF v_capability NOT IN ('catalog','variants','stock','price') THEN
          RAISE EXCEPTION 'direct supplier capability is not implemented in the current Loadify ingestion runtime: %', v_capability
            USING ERRCODE='23514';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM private.supplier_onboarding_capability_evidence ce
          WHERE ce.supplier_id=NEW.supplier_id
            AND ce.territory=NEW.territory
            AND ce.capability=v_capability
            AND ce.status='verified'
            AND ce.verified_at IS NOT NULL
            AND (ce.expires_at IS NULL OR ce.expires_at>now())
            AND jsonb_array_length(ce.source_refs)>0
        ) THEN
          RAISE EXCEPTION 'current supplier-specific capability evidence is required for active direct supplier adapter: %', v_capability
            USING ERRCODE='23514';
        END IF;
      ELSE
        IF NOT EXISTS (
          SELECT 1
          FROM private.supplier_commerce_provider_capabilities pc
          WHERE pc.provider_key=NEW.provider_key
            AND pc.territory=NEW.territory
            AND pc.capability=v_capability
            AND pc.status='verified'
            AND pc.verified_at IS NOT NULL
            AND pc.reverify_due_at>now()
            AND jsonb_array_length(pc.official_source_refs)>0
        ) THEN
          RAISE EXCEPTION 'current verified provider capability evidence is required for active adapter: %', v_capability
            USING ERRCODE='23514';
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_supplier_adapter_evidence_v1()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.guard_supplier_adapter_evidence_v1() IS
  'Fail-closed adapter activation guard. Direct Supplier adapters require current supplier-specific capability evidence; other providers retain the provider capability register requirement.';

CREATE OR REPLACE FUNCTION public.server_supplier_onboarding_readiness_v1(
  p_actor_id uuid,
  p_supplier_key text,
  p_territory text DEFAULT 'GB'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_profile private.supplier_onboarding_profiles%ROWTYPE;
  v_territory text := upper(BTRIM(COALESCE(p_territory,'GB')));
  v_required text;
  v_missing_qualification text[] := '{}';
  v_missing_capabilities text[] := '{}';
  v_requested_capabilities text[] := '{}';
  v_foundation jsonb;
  v_sla_version integer;
  v_compliance_version integer;
  v_adapter_count integer := 0;
  v_blockers text[] := '{}';
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE='42501';
  END IF;
  IF v_territory !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'territory must be a two-letter country code' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE supplier_key=lower(BTRIM(COALESCE(p_supplier_key,'')))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_not_found',
      'supplierKey',lower(BTRIM(COALESCE(p_supplier_key,''))),
      'territory',v_territory,
      'blockers',jsonb_build_array('supplier_not_found'),
      'catalogIngestionEligible',false,
      'externalMutationPerformed',false,
      'commercialActivationPerformed',false,
      'marketplaceListingPerformed',false,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_onboarding_profiles
  WHERE supplier_id=v_supplier.id;

  IF NOT FOUND THEN
    v_blockers:=array_append(v_blockers,'onboarding_profile_missing');
  ELSE
    v_requested_capabilities:=v_profile.requested_capabilities;
    IF v_profile.onboarding_status<>'approved' THEN
      v_blockers:=array_append(v_blockers,'onboarding_profile_not_approved');
    END IF;
    IF NULLIF(BTRIM(v_profile.commercial_terms_ref),'') IS NULL THEN
      v_blockers:=array_append(v_blockers,'commercial_terms_missing');
    END IF;
    IF NULLIF(BTRIM(v_profile.config_ref),'') IS NULL AND v_profile.feed_transport<>'manual_catalog' THEN
      v_blockers:=array_append(v_blockers,'feed_config_reference_missing');
    END IF;
  END IF;

  FOREACH v_required IN ARRAY ARRAY[
    'identity','business_identity','warehouse_origin','uk_shipping','api_feed_capability',
    'stock_reliability','price_reliability','tracking','returns','documentation','compliance','content_rights'
  ]::text[] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_qualification_evidence q
      WHERE q.supplier_id=v_supplier.id
        AND q.evidence_type=v_required
        AND q.status='verified'
        AND (q.expires_at IS NULL OR q.expires_at>now())
    ) THEN
      v_missing_qualification:=array_append(v_missing_qualification,v_required);
    END IF;
  END LOOP;

  IF cardinality(v_missing_qualification)>0 THEN
    v_blockers:=array_append(v_blockers,'qualification_incomplete');
  END IF;

  SELECT s.version INTO v_sla_version
  FROM private.supplier_sla_versions s
  WHERE s.supplier_id=v_supplier.id
    AND s.status='active'
    AND s.effective_from<=now()
    AND (s.effective_to IS NULL OR s.effective_to>now())
  ORDER BY s.version DESC
  LIMIT 1;
  IF v_sla_version IS NULL THEN
    v_blockers:=array_append(v_blockers,'active_sla_missing');
  END IF;

  SELECT c.version INTO v_compliance_version
  FROM private.supplier_compliance_profiles c
  WHERE c.supplier_id=v_supplier.id
    AND c.territory=v_territory
    AND c.status='approved'
    AND c.risk_class<>'red'
    AND (c.expires_at IS NULL OR c.expires_at>now())
  LIMIT 1;
  IF v_compliance_version IS NULL THEN
    v_blockers:=array_append(v_blockers,'compliance_not_approved');
  END IF;

  FOREACH v_required IN ARRAY ARRAY['catalog','variants','price']::text[] LOOP
    IF NOT (v_required=ANY(v_requested_capabilities)) THEN
      v_missing_capabilities:=array_append(v_missing_capabilities,v_required||':not_requested');
    ELSIF NOT EXISTS (
      SELECT 1
      FROM private.supplier_onboarding_capability_evidence ce
      WHERE ce.supplier_id=v_supplier.id
        AND ce.territory=v_territory
        AND ce.capability=v_required
        AND ce.status='verified'
        AND ce.verified_at IS NOT NULL
        AND (ce.expires_at IS NULL OR ce.expires_at>now())
        AND jsonb_array_length(ce.source_refs)>0
    ) THEN
      v_missing_capabilities:=array_append(v_missing_capabilities,v_required);
    END IF;
  END LOOP;

  IF 'stock'=ANY(v_requested_capabilities) AND NOT EXISTS (
    SELECT 1
    FROM private.supplier_onboarding_capability_evidence ce
    WHERE ce.supplier_id=v_supplier.id
      AND ce.territory=v_territory
      AND ce.capability='stock'
      AND ce.status='verified'
      AND ce.verified_at IS NOT NULL
      AND (ce.expires_at IS NULL OR ce.expires_at>now())
      AND jsonb_array_length(ce.source_refs)>0
  ) THEN
    v_missing_capabilities:=array_append(v_missing_capabilities,'stock');
  END IF;

  IF cardinality(v_missing_capabilities)>0 THEN
    v_blockers:=array_append(v_blockers,'catalog_capability_evidence_incomplete');
  END IF;

  SELECT count(*) INTO v_adapter_count
  FROM private.supplier_adapter_registrations a
  WHERE a.supplier_id=v_supplier.id
    AND a.provider_key='direct_supplier'
    AND a.territory=v_territory
    AND a.status='active'
    AND 'catalog'=ANY(a.capabilities);
  IF v_adapter_count=0 THEN
    v_blockers:=array_append(v_blockers,'active_catalog_adapter_missing');
  END IF;

  v_foundation:=public.server_supplier_foundation_decision_v1(
    v_supplier.supplier_key,
    v_territory,
    'catalog'
  );
  IF COALESCE((v_foundation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_blockers:=array_append(v_blockers,'foundation:'||COALESCE(v_foundation->>'reason','unavailable'));
  END IF;

  RETURN jsonb_build_object(
    'eligible',cardinality(v_blockers)=0,
    'reason',CASE WHEN cardinality(v_blockers)=0 THEN 'catalog_ingestion_ready' ELSE 'onboarding_incomplete' END,
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'lifecycleStatus',v_supplier.lifecycle_status,
    'territory',v_territory,
    'onboardingStatus',CASE WHEN v_profile.supplier_id IS NULL THEN NULL ELSE v_profile.onboarding_status END,
    'feedTransport',CASE WHEN v_profile.supplier_id IS NULL THEN NULL ELSE v_profile.feed_transport END,
    'requestedCapabilities',to_jsonb(v_requested_capabilities),
    'missingQualificationEvidence',to_jsonb(v_missing_qualification),
    'missingCapabilityEvidence',to_jsonb(v_missing_capabilities),
    'activeSlaVersion',v_sla_version,
    'complianceVersion',v_compliance_version,
    'activeCatalogAdapterCount',v_adapter_count,
    'foundation',v_foundation,
    'blockers',to_jsonb(v_blockers),
    'catalogIngestionEligible',cardinality(v_blockers)=0,
    'phaseFPlanAllowed',cardinality(v_blockers)=0,
    'externalMutationPerformed',false,
    'commercialActivationPerformed',false,
    'marketplaceListingPerformed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_onboarding_readiness_v1(uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_onboarding_readiness_v1(uuid,text,text)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_onboarding_readiness_v1(uuid,text,text) IS
  'Admin-only fail-closed Direct Supplier onboarding readiness snapshot. It performs no provider write, commerce activation, order creation or marketplace publication.';
