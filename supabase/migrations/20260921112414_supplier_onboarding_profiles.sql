CREATE TABLE IF NOT EXISTS private.supplier_onboarding_profiles (
  supplier_id uuid PRIMARY KEY REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  source_class text NOT NULL,
  feed_transport text NOT NULL,
  config_ref text,
  supported_territories text[] NOT NULL DEFAULT '{}',
  requested_capabilities text[] NOT NULL DEFAULT '{}',
  commercial_terms_ref text,
  currency text,
  payment_terms_days integer,
  minimum_order_value numeric(14,2),
  dispatch_sla_hours integer,
  return_window_days integer,
  catalog_refresh_minutes integer,
  stock_refresh_minutes integer,
  price_refresh_minutes integer,
  onboarding_status text NOT NULL DEFAULT 'draft',
  review_reason text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_onboarding_source_class_check CHECK (source_class IN ('direct_supplier','supplier_aggregator','wholesale_feed')),
  CONSTRAINT supplier_onboarding_transport_check CHECK (feed_transport IN ('json_api','json_feed','csv','xml','sftp','manual_catalog')),
  CONSTRAINT supplier_onboarding_status_check CHECK (onboarding_status IN ('draft','qualification','ready_for_review','approved','blocked')),
  CONSTRAINT supplier_onboarding_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$')
);
ALTER TABLE private.supplier_onboarding_profiles
  DROP CONSTRAINT IF EXISTS supplier_onboarding_capabilities_check;
ALTER TABLE private.supplier_onboarding_profiles
  ADD CONSTRAINT supplier_onboarding_capabilities_check CHECK (
    requested_capabilities <@ ARRAY[
      'supplier_identity','catalog','variants','stock','price','shipping',
      'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement'
    ]::text[]
  );
ALTER TABLE private.supplier_onboarding_profiles
  DROP CONSTRAINT IF EXISTS supplier_onboarding_territory_count_check;
ALTER TABLE private.supplier_onboarding_profiles
  ADD CONSTRAINT supplier_onboarding_territory_count_check
  CHECK (cardinality(supported_territories) BETWEEN 1 AND 32);
ALTER TABLE private.supplier_onboarding_profiles
  DROP CONSTRAINT IF EXISTS supplier_onboarding_nonnegative_terms_check;
ALTER TABLE private.supplier_onboarding_profiles
  ADD CONSTRAINT supplier_onboarding_nonnegative_terms_check CHECK (
    COALESCE(payment_terms_days,0) >= 0 AND COALESCE(minimum_order_value,0) >= 0
    AND COALESCE(dispatch_sla_hours,0) >= 0 AND COALESCE(return_window_days,0) >= 0
    AND COALESCE(catalog_refresh_minutes,0) >= 0 AND COALESCE(stock_refresh_minutes,0) >= 0
    AND COALESCE(price_refresh_minutes,0) >= 0
  );
CREATE INDEX IF NOT EXISTS supplier_onboarding_status_idx
  ON private.supplier_onboarding_profiles(onboarding_status, source_class, updated_at DESC);
