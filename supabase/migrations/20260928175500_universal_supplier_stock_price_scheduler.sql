-- Universal provider-neutral scheduled stock/price target selector.
-- Does not call suppliers, publish products, enable checkout or mutate buyer-facing truth.

CREATE OR REPLACE FUNCTION public.server_supplier_stock_price_sync_due_v1(
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY due_rank, offer_key), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      jsonb_build_object(
        'supplierId', s.id,
        'supplierKey', s.supplier_key,
        'supplierOfferId', o.id,
        'offerKey', o.offer_key,
        'canonicalProductId', o.canonical_product_id,
        'territory', o.territory,
        'externalVariantRefs', jsonb_build_array(COALESCE(ci.external_variant_ref,'')),
        'stockMaxAgeSeconds', p.stock_max_age_seconds,
        'priceMaxAgeSeconds', p.price_max_age_seconds,
        'lastStockObservedAt', ls.last_observed_at,
        'lastStockQuantity', ls.last_quantity,
        'lastPriceObservedAt', lp.last_observed_at,
        'lastPriceMinor', lp.last_amount_minor,
        'lastPriceCurrency', lp.last_currency
      ) AS row_data,
      LEAST(
        COALESCE(ls.last_observed_at, '-infinity'::timestamptz)
          + make_interval(secs => p.stock_max_age_seconds),
        COALESCE(lp.last_observed_at, '-infinity'::timestamptz)
          + make_interval(secs => p.price_max_age_seconds)
      ) AS due_rank,
      o.offer_key
    FROM private.supplier_offers o
    JOIN private.supplier_foundation_suppliers s ON s.id=o.supplier_id
    JOIN private.supplier_catalog_items ci ON ci.id=o.supplier_catalog_item_id
    JOIN private.supplier_offer_sync_policies p
      ON p.supplier_offer_id=o.id AND p.status='approved'
    JOIN private.supplier_integration_profiles stock_profile
      ON stock_profile.supplier_id=o.supplier_id
     AND stock_profile.territory=o.territory
     AND stock_profile.capability='stock'
     AND stock_profile.status='verified'
     AND stock_profile.execution_mode='automated_read'
     AND stock_profile.transport IN ('http_rest','graphql')
     AND NULLIF(BTRIM(stock_profile.config_ref),'') IS NOT NULL
    JOIN private.supplier_integration_profiles price_profile
      ON price_profile.supplier_id=o.supplier_id
     AND price_profile.territory=o.territory
     AND price_profile.capability='price'
     AND price_profile.status='verified'
     AND price_profile.execution_mode='automated_read'
     AND price_profile.transport IN ('http_rest','graphql')
     AND NULLIF(BTRIM(price_profile.config_ref),'') IS NOT NULL
    LEFT JOIN LATERAL (
      SELECT so.observed_at AS last_observed_at, so.quantity AS last_quantity
      FROM private.supplier_stock_observations so
      WHERE so.supplier_offer_id=o.id
        AND so.external_variant_ref=COALESCE(ci.external_variant_ref,'')
      ORDER BY so.observed_at DESC, so.received_at DESC
      LIMIT 1
    ) ls ON true
    LEFT JOIN LATERAL (
      SELECT po.observed_at AS last_observed_at, po.amount_minor AS last_amount_minor, po.currency AS last_currency
      FROM private.supplier_price_observations po
      WHERE po.supplier_offer_id=o.id
        AND po.external_variant_ref=COALESCE(ci.external_variant_ref,'')
      ORDER BY po.observed_at DESC, po.received_at DESC
      LIMIT 1
    ) lp ON true
    WHERE o.status='approved'
      AND s.lifecycle_status='approved'
      AND ci.status='linked'
      AND (
        ls.last_observed_at IS NULL
        OR ls.last_observed_at + make_interval(secs => p.stock_max_age_seconds) <= now()
        OR lp.last_observed_at IS NULL
        OR lp.last_observed_at + make_interval(secs => p.price_max_age_seconds) <= now()
      )
    ORDER BY due_rank, o.offer_key
    LIMIT LEAST(GREATEST(COALESCE(p_limit,20),1),50)
  ) q;

  RETURN jsonb_build_object(
    'targets', v_rows,
    'count', jsonb_array_length(v_rows),
    'externalMutationPerformed', false,
    'marketplacePublicationPerformed', false,
    'checkoutMutationPerformed', false,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_stock_price_sync_due_v1(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_stock_price_sync_due_v1(integer)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_stock_price_sync_due_v1(integer) IS
  'Provider-neutral selector for approved supplier offers whose verified automated-read stock/price bindings are due. It performs no external call and no commerce activation.';
