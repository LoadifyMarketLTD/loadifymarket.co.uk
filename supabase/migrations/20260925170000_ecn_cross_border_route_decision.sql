-- ECN-2 shadow cross-border route decision engine.
-- Read-only, fail-closed and service-role-only.
--
-- This function is deliberately NOT wired into live checkout yet.
-- It composes the ECN route foundation with existing pricing, shipping,
-- compliance, payment, legal and launch-control decisions so GB-GB parity can
-- be measured before any authoritative cutover.
--
-- Country and market are separate:
-- - route key uses physical origin country -> destination country
-- - catalogue/pricing/legal/payment gates use destination market

CREATE OR REPLACE FUNCTION public.server_cross_border_product_decision_v1(
  p_product_id uuid,
  p_destination_country text,
  p_destination_market text,
  p_destination_postcode text DEFAULT NULL,
  p_context text DEFAULT 'checkout',
  p_dispatch_location_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_supplier_catalog_item_id uuid DEFAULT NULL,
  p_canonical_product_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_destination_country text:=upper(BTRIM(COALESCE(p_destination_country,'')));
  v_destination_market text:=upper(BTRIM(COALESCE(p_destination_market,'')));
  v_destination_postcode text:=upper(regexp_replace(BTRIM(COALESCE(p_destination_postcode,'')),'\\s+','','g'));
  v_context text:=lower(BTRIM(COALESCE(p_context,'')));

  v_product public.products%ROWTYPE;
  v_seller public.seller_profiles%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_location private.dispatch_locations%ROWTYPE;
  v_route private.market_routes%ROWTYPE;
  v_cap private.actor_route_capabilities%ROWTYPE;

  v_origin text;
  v_route_key text;
  v_legacy_gb_origin boolean:=false;
  v_location_verified boolean:=false;

  v_product_market_enabled boolean:=false;
  v_actor_market_supported boolean:=false;
  v_actor_delivery_supported boolean:=false;
  v_actor_route_verified boolean:=false;
  v_actor_can_fulfil boolean:=false;
  v_actor_can_return boolean:=false;

  v_price jsonb:='{}'::jsonb;
  v_shipping jsonb:='{}'::jsonb;
  v_market_compliance jsonb:='{}'::jsonb;
  v_product_compliance jsonb:='{}'::jsonb;
  v_payment jsonb:='{}'::jsonb;
  v_legal jsonb:='{}'::jsonb;
  v_launch jsonb:='{}'::jsonb;

  v_price_ok boolean:=false;
  v_shipping_market_ok boolean:=false;
  v_market_compliance_ok boolean:=false;
  v_product_compliance_ok boolean:=false;
  v_payment_ok boolean:=false;
  v_legal_ok boolean:=false;
  v_launch_ok boolean:=false;
  v_marketplace_tax_ok boolean:=false;
  v_tax_route_ok boolean:=false;
  v_customs_ok boolean:=false;

  v_display_ok boolean:=false;
  v_offer_ok boolean:=false;
  v_shipping_ok boolean:=false;
  v_checkout_ok boolean:=false;
  v_return_ok boolean:=false;

  v_result text:='blocked';
  v_blockers text[]:='{}';
  v_diagnostics text[]:='{}';
BEGIN
  IF v_context NOT IN ('display','offer','checkout','return') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'result','blocked',
      'reason','invalid_decision_context',
      'blockers',jsonb_build_array('ROUTE_DISABLED'),
      'diagnostics',jsonb_build_array('ROUTE_DISABLED'),
      'interfaceVersion',1
    );
  END IF;

  IF v_destination_country !~ '^[A-Z]{2}$'
     OR v_destination_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'result','blocked',
      'reason','invalid_destination',
      'destinationCountry',v_destination_country,
      'destinationMarket',v_destination_market,
      'blockers',jsonb_build_array('ROUTE_DISABLED'),
      'diagnostics',jsonb_build_array('ROUTE_DISABLED'),
      'interfaceVersion',1
    );
  END IF;

  IF v_destination_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'result','blocked',
      'reason','unsupported_destination_market',
      'destinationCountry',v_destination_country,
      'destinationMarket',v_destination_market,
      'blockers',jsonb_build_array('ROUTE_DISABLED'),
      'diagnostics',jsonb_build_array('ROUTE_DISABLED'),
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE id=p_product_id
    AND "isActive"=true
    AND "isApproved"=true
    AND "listingStatus"='active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'result','blocked',
      'reason','product_not_active',
      'destinationCountry',v_destination_country,
      'destinationMarket',v_destination_market,
      'blockers',jsonb_build_array('PRODUCT_MARKETABILITY_UNVERIFIED'),
      'diagnostics',jsonb_build_array('PRODUCT_MARKETABILITY_UNVERIFIED'),
      'interfaceVersion',1
    );
  END IF;

  v_product_market_enabled :=
    v_destination_market = ANY(COALESCE(v_product."marketCodes",ARRAY['GB']::text[]));

  IF NOT v_product_market_enabled THEN
    v_diagnostics:=array_append(v_diagnostics,'PRODUCT_MARKETABILITY_UNVERIFIED');
  END IF;

  IF p_supplier_id IS NULL THEN
    SELECT * INTO v_seller
    FROM public.seller_profiles
    WHERE "userId"=v_product."sellerId";

    IF NOT FOUND THEN
      v_diagnostics:=array_append(v_diagnostics,'ACTOR_ROUTE_CAPABILITY_MISSING');
    ELSE
      v_actor_market_supported :=
        v_destination_market = ANY(COALESCE(v_seller."marketCodes",ARRAY['GB']::text[]));
      v_actor_delivery_supported :=
        v_destination_market = ANY(COALESCE(v_seller."deliveryMarketCodes",ARRAY['GB']::text[]));

      IF NOT v_actor_market_supported THEN
        v_diagnostics:=array_append(v_diagnostics,'SELLER_MARKET_UNSUPPORTED');
      END IF;
      IF NOT v_actor_delivery_supported THEN
        v_diagnostics:=array_append(v_diagnostics,'SELLER_DELIVERY_MARKET_UNSUPPORTED');
      END IF;
    END IF;
  ELSE
    SELECT * INTO v_supplier
    FROM private.supplier_foundation_suppliers
    WHERE id=p_supplier_id;

    IF NOT FOUND THEN
      v_diagnostics:=array_append(v_diagnostics,'ACTOR_ROUTE_CAPABILITY_MISSING');
    ELSE
      v_actor_market_supported :=
        v_destination_market = ANY(COALESCE(v_supplier.market_codes,ARRAY['GB']::text[]));
      v_actor_delivery_supported :=
        v_destination_market = ANY(COALESCE(v_supplier.delivery_market_codes,ARRAY['GB']::text[]));

      IF NOT v_actor_market_supported THEN
        v_diagnostics:=array_append(v_diagnostics,'SUPPLIER_MARKET_UNSUPPORTED');
      END IF;
      IF NOT v_actor_delivery_supported THEN
        v_diagnostics:=array_append(v_diagnostics,'SUPPLIER_DELIVERY_MARKET_UNSUPPORTED');
      END IF;
    END IF;
  END IF;

  IF p_dispatch_location_id IS NOT NULL THEN
    SELECT * INTO v_location
    FROM private.dispatch_locations
    WHERE id=p_dispatch_location_id
      AND is_active=true;

    IF NOT FOUND THEN
      v_diagnostics:=array_append(v_diagnostics,'DISPATCH_LOCATION_MISSING');
    ELSIF p_supplier_id IS NULL AND v_location.seller_id IS DISTINCT FROM v_product."sellerId" THEN
      v_diagnostics:=array_append(v_diagnostics,'DISPATCH_LOCATION_MISSING');
    ELSIF p_supplier_id IS NOT NULL AND v_location.supplier_id IS DISTINCT FROM p_supplier_id THEN
      v_diagnostics:=array_append(v_diagnostics,'DISPATCH_LOCATION_MISSING');
    ELSE
      v_origin:=v_location.country_code;
      v_location_verified:=v_location.verification_status='verified';
      IF NOT v_location_verified THEN
        v_diagnostics:=array_append(v_diagnostics,'DISPATCH_LOCATION_UNVERIFIED');
      END IF;
    END IF;
  ELSIF v_destination_country='GB'
     AND v_destination_market='GB'
     AND v_product_market_enabled
     AND p_supplier_id IS NULL
     AND COALESCE(v_actor_market_supported,false)
     AND COALESCE(v_actor_delivery_supported,false) THEN
    -- Backward compatibility only: existing UK listings predate explicit
    -- dispatch-location modelling. Never use implicit origin for Romania or
    -- for a cross-border route.
    v_origin:='GB';
    v_legacy_gb_origin:=true;
    v_location_verified:=true;
  ELSE
    v_diagnostics:=array_append(v_diagnostics,'DISPATCH_LOCATION_MISSING');
  END IF;

  IF v_origin IS NULL THEN
    v_blockers:=ARRAY['DISPATCH_LOCATION_MISSING']::text[];
    RETURN jsonb_build_object(
      'eligible',false,
      'result','blocked',
      'reason','dispatch_location_required',
      'productId',p_product_id,
      'originCountry',NULL,
      'destinationCountry',v_destination_country,
      'destinationMarket',v_destination_market,
      'routeKey',NULL,
      'context',v_context,
      'displayEligible',false,
      'offerEligible',false,
      'shippingEligible',false,
      'checkoutEligible',false,
      'returnEligible',false,
      'blockers',to_jsonb(v_blockers),
      'diagnostics',to_jsonb(ARRAY(SELECT DISTINCT x FROM unnest(v_diagnostics) AS x)),
      'legacyGbOrigin',false,
      'interfaceVersion',1
    );
  END IF;

  v_route_key:=v_origin || '-' || v_destination_country;

  SELECT * INTO v_route
  FROM private.market_routes
  WHERE route_key=v_route_key
    AND destination_market=v_destination_market;

  IF NOT FOUND THEN
    v_diagnostics:=array_append(v_diagnostics,'ROUTE_DISABLED');
  ELSE
    IF v_route.status='prelaunch' THEN
      v_diagnostics:=array_append(v_diagnostics,'ROUTE_PRELAUNCH');
    ELSIF v_route.status IN ('paused','suspended') THEN
      v_diagnostics:=array_append(v_diagnostics,'ROUTE_SUSPENDED');
    END IF;

    IF v_origin<>v_destination_country THEN
      v_tax_route_ok:=NULLIF(BTRIM(COALESCE(v_route.tax_profile_code,'')),'') IS NOT NULL;
      v_customs_ok:=NULLIF(BTRIM(COALESCE(v_route.customs_profile_code,'')),'') IS NOT NULL;
    ELSE
      -- Domestic tax/compliance is already governed by market-level decisions.
      v_tax_route_ok:=true;
      v_customs_ok:=true;
    END IF;

    IF NOT v_tax_route_ok THEN
      v_diagnostics:=array_append(v_diagnostics,'TAX_READINESS_INCOMPLETE');
    END IF;
    IF NOT v_customs_ok THEN
      v_diagnostics:=array_append(v_diagnostics,'CUSTOMS_READINESS_INCOMPLETE');
    END IF;
  END IF;

  IF v_route.id IS NOT NULL
     AND v_legacy_gb_origin
     AND v_route_key='GB-GB' THEN
    -- Existing UK baseline is allowed to operate without an explicit
    -- actor_route_capabilities row until shadow parity is complete.
    v_actor_route_verified:=true;
    v_actor_can_fulfil:=true;
    v_actor_can_return:=true;
  ELSIF v_route.id IS NOT NULL AND v_location_verified THEN
    IF p_supplier_id IS NULL THEN
      SELECT * INTO v_cap
      FROM private.actor_route_capabilities
      WHERE route_id=v_route.id
        AND seller_id=v_product."sellerId"
        AND capability_status='verified'
        AND valid_from<=now()
        AND (valid_to IS NULL OR valid_to>now())
        AND dispatch_location_id=p_dispatch_location_id
      ORDER BY reviewed_at DESC
      LIMIT 1;
    ELSE
      SELECT * INTO v_cap
      FROM private.actor_route_capabilities
      WHERE route_id=v_route.id
        AND supplier_id=p_supplier_id
        AND capability_status='verified'
        AND valid_from<=now()
        AND (valid_to IS NULL OR valid_to>now())
        AND dispatch_location_id=p_dispatch_location_id
      ORDER BY reviewed_at DESC
      LIMIT 1;
    END IF;

    IF FOUND THEN
      v_actor_route_verified:=true;
      v_actor_can_fulfil:=v_cap.can_fulfil;
      v_actor_can_return:=v_cap.can_accept_returns;
    ELSE
      v_diagnostics:=array_append(v_diagnostics,'ACTOR_ROUTE_CAPABILITY_MISSING');
    END IF;
  ELSE
    v_diagnostics:=array_append(v_diagnostics,'ACTOR_ROUTE_CAPABILITY_UNVERIFIED');
  END IF;

  v_price:=public.server_product_market_price_decision_v1(p_product_id,v_destination_market);
  v_price_ok:=COALESCE((v_price->>'eligible')::boolean,false);

  IF NOT v_price_ok
     AND v_route_key='GB-GB'
     AND v_legacy_gb_origin
     AND COALESCE(v_product.currency,'GBP')='GBP' THEN
    -- Existing UK product.price remains the compatibility price until the
    -- market-price ledger is authoritative for GB.
    v_price_ok:=true;
    v_price:=jsonb_build_object(
      'eligible',true,
      'reason','legacy_gb_listing_price',
      'market','GB',
      'currency','GBP',
      'amount',v_product.price,
      'interfaceVersion',1
    );
  ELSIF NOT v_price_ok THEN
    v_diagnostics:=array_append(v_diagnostics,'MARKET_PRICE_EVIDENCE_INCOMPLETE');
  END IF;

  v_shipping:=public.server_shipping_market_readiness_v1(
    p_product_id,
    v_destination_market
  );
  v_shipping_market_ok:=COALESCE((v_shipping->>'eligible')::boolean,false);
  IF NOT v_shipping_market_ok THEN
    v_diagnostics:=array_append(v_diagnostics,'SHIPPING_SERVICE_UNAVAILABLE');
  END IF;

  v_market_compliance:=public.server_market_compliance_readiness_v1(v_destination_market);
  v_market_compliance_ok:=COALESCE((v_market_compliance->>'eligible')::boolean,false);
  IF NOT v_market_compliance_ok THEN
    v_diagnostics:=array_append(v_diagnostics,'PRODUCT_MARKETABILITY_UNVERIFIED');
  END IF;

  IF v_destination_market='GB' THEN
    v_product_compliance_ok:=true;
    v_product_compliance:=jsonb_build_object(
      'eligible',true,
      'reason','existing_uk_product_compliance_boundary',
      'market','GB',
      'interfaceVersion',1
    );
  ELSIF p_supplier_catalog_item_id IS NOT NULL
        AND p_canonical_product_id IS NOT NULL THEN
    v_product_compliance:=public.server_product_market_compliance_decision_v1(
      p_supplier_catalog_item_id,
      p_canonical_product_id,
      v_destination_market
    );
    v_product_compliance_ok:=COALESCE((v_product_compliance->>'eligible')::boolean,false);
    IF NOT v_product_compliance_ok THEN
      v_diagnostics:=array_append(v_diagnostics,'PRODUCT_MARKETABILITY_UNVERIFIED');
    END IF;
  ELSE
    -- Ordinary seller RO product compliance does not yet have an equivalent
    -- reviewed evidence ledger. Never infer supplier evidence for a seller.
    v_product_compliance_ok:=false;
    v_product_compliance:=jsonb_build_object(
      'eligible',false,
      'reason','seller_product_compliance_evidence_missing',
      'market',v_destination_market,
      'interfaceVersion',1
    );
    v_diagnostics:=array_append(v_diagnostics,'SELLER_PRODUCT_COMPLIANCE_EVIDENCE_MISSING');
  END IF;

  -- Mirror the existing authoritative marketplace-seller tax boundary in shadow
  -- mode. The live GB checkout currently permits only GB non-VAT sellers with
  -- a complete seller declaration, matching per-product tax evidence, and a
  -- Great Britain destination outside the excluded postcode families.
  --
  -- Supplier commerce has its own governed tax/economics evidence chain, so
  -- this seller-specific compatibility gate is not applied to supplier flows.
  IF p_supplier_id IS NOT NULL THEN
    v_marketplace_tax_ok:=true;
  ELSIF v_route_key='GB-GB' THEN
    v_marketplace_tax_ok :=
      upper(BTRIM(COALESCE(v_seller.country,''))) IN ('GB','GBR','UK','UNITED KINGDOM','GREAT BRITAIN')
      AND upper(regexp_replace(BTRIM(COALESCE(
        v_seller."businessAddress"->>'postcode',
        v_seller."businessAddress"->>'postalCode',
        v_seller."businessAddress"->>'postal_code',
        ''
      )),'\\s+','','g')) !~ '^(BT|GY|JE|IM|GX|BF)'
      AND NULLIF(v_destination_postcode,'') IS NOT NULL
      AND v_destination_postcode !~ '^(BT|GY|JE|IM|GX|BF)'
      AND v_seller."taxDeclarationConfirmed"=true
      AND v_seller."taxDeclarationVersion"=1
      AND v_seller."taxDeclarationSource"='seller_self_declaration_v1'
      AND v_seller."taxDeclarationCapturedAt" IS NOT NULL
      AND v_seller."isVatRegistered"=false
      AND NULLIF(BTRIM(COALESCE(v_seller."vatNumber",'')),'') IS NULL
      AND v_product."listingContext"='product'
      AND v_product."taxTreatmentStatus"='seller_non_vat_declared'
      AND v_product."taxTreatmentSource"='seller_profile_non_vat_declaration_v1'
      AND v_product."taxEvidenceVersion"=1
      AND v_product."taxEvidenceCapturedAt" IS NOT NULL
      AND COALESCE(v_product."vatRate",-1)=0
      AND v_product."priceExVat" IS NOT NULL
      AND ROUND(v_product."priceExVat"*100)=ROUND(v_product.price*100);
  ELSE
    -- Marketplace Seller RO/international tax contracts are intentionally not
    -- inferred from the GB contract and remain fail-closed.
    v_marketplace_tax_ok:=false;
  END IF;

  IF NOT v_marketplace_tax_ok THEN
    v_diagnostics:=array_append(v_diagnostics,'TAX_READINESS_INCOMPLETE');
  END IF;

  v_payment:=public.server_market_payment_readiness_v1(v_destination_market);
  v_payment_ok:=COALESCE((v_payment->>'eligible')::boolean,false);
  IF NOT v_payment_ok THEN
    v_diagnostics:=array_append(v_diagnostics,'PAYMENT_READINESS_INCOMPLETE');
  END IF;

  v_legal:=public.server_market_legal_policy_snapshot_v1(v_destination_market);
  v_legal_ok:=COALESCE((v_legal->>'eligible')::boolean,false);
  IF NOT v_legal_ok THEN
    v_diagnostics:=array_append(v_diagnostics,'LEGAL_POLICY_READINESS_INCOMPLETE');
  END IF;

  v_launch:=public.server_market_launch_control_v1(v_destination_market);
  v_launch_ok:=COALESCE((v_launch->>'eligible')::boolean,false);
  IF NOT v_launch_ok THEN
    v_diagnostics:=array_append(v_diagnostics,'PAYMENT_MARKET_DISABLED');
  END IF;

  v_display_ok :=
    v_route.id IS NOT NULL
    AND v_route.display_enabled
    AND v_product_market_enabled
    AND v_actor_market_supported
    AND v_location_verified;

  v_offer_ok :=
    v_display_ok
    AND v_route.offer_enabled
    AND v_actor_route_verified
    AND v_price_ok;

  v_shipping_ok :=
    v_offer_ok
    AND v_route.shipping_enabled
    AND v_actor_can_fulfil
    AND v_actor_delivery_supported
    AND v_shipping_market_ok;

  v_checkout_ok :=
    v_shipping_ok
    AND v_route.checkout_enabled
    AND v_route.status='live'
    AND v_marketplace_tax_ok
    AND v_tax_route_ok
    AND v_customs_ok
    AND v_market_compliance_ok
    AND v_product_compliance_ok
    AND v_payment_ok
    AND v_legal_ok
    AND v_launch_ok;

  v_return_ok :=
    v_route.id IS NOT NULL
    AND v_route.returns_enabled
    AND v_actor_route_verified
    AND v_actor_can_return;

  IF v_context='display' THEN
    IF v_display_ok THEN
      v_result:='eligible';
    ELSE
      IF v_route.id IS NULL OR NOT COALESCE(v_route.display_enabled,false) THEN
        v_blockers:=array_append(v_blockers,'ROUTE_DISABLED');
      END IF;
      IF NOT v_product_market_enabled THEN
        v_blockers:=array_append(v_blockers,'PRODUCT_MARKETABILITY_UNVERIFIED');
      END IF;
      IF NOT v_actor_market_supported THEN
        v_blockers:=array_append(v_blockers,CASE WHEN p_supplier_id IS NULL THEN 'SELLER_MARKET_UNSUPPORTED' ELSE 'SUPPLIER_MARKET_UNSUPPORTED' END);
      END IF;
      IF NOT v_location_verified THEN
        v_blockers:=array_append(v_blockers,'DISPATCH_LOCATION_UNVERIFIED');
      END IF;
    END IF;
  ELSIF v_context='offer' THEN
    IF v_offer_ok THEN
      v_result:='eligible';
    ELSE
      IF NOT v_display_ok THEN
        v_blockers:=array_append(v_blockers,'ROUTE_DISABLED');
      END IF;
      IF v_route.id IS NULL OR NOT COALESCE(v_route.offer_enabled,false) THEN
        v_blockers:=array_append(v_blockers,'ROUTE_DISABLED');
      END IF;
      IF NOT v_actor_route_verified THEN
        v_blockers:=array_append(v_blockers,'ACTOR_ROUTE_CAPABILITY_MISSING');
      END IF;
      IF NOT v_price_ok THEN
        v_blockers:=array_append(v_blockers,'MARKET_PRICE_EVIDENCE_INCOMPLETE');
      END IF;
    END IF;
  ELSIF v_context='checkout' THEN
    IF v_checkout_ok THEN
      v_result:='eligible';
    ELSE
      IF v_route.id IS NULL THEN
        v_blockers:=array_append(v_blockers,'ROUTE_DISABLED');
      ELSIF v_route.status='prelaunch' THEN
        v_blockers:=array_append(v_blockers,'ROUTE_PRELAUNCH');
      ELSIF v_route.status IN ('paused','suspended') THEN
        v_blockers:=array_append(v_blockers,'ROUTE_SUSPENDED');
      END IF;
      IF NOT v_actor_market_supported THEN
        v_blockers:=array_append(v_blockers,CASE WHEN p_supplier_id IS NULL THEN 'SELLER_MARKET_UNSUPPORTED' ELSE 'SUPPLIER_MARKET_UNSUPPORTED' END);
      END IF;
      IF NOT v_actor_delivery_supported THEN
        v_blockers:=array_append(v_blockers,CASE WHEN p_supplier_id IS NULL THEN 'SELLER_DELIVERY_MARKET_UNSUPPORTED' ELSE 'SUPPLIER_DELIVERY_MARKET_UNSUPPORTED' END);
      END IF;
      IF NOT v_actor_route_verified THEN
        v_blockers:=array_append(v_blockers,'ACTOR_ROUTE_CAPABILITY_MISSING');
      END IF;
      IF NOT v_price_ok THEN
        v_blockers:=array_append(v_blockers,'MARKET_PRICE_EVIDENCE_INCOMPLETE');
      END IF;
      IF NOT v_shipping_market_ok
         OR v_route.id IS NULL
         OR NOT COALESCE(v_route.shipping_enabled,false)
         OR NOT v_actor_can_fulfil THEN
        v_blockers:=array_append(v_blockers,'SHIPPING_ROUTE_UNAVAILABLE');
      END IF;
      IF NOT v_marketplace_tax_ok OR NOT v_tax_route_ok THEN
        v_blockers:=array_append(v_blockers,'TAX_READINESS_INCOMPLETE');
      END IF;
      IF NOT v_customs_ok THEN
        v_blockers:=array_append(v_blockers,'CUSTOMS_READINESS_INCOMPLETE');
      END IF;
      IF NOT v_market_compliance_ok THEN
        v_blockers:=array_append(v_blockers,'PRODUCT_MARKETABILITY_UNVERIFIED');
      END IF;
      IF NOT v_product_compliance_ok THEN
        IF v_destination_market='RO'
           AND p_supplier_catalog_item_id IS NULL THEN
          v_blockers:=array_append(v_blockers,'SELLER_PRODUCT_COMPLIANCE_EVIDENCE_MISSING');
        ELSE
          v_blockers:=array_append(v_blockers,'PRODUCT_MARKETABILITY_UNVERIFIED');
        END IF;
      END IF;
      IF NOT v_payment_ok THEN
        v_blockers:=array_append(v_blockers,'PAYMENT_READINESS_INCOMPLETE');
      END IF;
      IF NOT v_legal_ok THEN
        v_blockers:=array_append(v_blockers,'LEGAL_POLICY_READINESS_INCOMPLETE');
      END IF;
      IF NOT v_launch_ok THEN
        v_blockers:=array_append(v_blockers,'PAYMENT_MARKET_DISABLED');
      END IF;
    END IF;
  ELSE
    IF v_return_ok THEN
      v_result:='eligible';
    ELSE
      IF v_route.id IS NULL OR NOT COALESCE(v_route.returns_enabled,false) THEN
        v_blockers:=array_append(v_blockers,'RETURN_ROUTE_UNAVAILABLE');
      END IF;
      IF NOT v_actor_can_return THEN
        v_blockers:=array_append(v_blockers,'RETURN_DESTINATION_MISSING');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible',v_result='eligible',
    'result',v_result,
    'productId',p_product_id,
    'sellerId',v_product."sellerId",
    'supplierId',p_supplier_id,
    'originCountry',v_origin,
    'destinationCountry',v_destination_country,
    'destinationMarket',v_destination_market,
    'routeKey',v_route_key,
    'context',v_context,
    'displayEligible',v_display_ok,
    'offerEligible',v_offer_ok,
    'shippingEligible',v_shipping_ok,
    'checkoutEligible',v_checkout_ok,
    'returnEligible',v_return_ok,
    'dispatchLocationId',p_dispatch_location_id,
    'legacyGbOrigin',v_legacy_gb_origin,
    'blockers',to_jsonb(ARRAY(SELECT DISTINCT x FROM unnest(v_blockers) AS x)),
    'diagnostics',to_jsonb(ARRAY(SELECT DISTINCT x FROM unnest(v_diagnostics) AS x)),
    'route',CASE
      WHEN v_route.id IS NULL THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'status',v_route.status,
        'originCountry',v_route.origin_country,
        'destinationCountry',v_route.destination_country,
        'destinationMarket',v_route.destination_market,
        'displayEnabled',v_route.display_enabled,
        'offerEnabled',v_route.offer_enabled,
        'shippingEnabled',v_route.shipping_enabled,
        'checkoutEnabled',v_route.checkout_enabled,
        'returnsEnabled',v_route.returns_enabled,
        'taxProfileCode',v_route.tax_profile_code,
        'customsProfileCode',v_route.customs_profile_code
      )
    END,
    'marketPrice',v_price,
    'marketShipping',v_shipping,
    'marketCompliance',v_market_compliance,
    'productCompliance',v_product_compliance,
    'paymentReadiness',v_payment,
    'legalPolicyVersions',v_legal,
    'launchControl',v_launch,
    'marketplaceTaxEligible',v_marketplace_tax_ok,
    'destinationPostcode',NULLIF(v_destination_postcode,''),
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_cross_border_product_decision_v1(
  uuid,text,text,text,text,uuid,uuid,uuid,uuid
)
FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.server_cross_border_product_decision_v1(
  uuid,text,text,text,text,uuid,uuid,uuid,uuid
)
TO service_role;

COMMENT ON FUNCTION public.server_cross_border_product_decision_v1(
  uuid,text,text,text,text,uuid,uuid,uuid,uuid
) IS
  'ECN-2 shadow cross-border product decision. Read-only and service-role-only. Country and market are separate. GB legacy origin is allowed only for GB-GB parity; Romania seller product compliance remains fail-closed until reviewed seller-product evidence exists.';