REVOKE ALL ON TABLE private.supplier_onboarding_profiles FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.server_admin_supplier_onboarding_v1(
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
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_profile private.supplier_onboarding_profiles%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
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
  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'supplierId is required' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=v_supplier_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier not found' USING ERRCODE='P0002';
  END IF;

  IF v_action='get' THEN
    SELECT * INTO v_profile FROM private.supplier_onboarding_profiles WHERE supplier_id=v_supplier_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok',true,'supplierId',v_supplier_id,'profile',NULL,'interfaceVersion',1);
    END IF;
    RETURN jsonb_build_object('ok',true,'supplierId',v_supplier_id,'profile',to_jsonb(v_profile),'interfaceVersion',1);
  END IF;

  IF v_action <> 'upsert' THEN
    RAISE EXCEPTION 'unknown supplier onboarding action' USING ERRCODE='22023';
  END IF;
  IF COALESCE(v_payload->>'sourceClass','') NOT IN ('direct_supplier','supplier_aggregator','wholesale_feed') THEN
    RAISE EXCEPTION 'valid sourceClass is required' USING ERRCODE='22023';
  END IF;
  IF COALESCE(v_payload->>'feedTransport','') NOT IN ('json_api','json_feed','csv','xml','sftp','manual_catalog') THEN
    RAISE EXCEPTION 'valid feedTransport is required' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(COALESCE(v_payload->'supportedTerritories','[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'supportedTerritories must be an array' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(COALESCE(v_payload->'supportedTerritories','[]'::jsonb)) NOT BETWEEN 1 AND 32
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_payload->'supportedTerritories','[]'::jsonb)) x
       WHERE upper(BTRIM(x)) !~ '^[A-Z]{2}$'
     ) THEN
    RAISE EXCEPTION 'supportedTerritories must contain 1 to 32 two-letter country codes' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(COALESCE(v_payload->'requestedCapabilities','[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'requestedCapabilities must be an array' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_payload->'requestedCapabilities','[]'::jsonb)) x
    WHERE lower(BTRIM(x)) NOT IN ('supplier_identity','catalog','variants','stock','price','shipping','order_submission','acknowledgement','tracking','cancellation','returns','reimbursement')
  ) THEN
    RAISE EXCEPTION 'requestedCapabilities contains an unsupported capability' USING ERRCODE='22023';
  END IF;
  IF COALESCE(v_payload->>'onboardingStatus','draft')='approved' AND v_supplier.lifecycle_status <> 'approved' THEN
    RAISE EXCEPTION 'supplier foundation approval is required before onboarding approval' USING ERRCODE='23514';
  END IF;
  IF COALESCE(v_payload->>'onboardingStatus','draft')='approved'
     AND NULLIF(BTRIM(v_payload->>'commercialTermsRef'),'') IS NULL THEN
    RAISE EXCEPTION 'commercialTermsRef is required before onboarding approval' USING ERRCODE='23514';
  END IF;
  IF length(COALESCE(v_payload->>'configRef','')) > 512
     OR COALESCE(v_payload->>'configRef','') ~ E'[\r\n]' THEN
    RAISE EXCEPTION 'configRef must be a short server-side configuration reference' USING ERRCODE='22023';
  END IF;

  INSERT INTO private.supplier_onboarding_profiles(
    supplier_id,source_class,feed_transport,config_ref,supported_territories,requested_capabilities,
    commercial_terms_ref,currency,payment_terms_days,minimum_order_value,dispatch_sla_hours,
    return_window_days,catalog_refresh_minutes,stock_refresh_minutes,price_refresh_minutes,
    onboarding_status,review_reason,created_by,updated_by
  )
  VALUES(
    v_supplier_id, v_payload->>'sourceClass', v_payload->>'feedTransport',
    NULLIF(BTRIM(v_payload->>'configRef'),''),
    ARRAY(SELECT upper(BTRIM(x)) FROM jsonb_array_elements_text(COALESCE(v_payload->'supportedTerritories','[]'::jsonb)) x),
    ARRAY(SELECT lower(BTRIM(x)) FROM jsonb_array_elements_text(COALESCE(v_payload->'requestedCapabilities','[]'::jsonb)) x),
    NULLIF(BTRIM(v_payload->>'commercialTermsRef'),''),
    NULLIF(upper(BTRIM(v_payload->>'currency')),''),
    NULLIF(v_payload->>'paymentTermsDays','')::integer,
    NULLIF(v_payload->>'minimumOrderValue','')::numeric,
    NULLIF(v_payload->>'dispatchSlaHours','')::integer,
    NULLIF(v_payload->>'returnWindowDays','')::integer,
    NULLIF(v_payload->>'catalogRefreshMinutes','')::integer,
    NULLIF(v_payload->>'stockRefreshMinutes','')::integer,
    NULLIF(v_payload->>'priceRefreshMinutes','')::integer,
    lower(BTRIM(COALESCE(v_payload->>'onboardingStatus','draft'))),
    NULLIF(BTRIM(v_payload->>'reviewReason'),''),
    p_actor_id,p_actor_id
  )
  ON CONFLICT (supplier_id) DO UPDATE SET
    source_class=EXCLUDED.source_class,feed_transport=EXCLUDED.feed_transport,config_ref=EXCLUDED.config_ref,
    supported_territories=EXCLUDED.supported_territories,requested_capabilities=EXCLUDED.requested_capabilities,
    commercial_terms_ref=EXCLUDED.commercial_terms_ref,currency=EXCLUDED.currency,
    payment_terms_days=EXCLUDED.payment_terms_days,minimum_order_value=EXCLUDED.minimum_order_value,
    dispatch_sla_hours=EXCLUDED.dispatch_sla_hours,return_window_days=EXCLUDED.return_window_days,
    catalog_refresh_minutes=EXCLUDED.catalog_refresh_minutes,stock_refresh_minutes=EXCLUDED.stock_refresh_minutes,
    price_refresh_minutes=EXCLUDED.price_refresh_minutes,onboarding_status=EXCLUDED.onboarding_status,
    review_reason=EXCLUDED.review_reason,updated_by=p_actor_id,updated_at=now()
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'ok',true,
    'supplierId',v_supplier_id,
    'profile',to_jsonb(v_profile),
    'activationChanged',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_onboarding_v1(uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_onboarding_v1(uuid,text,jsonb)
  TO service_role;
COMMENT ON FUNCTION public.server_admin_supplier_onboarding_v1(uuid,text,jsonb) IS
  'Admin-only provider-neutral supplier onboarding dossier. Stores non-secret source/commercial configuration and never activates commerce.';

