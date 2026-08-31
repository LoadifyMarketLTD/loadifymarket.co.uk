BEGIN;

CREATE OR REPLACE FUNCTION public.server_get_direct_supplier_staging_review_v1(
  p_supplier_key text,
  p_source_batch_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier_key text := lower(BTRIM(COALESCE(p_supplier_key, '')));
  v_source_batch_digest text := lower(BTRIM(COALESCE(p_source_batch_digest, '')));
  v_batch private.direct_supplier_ingestion_batches%ROWTYPE;
  v_accepted jsonb;
  v_quarantined jsonb;
  v_accepted_count integer;
  v_quarantined_count integer;
  v_total_count integer;
BEGIN
  IF v_supplier_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$' THEN
    RAISE EXCEPTION 'invalid direct supplier key' USING ERRCODE = '22023';
  END IF;

  IF v_source_batch_digest !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid direct supplier batch digest' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_batch
  FROM private.direct_supplier_ingestion_batches
  WHERE supplier_key = v_supplier_key
    AND source_batch_digest = v_source_batch_digest
    AND status = 'staged'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'direct supplier staged batch not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_batch.contract_version IS DISTINCT FROM 1
     OR v_batch.commercial_activation_performed IS DISTINCT FROM false
     OR v_batch.capability_promotion_performed IS DISTINCT FROM false
     OR v_batch.marketplace_listing_performed IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'direct supplier staged batch violates fail-closed review contract'
      USING ERRCODE = '22023';
  END IF;

  v_total_count := v_batch.accepted_count + v_batch.quarantined_count;
  IF v_total_count > 500 THEN
    RAISE EXCEPTION 'direct supplier staged batch exceeds admin review limit of 500 records'
      USING ERRCODE = '54000';
  END IF;

  SELECT
    count(*)::integer,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'supplierKey', stage.supplier_key,
          'sourceGeneratedAt', stage.source_generated_at,
          'sourceTransport', stage.source_transport,
          'externalProductRef', stage.external_product_ref,
          'externalVariantRef', stage.external_variant_ref,
          'sku', stage.sku,
          'gtin', stage.gtin,
          'title', stage.title,
          'currency', stage.currency,
          'amountMinor', stage.amount_minor,
          'stockQuantity', stage.stock_quantity,
          'warehouseCountry', stage.warehouse_country,
          'imageUrls', stage.image_urls,
          'attributes', stage.attributes,
          'sourceRecordDigest', stage.source_record_digest,
          'ingestionState', stage.ingestion_state,
          'marketplaceListingAllowed', stage.marketplace_listing_allowed
        )
        ORDER BY stage.external_variant_ref, stage.id
      ),
      '[]'::jsonb
    )
  INTO v_accepted_count, v_accepted
  FROM private.direct_supplier_staging_records AS stage
  WHERE stage.batch_id = v_batch.id;

  SELECT
    count(*)::integer,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'index', quarantine.record_index,
          'externalVariantRef', quarantine.external_variant_ref,
          'reasons', to_jsonb(quarantine.reasons)
        )
        ORDER BY quarantine.record_index, quarantine.id
      ),
      '[]'::jsonb
    )
  INTO v_quarantined_count, v_quarantined
  FROM private.direct_supplier_quarantine_records AS quarantine
  WHERE quarantine.batch_id = v_batch.id;

  IF v_accepted_count IS DISTINCT FROM v_batch.accepted_count
     OR v_quarantined_count IS DISTINCT FROM v_batch.quarantined_count THEN
    RAISE EXCEPTION 'direct supplier staged batch record counts are inconsistent'
      USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'interfaceVersion', 1,
    'status', v_batch.status,
    'supplierKey', v_batch.supplier_key,
    'sourceBatchDigest', v_batch.source_batch_digest,
    'sourceGeneratedAt', v_batch.source_generated_at,
    'sourceTransport', v_batch.source_transport,
    'acceptedCount', v_accepted_count,
    'quarantinedCount', v_quarantined_count,
    'accepted', v_accepted,
    'quarantined', v_quarantined,
    'commercialActivationPerformed', false,
    'capabilityPromotionPerformed', false,
    'marketplaceListingPerformed', false,
    'canonicalImportBatchCreationPerformed', false,
    'canonicalIdentityMutationPerformed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_get_direct_supplier_staging_review_v1(text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_get_direct_supplier_staging_review_v1(text, text)
  TO service_role;

COMMENT ON FUNCTION public.server_get_direct_supplier_staging_review_v1(text, text) IS
  'Server-only, read-only Direct Supplier staged batch review surface. Returns sanitized staged/quarantine records for admin review without canonical import/catalog writes, capability promotion, commercial activation or marketplace listing.';

COMMIT;
