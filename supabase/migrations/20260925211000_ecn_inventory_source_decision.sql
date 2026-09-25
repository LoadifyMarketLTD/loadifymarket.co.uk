-- ECN-3B read-only inventory-source decision.
-- Normalises seller-location stock and governed supplier stock into one shadow
-- decision contract without replacing either source of truth.
--
-- This function is service-role only and is NOT wired into live checkout.

CREATE OR REPLACE FUNCTION public.server_inventory_source_decision_v1(
  p_product_id uuid,
  p_destination_country text,
  p_destination_market text,
  p_quantity integer DEFAULT 1,
  p_context text DEFAULT 'checkout',
  p_preferred_dispatch_location_id uuid DEFAULT NULL,
  p_supplier_offer_id uuid DEFAULT NULL,
  p_canonical_product_id uuid DEFAULT NULL,
  p_external_variant_ref text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_destination_country text:=upper(BTRIM(COALESCE(p_destination_country,'')));
  v_destination_market text:=upper(BTRIM(COALESCE(p_destination_market,'')));
  v_context text:=lower(BTRIM(COALESCE(p_context,'')));
  v_quantity integer:=COALESCE(p_quantity,0);

  v_product public.products%ROWTYPE;
  v_has_positions boolean:=false;
  v_candidates jsonb:='[]'::jsonb;
  v_selected jsonb;

  v_offer private.supplier_offers%ROWTYPE;
  v_stock_decision jsonb:='{}'::jsonb;
  v_stock private.supplier_stock_observations%ROWTYPE;
  v_external_warehouse_ref text;
  v_binding private.supplier_warehouse_bindings%ROWTYPE;
  v_location private.dispatch_locations%ROWTYPE;
  v_route private.market_routes%ROWTYPE;
  v_route_enabled boolean:=false;
  v_sellable_quantity integer;
BEGIN
  IF v_destination_country !~ '^[A-Z]{2}$'
     OR v_destination_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','invalid_destination',
      'candidates','[]'::jsonb,
      'interfaceVersion',1
    );
  END IF;

  IF v_context NOT IN ('display','offer','checkout','return') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','invalid_context',
      'candidates','[]'::jsonb,
      'interfaceVersion',1
    );
  END IF;

  IF v_quantity<=0 THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','invalid_quantity',
      'candidates','[]'::jsonb,
      'interfaceVersion',1
    );
  END IF;

  -- Seller listing inventory path.
  IF p_supplier_offer_id IS NULL THEN
    SELECT * INTO v_product
    FROM public.products
    WHERE id=p_product_id
      AND "isActive"=true
      AND "isApproved"=true
      AND "listingStatus"='active'
      AND COALESCE("listingContext",'product')<>'service';

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'eligible',false,
        'reason','product_not_active',
        'sourceType','seller_listing',
        'candidates','[]'::jsonb,
        'interfaceVersion',1
      );
    END IF;

    SELECT EXISTS(
      SELECT 1
      FROM private.seller_inventory_positions sip
      WHERE sip.product_id=p_product_id
        AND sip.seller_id=v_product."sellerId"
        AND sip.status='active'
    ) INTO v_has_positions;

    IF v_has_positions THEN
      WITH candidate_rows AS (
        SELECT
          sip.id AS inventory_position_id,
          sip.dispatch_location_id,
          loc.country_code AS source_country,
          GREATEST(sip.on_hand-sip.reserved,0) AS available_quantity,
          (sip.dispatch_location_id=p_preferred_dispatch_location_id) AS preferred,
          (loc.country_code=v_destination_country) AS domestic,
          r.route_key,
          r.status AS route_status,
          CASE v_context
            WHEN 'display' THEN r.display_enabled AND r.status IN ('live','prelaunch')
            WHEN 'offer' THEN r.offer_enabled AND r.status IN ('live','prelaunch')
            WHEN 'checkout' THEN r.checkout_enabled AND r.status='live'
            WHEN 'return' THEN r.returns_enabled AND r.status IN ('live','paused')
            ELSE false
          END AS route_enabled,
          loc.is_active,
          loc.verification_status
        FROM private.seller_inventory_positions sip
        JOIN private.dispatch_locations loc
          ON loc.id=sip.dispatch_location_id
         AND loc.seller_id=sip.seller_id
        LEFT JOIN private.market_routes r
          ON r.origin_country=loc.country_code
         AND r.destination_country=v_destination_country
         AND r.destination_market=v_destination_market
        WHERE sip.product_id=p_product_id
          AND sip.seller_id=v_product."sellerId"
          AND sip.status='active'
      ),
      candidate_json AS (
        SELECT
          *,
          (
            is_active=true
            AND verification_status='verified'
            AND available_quantity>=v_quantity
            AND COALESCE(route_enabled,false)=true
          ) AS candidate_eligible,
          jsonb_build_object(
            'sourceType','seller_position',
            'productId',p_product_id,
            'sellerId',v_product."sellerId",
            'inventoryPositionId',inventory_position_id,
            'dispatchLocationId',dispatch_location_id,
            'sourceCountry',source_country,
            'requestedQuantity',v_quantity,
            'availableQuantity',available_quantity,
            'routeKey',route_key,
            'routeStatus',route_status,
            'routeEligible',COALESCE(route_enabled,false),
            'locationVerified',verification_status='verified',
            'reservationModel','seller_position_not_authoritative',
            'authoritativeCheckout',false
          ) AS candidate
        FROM candidate_rows
      )
      SELECT
        COALESCE(
          jsonb_agg(
            candidate
            ORDER BY candidate_eligible DESC,preferred DESC,domestic DESC,available_quantity DESC,inventory_position_id
          ),
          '[]'::jsonb
        ),
        (
          SELECT candidate
          FROM candidate_json
          WHERE candidate_eligible
          ORDER BY preferred DESC,domestic DESC,available_quantity DESC,inventory_position_id
          LIMIT 1
        )
      INTO v_candidates,v_selected
      FROM candidate_json;

      IF v_selected IS NULL THEN
        RETURN jsonb_build_object(
          'eligible',false,
          'reason','no_eligible_inventory_position',
          'sourceType','seller_position',
          'productId',p_product_id,
          'requestedQuantity',v_quantity,
          'candidates',v_candidates,
          'blockers',jsonb_build_array('INVENTORY_LOCATION_MISSING'),
          'interfaceVersion',1
        );
      END IF;

      RETURN jsonb_build_object(
        'eligible',true,
        'reason','seller_inventory_position_selected',
        'sourceType','seller_position',
        'productId',p_product_id,
        'requestedQuantity',v_quantity,
        'selected',v_selected,
        'candidates',v_candidates,
        'authoritativeCheckout',false,
        'interfaceVersion',1
      );
    END IF;

    -- Existing UK compatibility path. A seller listing without physical
    -- positions may use products.stockQuantity only for GB->GB shadow parity.
    IF v_destination_country='GB'
       AND v_destination_market='GB' THEN
      SELECT * INTO v_route
      FROM private.market_routes
      WHERE route_key='GB-GB'
        AND destination_market='GB';

      v_route_enabled := CASE v_context
        WHEN 'display' THEN COALESCE(v_route.display_enabled,false) AND v_route.status IN ('live','prelaunch')
        WHEN 'offer' THEN COALESCE(v_route.offer_enabled,false) AND v_route.status IN ('live','prelaunch')
        WHEN 'checkout' THEN COALESCE(v_route.checkout_enabled,false) AND v_route.status='live'
        WHEN 'return' THEN COALESCE(v_route.returns_enabled,false) AND v_route.status IN ('live','paused')
        ELSE false
      END;

      IF COALESCE(v_product."stockQuantity",0)>=v_quantity
         AND v_route_enabled THEN
        v_selected:=jsonb_build_object(
          'sourceType','seller_listing',
          'productId',p_product_id,
          'sellerId',v_product."sellerId",
          'inventoryPositionId',NULL,
          'dispatchLocationId',NULL,
          'sourceCountry','GB',
          'requestedQuantity',v_quantity,
          'availableQuantity',v_product."stockQuantity",
          'routeKey','GB-GB',
          'routeStatus',v_route.status,
          'routeEligible',true,
          'legacyGbOrigin',true,
          'reservationModel','legacy_seller_listing',
          'authoritativeCheckout',false
        );

        RETURN jsonb_build_object(
          'eligible',true,
          'reason','legacy_gb_listing_inventory',
          'sourceType','seller_listing',
          'productId',p_product_id,
          'requestedQuantity',v_quantity,
          'selected',v_selected,
          'candidates',jsonb_build_array(v_selected),
          'authoritativeCheckout',false,
          'interfaceVersion',1
        );
      END IF;

      RETURN jsonb_build_object(
        'eligible',false,
        'reason',CASE
          WHEN COALESCE(v_product."stockQuantity",0)<v_quantity THEN 'insufficient_stock'
          ELSE 'route_not_eligible'
        END,
        'sourceType','seller_listing',
        'productId',p_product_id,
        'requestedQuantity',v_quantity,
        'availableQuantity',COALESCE(v_product."stockQuantity",0),
        'candidates','[]'::jsonb,
        'blockers',jsonb_build_array(
          CASE
            WHEN COALESCE(v_product."stockQuantity",0)<v_quantity THEN 'INSUFFICIENT_STOCK'
            ELSE 'ROUTE_DISABLED'
          END
        ),
        'interfaceVersion',1
      );
    END IF;

    RETURN jsonb_build_object(
      'eligible',false,
      'reason','inventory_location_required',
      'sourceType','seller_listing',
      'productId',p_product_id,
      'requestedQuantity',v_quantity,
      'candidates','[]'::jsonb,
      'blockers',jsonb_build_array('INVENTORY_LOCATION_MISSING'),
      'interfaceVersion',1
    );
  END IF;

  -- Supplier inventory path.
  --
  -- Loadify is a marketplace/intermediary and does not own or pre-purchase
  -- supplier stock. The current legacy supplier commerce runtime uses the
  -- commercial mode 'loadify_supplier_fulfilled', whose present legal/economic
  -- semantics elsewhere in the repository can make Loadify seller/merchant of
  -- record. That conflicts with the canonical marketplace model and MUST NOT
  -- be propagated into ECN.
  --
  -- Until the supplier commercial contract is corrected to an independent
  -- supplier/seller-of-record marketplace model, supplier inventory selection
  -- remains fail-closed here. Seller-owned inventory paths remain available.
  RETURN jsonb_build_object(
    'eligible',false,
    'reason','supplier_intermediary_commercial_model_not_ready',
    'sourceType','supplier_offer',
    'supplierOfferId',p_supplier_offer_id,
    'canonicalProductId',p_canonical_product_id,
    'candidates','[]'::jsonb,
    'blockers',jsonb_build_array('ACTOR_ROUTE_CAPABILITY_MISSING'),
    'authoritativeCheckout',false,
    'interfaceVersion',1
  );

  -- The code below is intentionally unreachable until the supplier marketplace
  -- commercial model is redesigned. It is retained temporarily as reference
  -- for the existing governed supplier stock evidence chain.
  IF p_canonical_product_id IS NULL THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','canonical_product_required',
      'sourceType','supplier_offer',
      'candidates','[]'::jsonb,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id
    AND canonical_product_id=p_canonical_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_offer_not_linked',
      'sourceType','supplier_offer',
      'candidates','[]'::jsonb,
      'interfaceVersion',1
    );
  END IF;

  v_stock_decision:=public.server_supplier_stock_price_decision_v1(
    p_supplier_offer_id,
    p_canonical_product_id,
    'loadify_supplier_fulfilled',
    v_destination_market,
    BTRIM(COALESCE(p_external_variant_ref,''))
  );

  IF COALESCE((v_stock_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_stock_not_ready',
      'sourceType','supplier_offer',
      'supplierOfferId',p_supplier_offer_id,
      'supplierId',v_offer.supplier_id,
      'supplierStockDecision',v_stock_decision,
      'candidates','[]'::jsonb,
      'blockers',jsonb_build_array('INVENTORY_LOCATION_MISSING'),
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_stock
  FROM private.supplier_stock_observations
  WHERE id=NULLIF(v_stock_decision->>'stockObservationId','')::uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_stock_observation_missing',
      'sourceType','supplier_offer',
      'supplierOfferId',p_supplier_offer_id,
      'candidates','[]'::jsonb,
      'interfaceVersion',1
    );
  END IF;

  v_external_warehouse_ref:=NULLIF(BTRIM(COALESCE(
    v_stock.evidence->>'externalWarehouseRef',
    v_stock.evidence->>'external_warehouse_ref',
    v_stock.evidence->>'warehouseRef',
    v_stock.evidence->>'warehouse_ref',
    ''
  )),'');

  IF v_external_warehouse_ref IS NULL THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_warehouse_ref_missing',
      'sourceType','supplier_offer',
      'supplierOfferId',p_supplier_offer_id,
      'supplierId',v_offer.supplier_id,
      'stockObservationId',v_stock.id,
      'candidates','[]'::jsonb,
      'blockers',jsonb_build_array('INVENTORY_LOCATION_MISSING'),
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_binding
  FROM private.supplier_warehouse_bindings
  WHERE supplier_id=v_offer.supplier_id
    AND external_warehouse_ref=v_external_warehouse_ref
    AND status='verified'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_warehouse_binding_missing',
      'sourceType','supplier_offer',
      'supplierOfferId',p_supplier_offer_id,
      'supplierId',v_offer.supplier_id,
      'externalWarehouseRef',v_external_warehouse_ref,
      'candidates','[]'::jsonb,
      'blockers',jsonb_build_array('INVENTORY_LOCATION_MISSING'),
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_location
  FROM private.dispatch_locations
  WHERE id=v_binding.dispatch_location_id
    AND supplier_id=v_offer.supplier_id
    AND is_active=true
    AND verification_status='verified';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_dispatch_location_unavailable',
      'sourceType','supplier_offer',
      'supplierOfferId',p_supplier_offer_id,
      'supplierId',v_offer.supplier_id,
      'candidates','[]'::jsonb,
      'blockers',jsonb_build_array('INVENTORY_LOCATION_MISSING'),
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_route
  FROM private.market_routes
  WHERE origin_country=v_location.country_code
    AND destination_country=v_destination_country
    AND destination_market=v_destination_market
  LIMIT 1;

  v_route_enabled := FOUND AND CASE v_context
    WHEN 'display' THEN v_route.display_enabled AND v_route.status IN ('live','prelaunch')
    WHEN 'offer' THEN v_route.offer_enabled AND v_route.status IN ('live','prelaunch')
    WHEN 'checkout' THEN v_route.checkout_enabled AND v_route.status='live'
    WHEN 'return' THEN v_route.returns_enabled AND v_route.status IN ('live','paused')
    ELSE false
  END;

  BEGIN
    v_sellable_quantity:=NULLIF(v_stock_decision->>'sellableQuantity','')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    v_sellable_quantity:=NULL;
  END;

  IF v_sellable_quantity IS NOT NULL
     AND v_sellable_quantity<v_quantity THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','insufficient_supplier_stock',
      'sourceType','supplier_offer',
      'supplierOfferId',p_supplier_offer_id,
      'supplierId',v_offer.supplier_id,
      'availableQuantity',v_sellable_quantity,
      'requestedQuantity',v_quantity,
      'candidates','[]'::jsonb,
      'blockers',jsonb_build_array('INSUFFICIENT_STOCK'),
      'interfaceVersion',1
    );
  END IF;

  v_selected:=jsonb_build_object(
    'sourceType','supplier_offer',
    'supplierId',v_offer.supplier_id,
    'supplierOfferId',p_supplier_offer_id,
    'canonicalProductId',p_canonical_product_id,
    'externalVariantRef',BTRIM(COALESCE(p_external_variant_ref,'')),
    'externalWarehouseRef',v_external_warehouse_ref,
    'stockObservationId',v_stock.id,
    'dispatchLocationId',v_location.id,
    'sourceCountry',v_location.country_code,
    'requestedQuantity',v_quantity,
    'availableQuantity',v_sellable_quantity,
    'availability',v_stock_decision->>'availability',
    'routeKey',v_route.route_key,
    'routeStatus',v_route.status,
    'routeEligible',COALESCE(v_route_enabled,false),
    'reservationModel','supplier_stock_reservation',
    'authoritativeCheckout',false
  );

  IF NOT COALESCE(v_route_enabled,false) THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_route_not_eligible',
      'sourceType','supplier_offer',
      'supplierOfferId',p_supplier_offer_id,
      'supplierId',v_offer.supplier_id,
      'selected',v_selected,
      'candidates',jsonb_build_array(v_selected),
      'blockers',jsonb_build_array('ROUTE_DISABLED'),
      'authoritativeCheckout',false,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_inventory_source_selected',
    'sourceType','supplier_offer',
    'supplierOfferId',p_supplier_offer_id,
    'supplierId',v_offer.supplier_id,
    'requestedQuantity',v_quantity,
    'selected',v_selected,
    'candidates',jsonb_build_array(v_selected),
    'supplierStockDecision',v_stock_decision,
    'authoritativeCheckout',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_inventory_source_decision_v1(
  uuid,text,text,integer,text,uuid,uuid,uuid,text
)
FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.server_inventory_source_decision_v1(
  uuid,text,text,integer,text,uuid,uuid,uuid,text
)
TO service_role;

COMMENT ON FUNCTION public.server_inventory_source_decision_v1(
  uuid,text,text,integer,text,uuid,uuid,uuid,text
) IS
  'ECN-3B read-only inventory-source decision. Normalises seller positions, the GB legacy listing stock path, and governed supplier stock/warehouse evidence. Shadow only; it does not reserve stock or authorise checkout.';
