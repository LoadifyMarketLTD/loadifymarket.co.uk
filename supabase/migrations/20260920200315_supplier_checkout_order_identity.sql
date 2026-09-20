ALTER TABLE public.orders
  ALTER COLUMN "sellerId" DROP NOT NULL,
  ALTER COLUMN "productId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "commercialMode" text,
  ADD COLUMN IF NOT EXISTS "canonicalProductId" uuid REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierOfferId" uuid REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierCatalogItemId" uuid REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierProjectionId" uuid REFERENCES private.supplier_marketplace_projections(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "pricingSnapshotId" uuid REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "legalSellerIdentitySnapshot" text,
  ADD COLUMN IF NOT EXISTS "merchantOfRecordSnapshot" text,
  ADD COLUMN IF NOT EXISTS "invoiceIssuerSnapshot" text,
  ADD COLUMN IF NOT EXISTS "paymentRecipientSnapshot" text;

ALTER TABLE public.order_items
  ALTER COLUMN "productId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "canonicalProductId" uuid REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierOfferId" uuid REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "pricingSnapshotId" uuid REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='orders_supplier_commercial_mode_check'
      AND conrelid='public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_supplier_commercial_mode_check
    CHECK (
      "commercialMode" IS NULL
      OR "commercialMode" IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='orders_supplier_identity_coherence_check'
      AND conrelid='public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_supplier_identity_coherence_check
    CHECK (
      "commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled'
      OR (
        "sellerId" IS NULL AND "productId" IS NULL
        AND "canonicalProductId" IS NOT NULL
        AND "supplierOfferId" IS NOT NULL
        AND "supplierCatalogItemId" IS NOT NULL
        AND "supplierProjectionId" IS NOT NULL
        AND "pricingSnapshotId" IS NOT NULL
      )
    );
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.server_prepare_supplier_checkout_v1(
  p_buyer_id uuid,
  p_projection_id uuid,
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
  v_offer private.supplier_offers%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_buyer public.users%ROWTYPE;
  v_order_id uuid;
  v_order_item_id uuid;
  v_reservation jsonb;
  v_subtotal numeric(12,2);
  v_tax numeric(12,2);
  v_shipping numeric(12,2);
  v_total numeric(12,2);
BEGIN
  IF p_buyer_id IS NULL OR p_projection_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'buyer, projection and correlation identity are required';
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

  SELECT * INTO v_offer FROM private.supplier_offers
  WHERE id=v_projection.supplier_offer_id
    AND canonical_product_id=v_projection.canonical_product_id
    AND supplier_catalog_item_id=v_projection.supplier_catalog_item_id
    AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved supplier offer is required'; END IF;
  SELECT * INTO v_price FROM private.supplier_pricing_snapshots
  WHERE id=(
    SELECT NULLIF(
      public.server_supplier_commercial_decision_v1(
        v_projection.supplier_offer_id,
        v_projection.canonical_product_id,
        'loadify_supplier_fulfilled',
        'GB'
      )->>'pricingSnapshotId',''
    )::uuid
  )
    AND status='approved'
    AND commercial_mode='loadify_supplier_fulfilled';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved supplier pricing snapshot is required'; END IF;

  v_subtotal:=ROUND((v_price.merchandise_amount+v_price.mandatory_fee_amount)::numeric,2);
  v_tax:=ROUND(v_price.tax_amount::numeric,2);
  v_shipping:=ROUND(v_price.customer_shipping_charge::numeric,2);
  v_total:=ROUND(v_price.gross_customer_price::numeric,2);

  INSERT INTO public.orders(
    "buyerId","sellerId","productId",quantity,subtotal,"vatAmount","shippingAmount",total,
    commission,status,"escrowStatus","shippingAddress","billingAddress",
    "commercialMode","canonicalProductId","supplierOfferId","supplierCatalogItemId",
    "supplierProjectionId","pricingSnapshotId","legalSellerIdentitySnapshot",
    "merchantOfRecordSnapshot","invoiceIssuerSnapshot","paymentRecipientSnapshot"
  ) VALUES(
    p_buyer_id,NULL,NULL,1,v_subtotal,v_tax,v_shipping,v_total,
    0,'awaiting_payment','held',COALESCE(p_shipping_address,'{}'::jsonb),COALESCE(p_billing_address,'{}'::jsonb),
    'loadify_supplier_fulfilled',v_projection.canonical_product_id,v_projection.supplier_offer_id,
    v_projection.supplier_catalog_item_id,v_projection.id,v_price.id,
    'XDrive Logistics Ltd trading as Loadify Market','Loadify Market','Loadify Market','Loadify Market'
  ) RETURNING id INTO v_order_id;
  INSERT INTO public.order_items(
    "orderId","productId",quantity,"pricePerUnit","vatRate",subtotal,
    "canonicalProductId","supplierOfferId","pricingSnapshotId",
    "productTitleSnapshot","listingContextSnapshot","productSnapshotSource","productSnapshotCapturedAt"
  ) VALUES(
    v_order_id,NULL,1,v_subtotal,0,v_subtotal,
    v_projection.canonical_product_id,v_projection.supplier_offer_id,v_price.id,
    COALESCE(NULLIF(BTRIM(v_projection.projection_payload->>'title'),''),
      'Loadify supplier product'),
    'product','checkout_verified',now()
  ) RETURNING id INTO v_order_item_id;

  v_reservation:=public.server_reserve_supplier_offer_v1(
    v_order_id,v_order_item_id,v_projection.supplier_offer_id,
    'loadify_supplier_fulfilled',1,'GB','',
    BTRIM(p_reservation_key),BTRIM(p_orchestration_idempotency_key),
    p_correlation_id,'{}'::jsonb,'supplier_commerce_default',30
  );
  IF COALESCE((v_reservation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier reservation failed: %',COALESCE(v_reservation->>'reason','unknown');
  END IF;

  RETURN jsonb_build_object(
    'ok',true,'orderId',v_order_id,'orderItemId',v_order_item_id,
    'projectionId',v_projection.id,'supplierOfferId',v_projection.supplier_offer_id,
    'pricingSnapshotId',v_price.id,'amount',v_total,'currency',v_price.currency,
    'reservation',v_reservation,'merchantOfRecord','Loadify Market',
    'sellerOfRecord','XDrive Logistics Ltd trading as Loadify Market',
    'paymentSessionCreated',false,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_prepare_supplier_checkout_v1(
  uuid,uuid,jsonb,jsonb,text,text,uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_checkout_v1(
  uuid,uuid,jsonb,jsonb,text,text,uuid
) TO service_role;

COMMENT ON FUNCTION public.server_prepare_supplier_checkout_v1(
  uuid,uuid,jsonb,jsonb,text,text,uuid
) IS
'Creates the canonical awaiting-payment Loadify Supplier-Fulfilled order and reserves supplier stock atomically. No Stripe session is created here.';
