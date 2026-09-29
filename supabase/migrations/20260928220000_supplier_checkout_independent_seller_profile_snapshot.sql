-- Bind supplier checkout orders to the exact independent-supplier commercial profile.
-- Replaces the legacy Loadify-as-seller snapshots for future supplier marketplace orders.
-- No market is activated and no payment is created by this migration.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "supplierCommercialProfileIdSnapshot" uuid REFERENCES private.supplier_commercial_profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierCommercialProfileVersionSnapshot" integer;

CREATE OR REPLACE FUNCTION private.guard_supplier_commercial_profile_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_profile private.supplier_commercial_profiles%ROWTYPE;
BEGIN
  IF NEW."commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled' THEN
    RETURN NEW;
  END IF;
  IF NEW."supplierCommercialProfileIdSnapshot" IS NULL
     OR NEW."supplierCommercialProfileVersionSnapshot" IS NULL THEN
    RAISE EXCEPTION 'supplier commercial profile snapshot is required';
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_commercial_profiles
  WHERE id=NEW."supplierCommercialProfileIdSnapshot"
    AND supplier_id=NEW."supplierSellerIdSnapshot"
    AND market_code=NEW."marketCode"
    AND version=NEW."supplierCommercialProfileVersionSnapshot"
    AND status='verified'
    AND effective_from<=now()
    AND (effective_to IS NULL OR effective_to>now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'snapshotted supplier commercial profile is not verified/current';
  END IF;
  IF NEW."supplierSettlementModelSnapshot" IS DISTINCT FROM v_profile.settlement_model THEN
    RAISE EXCEPTION 'supplier settlement snapshot does not match snapshotted commercial profile';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_commercial_profile_snapshot_v1 ON public.orders;
CREATE TRIGGER trg_guard_supplier_commercial_profile_snapshot_v1
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_commercial_profile_snapshot_v1();

REVOKE ALL ON FUNCTION private.guard_supplier_commercial_profile_snapshot_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  p_buyer_id uuid,
  p_projection_id uuid,
  p_supplier_offer_id uuid,
  p_quantity integer,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_reservation_key text,
  p_orchestration_idempotency_key text,
  p_correlation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_projection private.supplier_marketplace_projections%ROWTYPE;
  v_binding private.supplier_projection_offer_bindings%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_catalog_item private.supplier_catalog_items%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_control private.supplier_marketplace_commercial_controls%ROWTYPE;
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_buyer public.users%ROWTYPE;
  v_order_id uuid;
  v_order_item_id uuid;
  v_reservation jsonb;
  v_supplier_name text;
  v_subtotal numeric(12,2);
  v_tax numeric(12,2);
  v_shipping numeric(12,2);
  v_total numeric(12,2);
BEGIN
  IF p_buyer_id IS NULL OR p_projection_id IS NULL OR p_supplier_offer_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'buyer, projection, selected offer and correlation identity are required';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'supplier checkout quantity must be between 1 and 100';
  END IF;
  IF COALESCE(BTRIM(p_reservation_key),'')='' OR COALESCE(BTRIM(p_orchestration_idempotency_key),'')='' THEN
    RAISE EXCEPTION 'checkout idempotency keys are required';
  END IF;
  IF jsonb_typeof(COALESCE(p_shipping_address,'{}'::jsonb))<>'object'
     OR jsonb_typeof(COALESCE(p_billing_address,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'checkout addresses must be JSON objects';
  END IF;

  SELECT * INTO v_buyer FROM public.users
  WHERE id=p_buyer_id AND role='buyer' AND "isActive"=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'active buyer identity is required'; END IF;

  SELECT * INTO v_projection
  FROM private.supplier_marketplace_projections
  WHERE id=p_projection_id
    AND status='published'
    AND commercial_mode='loadify_supplier_fulfilled'
    AND territory='GB'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'published supplier projection is required'; END IF;

  SELECT * INTO v_binding
  FROM private.supplier_projection_offer_bindings
  WHERE projection_id=v_projection.id
    AND supplier_offer_id=p_supplier_offer_id
    AND status='approved'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'selected supplier offer is not approved for this projection'; END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id
    AND canonical_product_id=v_projection.canonical_product_id
    AND territory=v_projection.territory
    AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'selected supplier offer is not interchangeable for this projection'; END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=v_offer.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved independent supplier identity is required'; END IF;
  v_supplier_name:=COALESCE(NULLIF(BTRIM(v_supplier.legal_name),''),NULLIF(BTRIM(v_supplier.display_name),''));
  IF v_supplier_name IS NULL THEN RAISE EXCEPTION 'supplier legal/display name is required'; END IF;

  SELECT * INTO v_control
  FROM private.supplier_marketplace_commercial_controls
  WHERE market_code=v_projection.territory
    AND status='verified'
    AND checkout_enabled=true
    AND supplier_is_seller_of_record=true
    AND loadify_owns_inventory=false
    AND loadify_prepurchases_inventory=false
    AND settlement_model<>'unconfigured'
    AND reviewed_by IS NOT NULL
    AND reviewed_at IS NOT NULL
    AND evidence<>'{}'::jsonb;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier marketplace commercial model is not verified'; END IF;

  SELECT * INTO v_profile
  FROM private.supplier_commercial_profiles
  WHERE supplier_id=v_supplier.id
    AND market_code=v_projection.territory
    AND status='verified'
    AND effective_from<=now()
    AND (effective_to IS NULL OR effective_to>now())
  ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'verified supplier commercial profile is required'; END IF;
  IF v_profile.settlement_model<>v_control.settlement_model THEN
    RAISE EXCEPTION 'supplier and market settlement contracts do not match';
  END IF;

  SELECT * INTO v_catalog_item
  FROM private.supplier_catalog_items
  WHERE id=v_offer.supplier_catalog_item_id AND supplier_id=v_offer.supplier_id;
  IF NOT FOUND OR NULLIF(BTRIM(COALESCE(v_catalog_item.external_variant_ref,'')),'') IS NULL THEN
    RAISE EXCEPTION 'selected supplier offer variant identity is unavailable';
  END IF;

  SELECT * INTO v_price
  FROM private.supplier_pricing_snapshots
  WHERE id=(
    SELECT NULLIF(public.server_supplier_commercial_decision_v1(
      v_offer.id,v_projection.canonical_product_id,'loadify_supplier_fulfilled',v_projection.territory
    )->>'pricingSnapshotId','')::uuid
  )
    AND supplier_offer_id=v_offer.id
    AND canonical_product_id=v_projection.canonical_product_id
    AND status='approved'
    AND commercial_mode='loadify_supplier_fulfilled';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved selected-offer pricing snapshot is required'; END IF;
  IF v_profile.settlement_currency<>v_price.currency THEN
    RAISE EXCEPTION 'supplier settlement currency does not match checkout pricing currency';
  END IF;

  v_subtotal:=ROUND(((v_price.merchandise_amount+v_price.mandatory_fee_amount)*p_quantity)::numeric,2);
  v_tax:=ROUND((v_price.tax_amount*p_quantity)::numeric,2);
  v_shipping:=ROUND((v_price.customer_shipping_charge*p_quantity)::numeric,2);
  v_total:=ROUND((v_price.gross_customer_price*p_quantity)::numeric,2);

  INSERT INTO public.orders(
    "buyerId","sellerId","productId",quantity,subtotal,"vatAmount","shippingAmount",total,
    commission,status,"escrowStatus","shippingAddress","billingAddress",
    "commercialMode","canonicalProductId","supplierOfferId","supplierCatalogItemId",
    "supplierProjectionId","pricingSnapshotId","supplierExternalVariantRefSnapshot",
    "legalSellerIdentitySnapshot","merchantOfRecordSnapshot","invoiceIssuerSnapshot","paymentRecipientSnapshot",
    "supplierSellerIdSnapshot","supplierSellerNameSnapshot","supplierSettlementModelSnapshot",
    "marketplaceOperatorSnapshot","supplierCommercialContractVersion",
    "supplierCommercialProfileIdSnapshot","supplierCommercialProfileVersionSnapshot"
  ) VALUES(
    p_buyer_id,NULL,NULL,p_quantity,v_subtotal,v_tax,v_shipping,v_total,
    0,'awaiting_payment','held',COALESCE(p_shipping_address,'{}'::jsonb),COALESCE(p_billing_address,'{}'::jsonb),
    'loadify_supplier_fulfilled',v_projection.canonical_product_id,v_offer.id,v_offer.supplier_catalog_item_id,
    v_projection.id,v_price.id,v_catalog_item.external_variant_ref,
    v_supplier_name,NULL,v_supplier_name,NULL,
    v_supplier.id,v_supplier_name,v_control.settlement_model,
    'Loadify Market',1,v_profile.id,v_profile.version
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items(
    "orderId","productId",quantity,"pricePerUnit","vatRate",subtotal,
    "canonicalProductId","supplierOfferId","pricingSnapshotId",
    "productTitleSnapshot","listingContextSnapshot","productSnapshotSource","productSnapshotCapturedAt"
  ) VALUES(
    v_order_id,NULL,p_quantity,ROUND((v_subtotal/p_quantity)::numeric,2),0,v_subtotal,
    v_projection.canonical_product_id,v_offer.id,v_price.id,
    COALESCE(NULLIF(BTRIM(v_projection.projection_payload->>'title'),''),'Loadify supplier product'),
    'product','checkout_verified',now()
  ) RETURNING id INTO v_order_item_id;

  v_reservation:=public.server_reserve_supplier_offer_v1(
    v_order_id,v_order_item_id,v_offer.id,
    'loadify_supplier_fulfilled',p_quantity,v_projection.territory,v_catalog_item.external_variant_ref,
    BTRIM(p_reservation_key),BTRIM(p_orchestration_idempotency_key),
    p_correlation_id,'{}'::jsonb,'supplier_commerce_default',30
  );
  IF COALESCE((v_reservation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'selected supplier reservation failed: %',COALESCE(v_reservation->>'reason','unknown');
  END IF;

  RETURN jsonb_build_object(
    'ok',true,'orderId',v_order_id,'orderItemId',v_order_item_id,
    'projectionId',v_projection.id,'supplierOfferId',v_offer.id,
    'supplierCatalogItemId',v_offer.supplier_catalog_item_id,
    'supplierExternalVariantRef',v_catalog_item.external_variant_ref,
    'pricingSnapshotId',v_price.id,'amount',v_total,'currency',v_price.currency,
    'reservation',v_reservation,'marketplaceOperator','Loadify Market',
    'sellerOfRecord',v_supplier_name,'invoiceIssuer',v_supplier_name,
    'supplierCommercialProfileId',v_profile.id,'supplierCommercialProfileVersion',v_profile.version,
    'supplierSettlementModel',v_profile.settlement_model,
    'offerSelectedBy','provider_neutral_selection_v1','paymentSessionCreated',false,'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) TO service_role;

COMMENT ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) IS
'Creates a future supplier marketplace order with the independent supplier as seller/invoice issuer and snapshots the exact verified supplier commercial profile. Loadify remains marketplace operator. No provider order or payment is created here.';

CREATE OR REPLACE FUNCTION public.server_supplier_commercial_profile_snapshot_v1(
  p_profile_id uuid,
  p_supplier_id uuid,
  p_market_code text,
  p_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'')));
BEGIN
  IF p_profile_id IS NULL OR p_supplier_id IS NULL OR p_version IS NULL OR p_version<1 OR v_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_supplier_commercial_profile_snapshot','interfaceVersion',1);
  END IF;
  SELECT * INTO v_profile
  FROM private.supplier_commercial_profiles
  WHERE id=p_profile_id
    AND supplier_id=p_supplier_id
    AND market_code=v_market
    AND version=p_version
    AND status IN ('verified','retired');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_commercial_profile_snapshot_not_found','interfaceVersion',1);
  END IF;
  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_commercial_profile_snapshot',
    'profileId',v_profile.id,'supplierId',v_profile.supplier_id,'marketCode',v_profile.market_code,'version',v_profile.version,
    'status',v_profile.status,'pricingModel',v_profile.pricing_model,
    'processorFeePayer',v_profile.processor_fee_payer,'connectFeePayer',v_profile.connect_fee_payer,'payoutFeePayer',v_profile.payout_fee_payer,
    'settlementModel',v_profile.settlement_model,'settlementTrigger',v_profile.settlement_trigger,
    'settlementMinimumAmount',v_profile.settlement_minimum_amount,'settlementCurrency',v_profile.settlement_currency,
    'supplierPayableBasis',v_profile.supplier_payable_basis,
    'supplierPayableFixedAmount',v_profile.supplier_payable_fixed_amount,
    'supplierPayableFormula',v_profile.supplier_payable_formula,
    'settlementSchedule',v_profile.settlement_schedule,
    'manualOrderingAllowed',v_profile.manual_ordering_allowed,'electronicOrderingAllowed',v_profile.electronic_ordering_allowed,
    'reviewedAt',v_profile.reviewed_at,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_commercial_profile_snapshot_v1(uuid,uuid,text,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commercial_profile_snapshot_v1(uuid,uuid,text,integer)
  TO service_role;
