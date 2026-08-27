-- 679_supplier_checkout_consolidation.sql
-- E2E remediation Stage 4A: buyer-facing supplier listing -> canonical checkout decision.
--
-- This migration does not enable checkout. It consolidates the Stage 3 public listing
-- projection with the existing Supplier Commerce checkout/stock/price/economics guard
-- and repairs controlled-pilot scope propagation. No payment or reservation is created.

-- The Phase H checkout guard originally omitted supplierRef from the control scope.
-- Controlled Pilot requires supplier scope, so keep the same RPC contract but close that
-- identity seam before the web/mobile checkout endpoints consume it.
CREATE OR REPLACE FUNCTION public.server_supplier_offer_checkout_guard_v1(
  p_supplier_offer_id uuid,
  p_canonical_product_id uuid,
  p_commercial_mode text,
  p_territory text DEFAULT 'GB',
  p_external_variant_ref text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_offer private.supplier_offers%ROWTYPE;
  v_control jsonb;
  v_sync jsonb;
BEGIN
  SELECT * INTO v_offer
    FROM private.supplier_offers
   WHERE id=p_supplier_offer_id
     AND canonical_product_id=p_canonical_product_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_linked','interfaceVersion',1);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1(
    'checkout',
    jsonb_build_object(
      'supplierRef',v_offer.supplier_id::text,
      'offerRef',v_offer.id::text,
      'productRef',p_canonical_product_id::text,
      'territory',upper(BTRIM(COALESCE(p_territory,'GB')))
    )
  );
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','checkout_control_disabled','control',v_control,'interfaceVersion',1
    );
  END IF;

  v_sync:=public.server_supplier_stock_price_decision_v1(
    p_supplier_offer_id,p_canonical_product_id,p_commercial_mode,p_territory,p_external_variant_ref
  );
  IF COALESCE((v_sync->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','stock_price_not_ready','sync',v_sync,'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_offer_checkout_ready','control',v_control,
    'sync',v_sync,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_offer_checkout_guard_v1(uuid,uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_offer_checkout_guard_v1(uuid,uuid,text,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_listing_checkout_decision_v1(
  p_public_product_id uuid,
  p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_projection private.supplier_listing_projections%ROWTYPE;
  v_link private.supplier_product_listing_links%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_guard jsonb;
  v_sync jsonb;
  v_pricing private.supplier_pricing_snapshots%ROWTYPE;
  v_sellable_quantity integer;
  v_public_unit_price numeric(12,2);
  v_expected_unit_price numeric(12,2);
  v_unit_price_pence bigint;
  v_shipping_pence bigint;
  v_tax_pence bigint;
BEGIN
  IF p_public_product_id IS NULL OR p_quantity IS NULL OR p_quantity<=0 THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_checkout_quantity','interfaceVersion',1);
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id=p_public_product_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','public_product_not_found','interfaceVersion',1);
  END IF;
  IF v_product."commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     OR v_product."sellerId" IS NOT NULL
     OR v_product."listingContext"<>'product'
     OR v_product."supplierPublicationStatus"<>'active'
     OR v_product."isActive" IS DISTINCT FROM true
     OR v_product."isApproved" IS DISTINCT FROM true
     OR v_product."listingStatus"<>'active' THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','supplier_public_listing_not_active',
      'publicProductId',v_product.id,'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_projection
    FROM private.supplier_listing_projections
   WHERE public_product_id=v_product.id
     AND publication_state='active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_listing_projection_missing','interfaceVersion',1);
  END IF;

  SELECT * INTO v_link
    FROM private.supplier_product_listing_links
   WHERE public_product_id=v_product.id;
  IF NOT FOUND OR v_link.canonical_product_id IS DISTINCT FROM v_projection.canonical_product_id THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_listing_identity_mismatch','interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer
    FROM private.supplier_offers
   WHERE id=v_projection.current_supplier_offer_id
     AND canonical_product_id=v_projection.canonical_product_id
     AND territory='GB'
     AND status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_projection_offer_not_ready','interfaceVersion',1);
  END IF;

  v_guard:=public.server_supplier_offer_checkout_guard_v1(
    v_offer.id,v_projection.canonical_product_id,
    'loadify_supplier_fulfilled','GB',v_projection.external_variant_ref
  );
  IF COALESCE((v_guard->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','supplier_checkout_guard_failed','guard',v_guard,'interfaceVersion',1
    );
  END IF;
  v_sync:=v_guard->'sync';

  BEGIN
    v_sellable_quantity:=NULLIF(v_sync->>'sellableQuantity','')::integer;
  EXCEPTION WHEN others THEN
    v_sellable_quantity:=NULL;
  END;
  IF v_sellable_quantity IS NULL THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','known_sellable_quantity_required_for_checkout','guard',v_guard,'interfaceVersion',1
    );
  END IF;
  IF p_quantity>v_sellable_quantity THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','requested_quantity_exceeds_sellable_quantity',
      'requestedQuantity',p_quantity,'sellableQuantity',v_sellable_quantity,'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_pricing
    FROM private.supplier_pricing_snapshots p
   WHERE p.id=(v_sync->>'pricingSnapshotId')::uuid
     AND p.supplier_offer_id=v_offer.id
     AND p.canonical_product_id=v_projection.canonical_product_id
     AND p.commercial_mode='loadify_supplier_fulfilled'
     AND p.currency='GBP'
     AND p.status='approved'
     AND p.valid_from<=now()
     AND (p.valid_to IS NULL OR p.valid_to>now());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','checkout_pricing_snapshot_not_current','interfaceVersion',1);
  END IF;

  IF v_projection.current_pricing_snapshot_id IS DISTINCT FROM v_pricing.id THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','buyer_listing_pricing_projection_stale',
      'projectedPricingSnapshotId',v_projection.current_pricing_snapshot_id,
      'currentPricingSnapshotId',v_pricing.id,'interfaceVersion',1
    );
  END IF;

  v_expected_unit_price:=round((v_pricing.gross_customer_price-v_pricing.customer_shipping_charge)::numeric,2);
  v_public_unit_price:=round(v_product.price::numeric,2);
  IF v_expected_unit_price<=0 OR v_public_unit_price IS DISTINCT FROM v_expected_unit_price THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','buyer_listing_price_projection_stale',
      'publicUnitPrice',v_public_unit_price,'expectedUnitPrice',v_expected_unit_price,'interfaceVersion',1
    );
  END IF;

  v_unit_price_pence:=round(v_expected_unit_price*100)::bigint;
  v_shipping_pence:=round(v_pricing.customer_shipping_charge*100)::bigint;
  v_tax_pence:=round(v_pricing.tax_amount*100)::bigint;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_listing_checkout_ready',
    'publicProductId',v_product.id,
    'commercialMode','loadify_supplier_fulfilled',
    'canonicalProductId',v_projection.canonical_product_id,
    'supplierOfferId',v_offer.id,
    'supplierId',v_offer.supplier_id,
    'externalVariantRef',v_projection.external_variant_ref,
    'pricingSnapshotId',v_pricing.id,
    'stockObservationId',v_sync->>'stockObservationId',
    'priceObservationId',v_sync->>'priceObservationId',
    'requestedQuantity',p_quantity,
    'sellableQuantity',v_sellable_quantity,
    'unitPricePence',v_unit_price_pence,
    'customerShippingChargePence',v_shipping_pence,
    'taxAmountPence',v_tax_pence,
    'currency','GBP',
    'publicationVersion',v_projection.publication_version,
    'stockObservedAt',v_sync->>'stockObservedAt',
    'priceObservedAt',v_sync->>'priceObservedAt',
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_listing_checkout_decision_v1(uuid,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_listing_checkout_decision_v1(uuid,integer)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_listing_checkout_decision_v1(uuid,integer) IS
  'Stage 4A provider-neutral checkout boundary for buyer-facing Supplier Commerce listings. It proves public listing identity, current projection, checkout control, stock, price and economics readiness without creating reservation or payment side effects.';
