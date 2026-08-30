BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.direct_supplier_replay_claims (
  supplier_key text NOT NULL,
  event_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (supplier_key, event_id),
  CONSTRAINT direct_supplier_replay_supplier_key_check
    CHECK (supplier_key = lower(BTRIM(supplier_key)) AND supplier_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  CONSTRAINT direct_supplier_replay_event_id_check
    CHECK (event_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$')
);

CREATE INDEX IF NOT EXISTS direct_supplier_replay_expiry_idx
  ON private.direct_supplier_replay_claims(expires_at);

CREATE TABLE IF NOT EXISTS private.direct_supplier_ingestion_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_key text NOT NULL,
  contract_version integer NOT NULL DEFAULT 1,
  source_generated_at timestamptz NOT NULL,
  source_transport text NOT NULL,
  source_batch_digest text NOT NULL,
  accepted_count integer NOT NULL DEFAULT 0,
  quarantined_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'staging',
  commercial_activation_performed boolean NOT NULL DEFAULT false,
  capability_promotion_performed boolean NOT NULL DEFAULT false,
  marketplace_listing_performed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  staged_at timestamptz,
  CONSTRAINT direct_supplier_batch_supplier_key_check
    CHECK (supplier_key = lower(BTRIM(supplier_key)) AND supplier_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  CONSTRAINT direct_supplier_batch_contract_version_check CHECK (contract_version = 1),
  CONSTRAINT direct_supplier_batch_transport_check
    CHECK (source_transport IN ('json_api','json_feed','csv','xml','sftp')),
  CONSTRAINT direct_supplier_batch_digest_check
    CHECK (source_batch_digest = lower(source_batch_digest) AND source_batch_digest ~ '^[a-f0-9]{64}$'),
  CONSTRAINT direct_supplier_batch_counts_check
    CHECK (accepted_count >= 0 AND quarantined_count >= 0),
  CONSTRAINT direct_supplier_batch_status_check
    CHECK (status IN ('staging','staged')),
  CONSTRAINT direct_supplier_batch_fail_closed_check
    CHECK (
      commercial_activation_performed = false
      AND capability_promotion_performed = false
      AND marketplace_listing_performed = false
    ),
  CONSTRAINT direct_supplier_batch_staged_at_check
    CHECK ((status = 'staged' AND staged_at IS NOT NULL) OR (status = 'staging' AND staged_at IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS direct_supplier_batch_digest_unique
  ON private.direct_supplier_ingestion_batches(supplier_key, source_batch_digest);
CREATE INDEX IF NOT EXISTS direct_supplier_batch_supplier_created_idx
  ON private.direct_supplier_ingestion_batches(supplier_key, created_at DESC);

CREATE TABLE IF NOT EXISTS private.direct_supplier_staging_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES private.direct_supplier_ingestion_batches(id) ON DELETE RESTRICT,
  supplier_key text NOT NULL,
  source_generated_at timestamptz NOT NULL,
  source_transport text NOT NULL,
  external_product_ref text NOT NULL,
  external_variant_ref text NOT NULL,
  sku text,
  gtin text,
  title text NOT NULL,
  currency text NOT NULL,
  amount_minor bigint NOT NULL,
  stock_quantity bigint,
  warehouse_country text NOT NULL,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_record_digest text NOT NULL,
  ingestion_state text NOT NULL DEFAULT 'staged_candidate',
  marketplace_listing_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_supplier_stage_supplier_key_check
    CHECK (supplier_key = lower(BTRIM(supplier_key)) AND supplier_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  CONSTRAINT direct_supplier_stage_transport_check
    CHECK (source_transport IN ('json_api','json_feed','csv','xml','sftp')),
  CONSTRAINT direct_supplier_stage_product_ref_check
    CHECK (NULLIF(BTRIM(external_product_ref),'') IS NOT NULL AND length(external_product_ref) <= 256),
  CONSTRAINT direct_supplier_stage_variant_ref_check
    CHECK (NULLIF(BTRIM(external_variant_ref),'') IS NOT NULL AND length(external_variant_ref) <= 256),
  CONSTRAINT direct_supplier_stage_title_check
    CHECK (NULLIF(BTRIM(title),'') IS NOT NULL AND length(title) <= 512),
  CONSTRAINT direct_supplier_stage_currency_check
    CHECK (currency = upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT direct_supplier_stage_amount_check
    CHECK (amount_minor >= 0 AND amount_minor <= 9007199254740991),
  CONSTRAINT direct_supplier_stage_stock_check
    CHECK (stock_quantity IS NULL OR (stock_quantity >= 0 AND stock_quantity <= 9007199254740991)),
  CONSTRAINT direct_supplier_stage_country_check
    CHECK (warehouse_country = upper(BTRIM(warehouse_country)) AND warehouse_country ~ '^[A-Z]{2}$'),
  CONSTRAINT direct_supplier_stage_images_check
    CHECK (jsonb_typeof(image_urls) = 'array' AND jsonb_array_length(image_urls) <= 12),
  CONSTRAINT direct_supplier_stage_attributes_check
    CHECK (jsonb_typeof(attributes) = 'object'),
  CONSTRAINT direct_supplier_stage_digest_check
    CHECK (source_record_digest = lower(source_record_digest) AND source_record_digest ~ '^[a-f0-9]{64}$'),
  CONSTRAINT direct_supplier_stage_state_check CHECK (ingestion_state = 'staged_candidate'),
  CONSTRAINT direct_supplier_stage_listing_check CHECK (marketplace_listing_allowed = false)
);

CREATE UNIQUE INDEX IF NOT EXISTS direct_supplier_stage_batch_variant_unique
  ON private.direct_supplier_staging_records(batch_id, external_variant_ref);
CREATE INDEX IF NOT EXISTS direct_supplier_stage_supplier_variant_idx
  ON private.direct_supplier_staging_records(supplier_key, external_variant_ref, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_supplier_stage_digest_idx
  ON private.direct_supplier_staging_records(supplier_key, source_record_digest);

CREATE TABLE IF NOT EXISTS private.direct_supplier_quarantine_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES private.direct_supplier_ingestion_batches(id) ON DELETE RESTRICT,
  record_index integer NOT NULL,
  external_variant_ref text,
  reasons text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_supplier_quarantine_index_check CHECK (record_index >= 0),
  CONSTRAINT direct_supplier_quarantine_variant_ref_check
    CHECK (external_variant_ref IS NULL OR (NULLIF(BTRIM(external_variant_ref),'') IS NOT NULL AND length(external_variant_ref) <= 256)),
  CONSTRAINT direct_supplier_quarantine_reasons_check
    CHECK (
      cardinality(reasons) > 0
      AND reasons <@ ARRAY[
        'DUPLICATE_EXTERNAL_VARIANT_REF',
        'UNDECLARED_WAREHOUSE_COUNTRY',
        'INVALID_IMAGE_URL',
        'TOO_MANY_IMAGES',
        'TOO_MANY_ATTRIBUTES',
        'INVALID_ATTRIBUTE',
        'REF_TOO_LONG',
        'TITLE_TOO_LONG'
      ]::text[]
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS direct_supplier_quarantine_batch_index_unique
  ON private.direct_supplier_quarantine_records(batch_id, record_index);
CREATE INDEX IF NOT EXISTS direct_supplier_quarantine_batch_idx
  ON private.direct_supplier_quarantine_records(batch_id, created_at);

ALTER TABLE private.direct_supplier_replay_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.direct_supplier_ingestion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.direct_supplier_staging_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.direct_supplier_quarantine_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.direct_supplier_replay_claims FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.direct_supplier_ingestion_batches FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.direct_supplier_staging_records FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.direct_supplier_quarantine_records FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_direct_supplier_claim_event_v1(
  p_supplier_key text,
  p_event_id text,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier_key text := lower(BTRIM(COALESCE(p_supplier_key, '')));
  v_event_id text := BTRIM(COALESCE(p_event_id, ''));
  v_claimed boolean := false;
BEGIN
  IF v_supplier_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$' THEN
    RAISE EXCEPTION 'invalid direct supplier key' USING ERRCODE = '22023';
  END IF;
  IF v_event_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION 'invalid direct supplier event id' USING ERRCODE = '22023';
  END IF;
  IF p_expires_at IS NULL
     OR p_expires_at < now() - interval '1 second'
     OR p_expires_at > now() + interval '8 days' THEN
    RAISE EXCEPTION 'invalid direct supplier replay expiry' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.direct_supplier_replay_claims AS existing (
    supplier_key,
    event_id,
    expires_at
  ) VALUES (
    v_supplier_key,
    v_event_id,
    p_expires_at
  )
  ON CONFLICT (supplier_key, event_id)
  DO UPDATE SET
    expires_at = EXCLUDED.expires_at,
    claimed_at = now()
  WHERE existing.expires_at <= now()
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.server_direct_supplier_claim_event_v1(text, text, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_direct_supplier_claim_event_v1(text, text, timestamptz)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_persist_direct_supplier_feed_v1(
  p_supplier_key text,
  p_source_generated_at timestamptz,
  p_source_transport text,
  p_source_batch_digest text,
  p_candidates jsonb,
  p_quarantined jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier_key text := lower(BTRIM(COALESCE(p_supplier_key, '')));
  v_source_transport text := BTRIM(COALESCE(p_source_transport, ''));
  v_source_batch_digest text := lower(BTRIM(COALESCE(p_source_batch_digest, '')));
  v_batch_id uuid;
  v_existing private.direct_supplier_ingestion_batches%ROWTYPE;
  v_candidate jsonb;
  v_quarantine jsonb;
  v_reasons text[];
  v_accepted_count integer;
  v_quarantined_count integer;
BEGIN
  IF v_supplier_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$' THEN
    RAISE EXCEPTION 'invalid direct supplier key' USING ERRCODE = '22023';
  END IF;
  IF p_source_generated_at IS NULL THEN
    RAISE EXCEPTION 'source generated timestamp is required' USING ERRCODE = '22023';
  END IF;
  IF v_source_transport NOT IN ('json_api','json_feed','csv','xml','sftp') THEN
    RAISE EXCEPTION 'unsupported direct supplier transport' USING ERRCODE = '22023';
  END IF;
  IF v_source_batch_digest !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid direct supplier batch digest' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_candidates) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_quarantined) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'direct supplier persistence payloads must be arrays' USING ERRCODE = '22023';
  END IF;

  v_accepted_count := jsonb_array_length(p_candidates);
  v_quarantined_count := jsonb_array_length(p_quarantined);

  INSERT INTO private.direct_supplier_ingestion_batches (
    supplier_key,
    source_generated_at,
    source_transport,
    source_batch_digest,
    accepted_count,
    quarantined_count
  ) VALUES (
    v_supplier_key,
    p_source_generated_at,
    v_source_transport,
    v_source_batch_digest,
    v_accepted_count,
    v_quarantined_count
  )
  ON CONFLICT (supplier_key, source_batch_digest) DO NOTHING
  RETURNING id INTO v_batch_id;

  IF v_batch_id IS NULL THEN
    SELECT * INTO v_existing
    FROM private.direct_supplier_ingestion_batches
    WHERE supplier_key = v_supplier_key
      AND source_batch_digest = v_source_batch_digest
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'direct supplier duplicate batch resolution failed' USING ERRCODE = '40001';
    END IF;

    RETURN jsonb_build_object(
      'batchId', v_existing.id,
      'duplicate', true,
      'status', v_existing.status,
      'acceptedCount', v_existing.accepted_count,
      'quarantinedCount', v_existing.quarantined_count,
      'commercialActivationPerformed', false,
      'capabilityPromotionPerformed', false,
      'marketplaceListingPerformed', false,
      'interfaceVersion', 1
    );
  END IF;

  FOR v_candidate IN
    SELECT value FROM jsonb_array_elements(p_candidates)
  LOOP
    IF jsonb_typeof(v_candidate) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'direct supplier staging candidate must be an object' USING ERRCODE = '22023';
    END IF;
    IF lower(BTRIM(COALESCE(v_candidate->>'supplierKey', ''))) IS DISTINCT FROM v_supplier_key
       OR (v_candidate->>'sourceGeneratedAt')::timestamptz IS DISTINCT FROM p_source_generated_at
       OR BTRIM(COALESCE(v_candidate->>'sourceTransport', '')) IS DISTINCT FROM v_source_transport
       OR COALESCE(v_candidate->>'ingestionState', '') IS DISTINCT FROM 'staged_candidate'
       OR COALESCE((v_candidate->>'marketplaceListingAllowed')::boolean, true) IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'direct supplier staging candidate metadata mismatch' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(COALESCE(v_candidate->'imageUrls', '[]'::jsonb)) IS DISTINCT FROM 'array'
       OR jsonb_typeof(COALESCE(v_candidate->'attributes', '{}'::jsonb)) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'direct supplier staging candidate structured fields are invalid' USING ERRCODE = '22023';
    END IF;

    INSERT INTO private.direct_supplier_staging_records (
      batch_id,
      supplier_key,
      source_generated_at,
      source_transport,
      external_product_ref,
      external_variant_ref,
      sku,
      gtin,
      title,
      currency,
      amount_minor,
      stock_quantity,
      warehouse_country,
      image_urls,
      attributes,
      source_record_digest,
      ingestion_state,
      marketplace_listing_allowed
    ) VALUES (
      v_batch_id,
      v_supplier_key,
      p_source_generated_at,
      v_source_transport,
      BTRIM(COALESCE(v_candidate->>'externalProductRef', '')),
      BTRIM(COALESCE(v_candidate->>'externalVariantRef', '')),
      NULLIF(BTRIM(v_candidate->>'sku'), ''),
      NULLIF(BTRIM(v_candidate->>'gtin'), ''),
      BTRIM(COALESCE(v_candidate->>'title', '')),
      upper(BTRIM(COALESCE(v_candidate->>'currency', ''))),
      (v_candidate->>'amountMinor')::bigint,
      CASE
        WHEN v_candidate ? 'stockQuantity' AND v_candidate->'stockQuantity' <> 'null'::jsonb
          THEN (v_candidate->>'stockQuantity')::bigint
        ELSE NULL
      END,
      upper(BTRIM(COALESCE(v_candidate->>'warehouseCountry', ''))),
      COALESCE(v_candidate->'imageUrls', '[]'::jsonb),
      COALESCE(v_candidate->'attributes', '{}'::jsonb),
      lower(BTRIM(COALESCE(v_candidate->>'sourceRecordDigest', ''))),
      'staged_candidate',
      false
    );
  END LOOP;

  FOR v_quarantine IN
    SELECT value FROM jsonb_array_elements(p_quarantined)
  LOOP
    IF jsonb_typeof(v_quarantine) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_quarantine->'reasons') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'direct supplier quarantine record is invalid' USING ERRCODE = '22023';
    END IF;

    SELECT ARRAY(
      SELECT jsonb_array_elements_text(v_quarantine->'reasons')
    ) INTO v_reasons;

    INSERT INTO private.direct_supplier_quarantine_records (
      batch_id,
      record_index,
      external_variant_ref,
      reasons
    ) VALUES (
      v_batch_id,
      (v_quarantine->>'index')::integer,
      NULLIF(BTRIM(v_quarantine->>'externalVariantRef'), ''),
      v_reasons
    );
  END LOOP;

  UPDATE private.direct_supplier_ingestion_batches
  SET status = 'staged', staged_at = now()
  WHERE id = v_batch_id;

  RETURN jsonb_build_object(
    'batchId', v_batch_id,
    'duplicate', false,
    'status', 'staged',
    'acceptedCount', v_accepted_count,
    'quarantinedCount', v_quarantined_count,
    'commercialActivationPerformed', false,
    'capabilityPromotionPerformed', false,
    'marketplaceListingPerformed', false,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_persist_direct_supplier_feed_v1(text, timestamptz, text, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_persist_direct_supplier_feed_v1(text, timestamptz, text, text, jsonb, jsonb)
  TO service_role;

COMMENT ON TABLE private.direct_supplier_replay_claims IS
  'Server-only durable replay boundary for signed Direct Supplier webhook events. No customer PII, payload body or supplier secrets are stored.';
COMMENT ON TABLE private.direct_supplier_ingestion_batches IS
  'Server-only pre-import Direct Supplier feed batches. Staging does not activate suppliers, promote capabilities or publish marketplace listings.';
COMMENT ON TABLE private.direct_supplier_staging_records IS
  'Sanitized Direct Supplier staged candidates only. Promotion into canonical Supplier Commerce remains a separate gated workflow.';
COMMENT ON TABLE private.direct_supplier_quarantine_records IS
  'Sanitized Direct Supplier quarantine metadata only; raw rejected provider payloads are intentionally not persisted.';
COMMENT ON FUNCTION public.server_direct_supplier_claim_event_v1(text, text, timestamptz) IS
  'Service-role-only atomic replay claim for Direct Supplier signed webhook events.';
COMMENT ON FUNCTION public.server_persist_direct_supplier_feed_v1(text, timestamptz, text, text, jsonb, jsonb) IS
  'Service-role-only atomic persistence of already-admitted Direct Supplier feed candidates and quarantine metadata. No activation, capability promotion or listing.';

COMMIT;
