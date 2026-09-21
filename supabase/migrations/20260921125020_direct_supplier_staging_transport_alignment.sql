ALTER TABLE private.direct_supplier_ingestion_batches
  DROP CONSTRAINT IF EXISTS direct_supplier_batch_transport_check;
ALTER TABLE private.direct_supplier_ingestion_batches
  ADD CONSTRAINT direct_supplier_batch_transport_check
  CHECK (source_transport IN ('json_api','json_feed','feed_url','csv','xml','sftp','manual_catalog'));

ALTER TABLE private.direct_supplier_staging_records
  DROP CONSTRAINT IF EXISTS direct_supplier_stage_transport_check;
ALTER TABLE private.direct_supplier_staging_records
  ADD CONSTRAINT direct_supplier_stage_transport_check
  CHECK (source_transport IN ('json_api','json_feed','feed_url','csv','xml','sftp','manual_catalog'));
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
  IF v_source_transport NOT IN ('json_api','json_feed','feed_url','csv','xml','sftp','manual_catalog') THEN
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
COMMENT ON FUNCTION public.server_persist_direct_supplier_feed_v1(text, timestamptz, text, text, jsonb, jsonb) IS
  'Service-role-only atomic persistence of already-admitted Direct Supplier feed candidates and quarantine metadata across provider-neutral transports. No activation, capability promotion or listing.';