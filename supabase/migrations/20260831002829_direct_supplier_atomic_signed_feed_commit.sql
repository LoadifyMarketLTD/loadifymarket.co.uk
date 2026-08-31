BEGIN;

CREATE OR REPLACE FUNCTION public.server_commit_direct_supplier_signed_feed_v1(
  p_supplier_key text,
  p_event_id text,
  p_expires_at timestamptz,
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
  v_source_batch_digest text := lower(BTRIM(COALESCE(p_source_batch_digest, '')));
  v_claimed boolean;
  v_persistence jsonb;
  v_existing private.direct_supplier_ingestion_batches%ROWTYPE;
BEGIN
  v_claimed := public.server_direct_supplier_claim_event_v1(
    p_supplier_key,
    p_event_id,
    p_expires_at
  );

  IF NOT v_claimed THEN
    SELECT * INTO v_existing
    FROM private.direct_supplier_ingestion_batches
    WHERE supplier_key = v_supplier_key
      AND source_batch_digest = v_source_batch_digest
      AND status = 'staged'
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'direct supplier replay has no committed staging batch'
        USING ERRCODE = '40001';
    END IF;

    RETURN jsonb_build_object(
      'eventClaimed', false,
      'replayed', true,
      'persisted', false,
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

  v_persistence := public.server_persist_direct_supplier_feed_v1(
    p_supplier_key,
    p_source_generated_at,
    p_source_transport,
    p_source_batch_digest,
    p_candidates,
    p_quarantined
  );

  IF jsonb_typeof(v_persistence) IS DISTINCT FROM 'object'
     OR COALESCE(v_persistence->>'status', '') IS DISTINCT FROM 'staged'
     OR COALESCE((v_persistence->>'commercialActivationPerformed')::boolean, true) IS DISTINCT FROM false
     OR COALESCE((v_persistence->>'capabilityPromotionPerformed')::boolean, true) IS DISTINCT FROM false
     OR COALESCE((v_persistence->>'marketplaceListingPerformed')::boolean, true) IS DISTINCT FROM false
     OR (v_persistence->>'interfaceVersion')::integer IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'direct supplier persistence returned a fail-open or malformed result'
      USING ERRCODE = '22023';
  END IF;

  RETURN v_persistence || jsonb_build_object(
    'eventClaimed', true,
    'replayed', false,
    'persisted', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_commit_direct_supplier_signed_feed_v1(
  text, text, timestamptz, timestamptz, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.server_commit_direct_supplier_signed_feed_v1(
  text, text, timestamptz, timestamptz, text, text, jsonb, jsonb
) TO service_role;

-- Retire the split service-role entry points. The atomic SECURITY DEFINER function
-- above can still call them as their owner, but service-role callers can no longer
-- claim a replay id separately from staging persistence.
REVOKE ALL ON FUNCTION public.server_direct_supplier_claim_event_v1(
  text, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.server_persist_direct_supplier_feed_v1(
  text, timestamptz, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
