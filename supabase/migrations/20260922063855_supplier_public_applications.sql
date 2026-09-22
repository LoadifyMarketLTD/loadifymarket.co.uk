CREATE TABLE IF NOT EXISTS private.supplier_public_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trading_name text,
  registration_country text NOT NULL,
  registration_number text,
  vat_number text,
  website text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  product_categories text[] NOT NULL DEFAULT '{}',
  warehouse_countries text[] NOT NULL DEFAULT '{}',
  fulfilment_territories text[] NOT NULL DEFAULT '{}',
  catalog_methods text[] NOT NULL DEFAULT '{}',
  catalog_size integer,
  direct_dispatch boolean NOT NULL DEFAULT false,
  blind_shipping boolean NOT NULL DEFAULT false,
  tracking_available boolean NOT NULL DEFAULT false,
  returns_supported boolean NOT NULL DEFAULT false,
  dispatch_sla_hours integer,
  stock_refresh_minutes integer,
  price_refresh_minutes integer,
  minimum_order_value numeric(14,2),
  notes text,
  status text NOT NULL DEFAULT 'submitted',
  review_notes text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  converted_supplier_id uuid REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  source text NOT NULL DEFAULT 'public_supplier_application',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_public_application_country_check CHECK (registration_country ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_public_application_warehouse_count_check CHECK (cardinality(warehouse_countries) BETWEEN 1 AND 16),
  CONSTRAINT supplier_public_application_territory_count_check CHECK (cardinality(fulfilment_territories) BETWEEN 1 AND 32),
  CONSTRAINT supplier_public_application_catalog_method_count_check CHECK (cardinality(catalog_methods) BETWEEN 1 AND 8),
  CONSTRAINT supplier_public_application_status_check CHECK (status IN ('submitted','reviewing','contacted','qualified','rejected','converted')),
  CONSTRAINT supplier_public_application_nonnegative_check CHECK (
    COALESCE(catalog_size,0) >= 0
    AND COALESCE(dispatch_sla_hours,0) >= 0
    AND COALESCE(stock_refresh_minutes,0) >= 0
    AND COALESCE(price_refresh_minutes,0) >= 0
    AND COALESCE(minimum_order_value,0) >= 0
  )
);

CREATE INDEX IF NOT EXISTS supplier_public_applications_status_idx
  ON private.supplier_public_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS supplier_public_applications_email_idx
  ON private.supplier_public_applications(lower(contact_email), created_at DESC);
CREATE INDEX IF NOT EXISTS supplier_public_applications_registration_idx
  ON private.supplier_public_applications(registration_country, registration_number)
  WHERE registration_number IS NOT NULL;

REVOKE ALL ON TABLE private.supplier_public_applications
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_submit_supplier_application_v1(
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_payload jsonb := COALESCE(p_payload,'{}'::jsonb);
  v_id uuid;
  v_legal_name text := BTRIM(COALESCE(v_payload->>'legalName',''));
  v_trading_name text := NULLIF(BTRIM(v_payload->>'tradingName'),'');
  v_registration_country text := upper(BTRIM(COALESCE(v_payload->>'registrationCountry','')));
  v_registration_number text := NULLIF(BTRIM(v_payload->>'registrationNumber'),'');
  v_vat_number text := NULLIF(BTRIM(v_payload->>'vatNumber'),'');
  v_website text := NULLIF(BTRIM(v_payload->>'website'),'');
  v_contact_name text := BTRIM(COALESCE(v_payload->>'contactName',''));
  v_contact_email text := lower(BTRIM(COALESCE(v_payload->>'contactEmail','')));
  v_contact_phone text := NULLIF(BTRIM(v_payload->>'contactPhone'),'');
  v_notes text := NULLIF(BTRIM(v_payload->>'notes'),'');
  v_catalog_size integer;
  v_dispatch_sla_hours integer;
  v_stock_refresh_minutes integer;
  v_price_refresh_minutes integer;
  v_minimum_order_value numeric(14,2);
  v_product_categories text[];
  v_warehouse_countries text[];
  v_fulfilment_territories text[];
  v_catalog_methods text[];
BEGIN
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload must be an object' USING ERRCODE='22023';
  END IF;
  IF v_payload ?| ARRAY['password','secret','accessToken','refreshToken','apiKey','credential','cardNumber'] THEN
    RAISE EXCEPTION 'secrets, credentials and payment data are not accepted' USING ERRCODE='22023';
  END IF;
  IF length(v_legal_name) NOT BETWEEN 2 AND 200 THEN
    RAISE EXCEPTION 'valid legalName is required' USING ERRCODE='22023';
  END IF;
  IF v_registration_country !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'registrationCountry must be a two-letter country code' USING ERRCODE='22023';
  END IF;
  IF length(v_contact_name) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'valid contactName is required' USING ERRCODE='22023';
  END IF;
  IF v_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(v_contact_email) > 254 THEN
    RAISE EXCEPTION 'valid contactEmail is required' USING ERRCODE='22023';
  END IF;
  IF v_website IS NOT NULL AND v_website !~ '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'website must use https' USING ERRCODE='22023';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 4000 THEN
    RAISE EXCEPTION 'notes are too long' USING ERRCODE='22023';
  END IF;

  IF jsonb_typeof(COALESCE(v_payload->'productCategories','[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(v_payload->'warehouseCountries','[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(v_payload->'fulfilmentTerritories','[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(v_payload->'catalogMethods','[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'array fields are invalid' USING ERRCODE='22023';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT BTRIM(x)
    FROM jsonb_array_elements_text(COALESCE(v_payload->'productCategories','[]'::jsonb)) x
    WHERE BTRIM(x) <> ''
    LIMIT 32
  ) INTO v_product_categories;
  SELECT ARRAY(
    SELECT DISTINCT upper(BTRIM(x))
    FROM jsonb_array_elements_text(COALESCE(v_payload->'warehouseCountries','[]'::jsonb)) x
    WHERE upper(BTRIM(x)) ~ '^[A-Z]{2}$'
    LIMIT 16
  ) INTO v_warehouse_countries;
  SELECT ARRAY(
    SELECT DISTINCT upper(BTRIM(x))
    FROM jsonb_array_elements_text(COALESCE(v_payload->'fulfilmentTerritories','[]'::jsonb)) x
    WHERE upper(BTRIM(x)) ~ '^[A-Z]{2}$'
    LIMIT 32
  ) INTO v_fulfilment_territories;
  SELECT ARRAY(
    SELECT DISTINCT lower(BTRIM(x))
    FROM jsonb_array_elements_text(COALESCE(v_payload->'catalogMethods','[]'::jsonb)) x
    WHERE lower(BTRIM(x)) IN ('json_api','json_feed','feed_url','csv','xml','sftp','manual_catalog')
    LIMIT 8
  ) INTO v_catalog_methods;

  IF cardinality(v_product_categories) NOT BETWEEN 1 AND 32 THEN
    RAISE EXCEPTION 'at least one product category is required' USING ERRCODE='22023';
  END IF;
  IF cardinality(v_warehouse_countries) NOT BETWEEN 1 AND 16 THEN
    RAISE EXCEPTION 'at least one warehouse country is required' USING ERRCODE='22023';
  END IF;
  IF cardinality(v_fulfilment_territories) NOT BETWEEN 1 AND 32 THEN
    RAISE EXCEPTION 'at least one fulfilment territory is required' USING ERRCODE='22023';
  END IF;
  IF cardinality(v_catalog_methods) NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'at least one supported catalog method is required' USING ERRCODE='22023';
  END IF;

  BEGIN v_catalog_size := NULLIF(v_payload->>'catalogSize','')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'catalogSize must be a non-negative integer' USING ERRCODE='22023';
  END;
  BEGIN v_dispatch_sla_hours := NULLIF(v_payload->>'dispatchSlaHours','')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'dispatchSlaHours must be a non-negative integer' USING ERRCODE='22023';
  END;
  BEGIN v_stock_refresh_minutes := NULLIF(v_payload->>'stockRefreshMinutes','')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'stockRefreshMinutes must be a non-negative integer' USING ERRCODE='22023';
  END;
  BEGIN v_price_refresh_minutes := NULLIF(v_payload->>'priceRefreshMinutes','')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'priceRefreshMinutes must be a non-negative integer' USING ERRCODE='22023';
  END;
  BEGIN v_minimum_order_value := NULLIF(v_payload->>'minimumOrderValue','')::numeric;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'minimumOrderValue must be a non-negative number' USING ERRCODE='22023';
  END;

  IF COALESCE(v_catalog_size,0) < 0
     OR COALESCE(v_dispatch_sla_hours,0) < 0
     OR COALESCE(v_stock_refresh_minutes,0) < 0
     OR COALESCE(v_price_refresh_minutes,0) < 0
     OR COALESCE(v_minimum_order_value,0) < 0 THEN
    RAISE EXCEPTION 'numeric supplier application fields must be non-negative' USING ERRCODE='22023';
  END IF;

  INSERT INTO private.supplier_public_applications(
    legal_name,trading_name,registration_country,registration_number,vat_number,website,
    contact_name,contact_email,contact_phone,product_categories,warehouse_countries,
    fulfilment_territories,catalog_methods,catalog_size,direct_dispatch,blind_shipping,
    tracking_available,returns_supported,dispatch_sla_hours,stock_refresh_minutes,
    price_refresh_minutes,minimum_order_value,notes
  )
  VALUES(
    v_legal_name,v_trading_name,v_registration_country,v_registration_number,v_vat_number,v_website,
    v_contact_name,v_contact_email,v_contact_phone,v_product_categories,v_warehouse_countries,
    v_fulfilment_territories,v_catalog_methods,v_catalog_size,
    COALESCE((v_payload->>'directDispatch')::boolean,false),
    COALESCE((v_payload->>'blindShipping')::boolean,false),
    COALESCE((v_payload->>'trackingAvailable')::boolean,false),
    COALESCE((v_payload->>'returnsSupported')::boolean,false),
    v_dispatch_sla_hours,v_stock_refresh_minutes,v_price_refresh_minutes,v_minimum_order_value,v_notes
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok',true,
    'applicationId',v_id,
    'status','submitted',
    'candidateOnly',true,
    'supplierFoundationMutationPerformed',false,
    'qualificationMutationPerformed',false,
    'commerceActivationPerformed',false,
    'marketplaceListingPerformed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_submit_supplier_application_v1(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_submit_supplier_application_v1(jsonb)
  TO service_role;

COMMENT ON FUNCTION public.server_submit_supplier_application_v1(jsonb) IS
  'Service-role-only public supplier application intake. Creates a candidate application only and never creates Supplier Foundation identity, evidence, commerce activation or listings.';

CREATE OR REPLACE FUNCTION public.server_admin_supplier_application_v1(
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
  v_application_id uuid;
  v_status text;
  v_supplier_id uuid;
  v_application private.supplier_public_applications%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload must be an object' USING ERRCODE='22023';
  END IF;

  IF v_action='list' THEN
    RETURN jsonb_build_object(
      'ok',true,
      'applications',COALESCE((
        SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
        FROM (
          SELECT *
          FROM private.supplier_public_applications
          WHERE NULLIF(BTRIM(v_payload->>'status'),'') IS NULL
             OR status=lower(BTRIM(v_payload->>'status'))
          ORDER BY created_at DESC
          LIMIT LEAST(GREATEST(COALESCE(NULLIF(v_payload->>'limit','')::integer,100),1),200)
        ) a
      ),'[]'::jsonb),
      'interfaceVersion',1
    );
  END IF;

  BEGIN v_application_id := NULLIF(v_payload->>'applicationId','')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'applicationId must be a UUID' USING ERRCODE='22023';
  END;
  IF v_application_id IS NULL THEN
    RAISE EXCEPTION 'applicationId is required' USING ERRCODE='22023';
  END IF;

  IF v_action='get' THEN
    SELECT * INTO v_application FROM private.supplier_public_applications WHERE id=v_application_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'supplier application not found' USING ERRCODE='P0002';
    END IF;
    RETURN jsonb_build_object('ok',true,'application',to_jsonb(v_application),'interfaceVersion',1);
  END IF;

  IF v_action <> 'update' THEN
    RAISE EXCEPTION 'unknown supplier application action' USING ERRCODE='22023';
  END IF;

  v_status := lower(BTRIM(COALESCE(v_payload->>'status','')));
  IF v_status NOT IN ('submitted','reviewing','contacted','qualified','rejected','converted') THEN
    RAISE EXCEPTION 'valid supplier application status is required' USING ERRCODE='22023';
  END IF;

  IF v_status='converted' THEN
    BEGIN v_supplier_id := NULLIF(v_payload->>'convertedSupplierId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'convertedSupplierId must be a UUID' USING ERRCODE='22023';
    END;
    IF v_supplier_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id=v_supplier_id
    ) THEN
      RAISE EXCEPTION 'existing Supplier Foundation identity is required before conversion' USING ERRCODE='23514';
    END IF;
  ELSE
    v_supplier_id := NULL;
  END IF;

  UPDATE private.supplier_public_applications
  SET
    status=v_status,
    review_notes=NULLIF(BTRIM(v_payload->>'reviewNotes'),''),
    reviewed_by=p_actor_id,
    converted_supplier_id=v_supplier_id,
    updated_at=now()
  WHERE id=v_application_id
  RETURNING * INTO v_application;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier application not found' USING ERRCODE='P0002';
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'application',to_jsonb(v_application),
    'supplierFoundationMutationPerformed',false,
    'commerceActivationPerformed',false,
    'marketplaceListingPerformed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_application_v1(uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_application_v1(uuid,text,jsonb)
  TO service_role;

COMMENT ON FUNCTION public.server_admin_supplier_application_v1(uuid,text,jsonb) IS
  'Admin-only review queue for public supplier applications. Status updates never create or mutate Supplier Foundation identities or commerce.';
