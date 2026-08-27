-- 680_supplier_payment_order_materialisation.sql
-- E2E remediation Stage 4B: supplier-fulfilled payment-session truth and paid-order materialisation.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_tax_decision_snapshot_coherence_check,
  ADD CONSTRAINT orders_tax_decision_snapshot_coherence_check CHECK (
    (
      "taxDecisionSnapshot" IS NULL AND "taxDecisionSource" IS NULL AND "taxDecisionCapturedAt" IS NULL
    )
    OR (
      jsonb_typeof("taxDecisionSnapshot")='object'
      AND "taxDecisionSource"='checkout_verified_tax_v1'
      AND "taxDecisionCapturedAt" IS NOT NULL
      AND "taxDecisionSnapshot"->>'version'='1'
      AND "taxDecisionSnapshot"->>'jurisdiction'='GB'
      AND "taxDecisionSnapshot"->>'destinationCountry'='GB'
      AND "taxDecisionSnapshot"->>'treatment'='seller_non_vat_declared'
      AND "taxDecisionSnapshot"->>'sellerVatRegistered'='false'
      AND "taxDecisionSnapshot"->>'sellerDeclarationVersion'='1'
      AND "taxDecisionSnapshot"->>'sellerDeclarationSource'='seller_self_declaration_v1'
      AND NULLIF(BTRIM("taxDecisionSnapshot"->>'sellerDeclarationCapturedAt'),'') IS NOT NULL
      AND "taxDecisionSnapshot"->>'reverseCharge'='false'
      AND "taxDecisionSnapshot"->>'vatAmountPence'='0'
      AND "taxDecisionSnapshot"->>'evidenceSource'='seller_profile_and_product_tax_evidence_v1'
      AND "taxDecisionSnapshot"->>'evidenceVersion'='1'
    )
    OR (
      jsonb_typeof("taxDecisionSnapshot")='object'
      AND "taxDecisionSource"='supplier_pricing_snapshot_v1'
      AND "taxDecisionCapturedAt" IS NOT NULL
      AND "taxDecisionSnapshot"->>'version'='1'
      AND "taxDecisionSnapshot"->>'jurisdiction'='GB'
      AND "taxDecisionSnapshot"->>'commercialMode'='loadify_supplier_fulfilled'
      AND NULLIF(BTRIM("taxDecisionSnapshot"->>'destinationCountry'),'') IS NOT NULL
      AND jsonb_typeof("taxDecisionSnapshot"->'items')='array'
      AND jsonb_array_length("taxDecisionSnapshot"->'items')>0
      AND jsonb_typeof("taxDecisionSnapshot"->'taxAmountPence')='number'
      AND "taxDecisionSnapshot"->>'evidenceSource'='supplier_pricing_snapshots_v1'
    )
  );

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_tax_treatment_snapshot_coherence_check,
  ADD CONSTRAINT order_items_tax_treatment_snapshot_coherence_check CHECK (
    (
      "taxTreatmentSnapshot" IS NULL AND "taxTreatmentSource" IS NULL AND "taxTreatmentCapturedAt" IS NULL
    )
    OR (
      jsonb_typeof("taxTreatmentSnapshot")='object'
      AND "taxTreatmentSource"='checkout_verified_tax_v1'
      AND "taxTreatmentCapturedAt" IS NOT NULL
      AND "taxTreatmentSnapshot"->>'treatment'='seller_non_vat_declared'
      AND "taxTreatmentSnapshot"->>'evidenceVersion'='1'
      AND "taxTreatmentSnapshot"->>'vatRate'='0'
    )
    OR (
      jsonb_typeof("taxTreatmentSnapshot")='object'
      AND "taxTreatmentSource"='supplier_pricing_snapshot_v1'
      AND "taxTreatmentCapturedAt" IS NOT NULL
      AND "taxTreatmentSnapshot"->>'treatment'='supplier_pricing_snapshot'
      AND NULLIF(BTRIM("taxTreatmentSnapshot"->>'pricingSnapshotId'),'') IS NOT NULL
      AND NULLIF(BTRIM("taxTreatmentSnapshot"->>'taxRuleVersionId'),'') IS NOT NULL
      AND jsonb_typeof("taxTreatmentSnapshot"->'taxAmountPence')='number'
    )
  );

CREATE OR REPLACE FUNCTION private.payment_session_has_supplier_snapshot_v2(p_metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE v_buyer jsonb; v_platform jsonb; v_item jsonb;
BEGIN
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata)<>'object'
     OR p_metadata->>'commercialSnapshotVersion'<>'2'
     OR p_metadata->>'commercialMode'<>'loadify_supplier_fulfilled'
     OR NULLIF(BTRIM(p_metadata->>'orderId'),'') IS NULL
     OR NULLIF(BTRIM(p_metadata->>'buyerId'),'') IS NULL
     OR jsonb_typeof(p_metadata->'totalPence')<>'number'
     OR jsonb_typeof(p_metadata->'shippingAmountPence')<>'number'
     OR jsonb_typeof(p_metadata->'taxAmountPence')<>'number'
     OR jsonb_typeof(p_metadata->'taxSnapshot')<>'object'
     OR p_metadata->'taxSnapshot'->>'version'<>'1'
     OR p_metadata->'taxSnapshot'->>'jurisdiction'<>'GB'
     OR p_metadata->'taxSnapshot'->>'commercialMode'<>'loadify_supplier_fulfilled'
     OR p_metadata->'taxSnapshot'->>'evidenceSource'<>'supplier_pricing_snapshots_v1'
  THEN RETURN false; END IF;

  v_buyer:=p_metadata->'buyerSnapshot';
  IF jsonb_typeof(v_buyer)<>'object'
     OR NULLIF(BTRIM(v_buyer->>'id'),'') IS NULL
     OR v_buyer->>'id'<>p_metadata->>'buyerId'
     OR NULLIF(BTRIM(v_buyer->>'name'),'') IS NULL
     OR NULLIF(BTRIM(v_buyer->>'email'),'') IS NULL
     OR jsonb_typeof(v_buyer->'isB2B')<>'boolean'
     OR jsonb_typeof(v_buyer->'reverseCharge')<>'boolean' THEN RETURN false; END IF;

  v_platform:=p_metadata->'platformSnapshot';
  IF jsonb_typeof(v_platform)<>'object'
     OR NULLIF(BTRIM(v_platform->>'legalSellerRef'),'') IS NULL
     OR NULLIF(BTRIM(v_platform->>'legalSellerName'),'') IS NULL
     OR v_platform->>'merchantOfRecordRef'<>v_platform->>'legalSellerRef'
     OR v_platform->>'invoiceIssuerRef'<>v_platform->>'legalSellerRef'
     OR v_platform->>'paymentRecipientRef'<>v_platform->>'legalSellerRef'
     OR v_platform->>'merchantOfRecordName'<>v_platform->>'legalSellerName'
     OR v_platform->>'invoiceIssuerName'<>v_platform->>'legalSellerName'
     OR v_platform->>'paymentRecipientName'<>v_platform->>'legalSellerName'
     OR v_platform->>'returnResponsibility'<>'loadify' THEN RETURN false; END IF;

  IF jsonb_typeof(p_metadata->'items')<>'array' OR jsonb_array_length(p_metadata->'items')=0 THEN RETURN false; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_metadata->'items') LOOP
    IF jsonb_typeof(v_item)<>'object'
       OR NULLIF(BTRIM(v_item->>'productId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'title'),'') IS NULL
       OR v_item->>'listingContext'<>'product'
       OR jsonb_typeof(v_item->'quantity')<>'number'
       OR (v_item->>'quantity')::numeric<=0
       OR (v_item->>'quantity')::numeric<>trunc((v_item->>'quantity')::numeric)
       OR jsonb_typeof(v_item->'unitPricePence')<>'number'
       OR (v_item->>'unitPricePence')::numeric<=0
       OR NULLIF(BTRIM(v_item->>'canonicalProductId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'supplierOfferId'),'') IS NULL
       OR NOT (v_item ? 'supplierVariantRef')
       OR NULLIF(BTRIM(v_item->>'pricingSnapshotId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'stockObservationId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'priceObservationId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'reservationId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'fulfilmentLegId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'shippingDecisionId'),'') IS NULL
       OR NULLIF(BTRIM(v_item->>'shippingServiceRef'),'') IS NULL
       OR NOT (v_item ? 'image')
       OR jsonb_typeof(v_item->'image') NOT IN ('string','null') THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION private.payment_session_has_supplier_snapshot_v2(jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.enforce_payment_session_commercial_snapshot_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF private.payment_session_has_commercial_snapshot_v1(NEW.metadata) IS DISTINCT FROM true
     AND private.payment_session_has_supplier_snapshot_v2(NEW.metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'payment session rejected: complete marketplace v1 or supplier-fulfilled v2 commercial evidence is required after cutover';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_payment_session_commercial_snapshot_v1() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.server_materialize_paid_supplier_order_v1(p_payment_session_id uuid,p_payment_intent_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_session public.payment_sessions%ROWTYPE; v_metadata jsonb; v_buyer jsonb; v_platform jsonb; v_tax jsonb; v_item jsonb;
  v_order public.orders%ROWTYPE; v_order_item public.order_items%ROWTYPE; v_res private.supplier_stock_reservations%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE; v_order_id uuid; v_buyer_id uuid; v_total_pence bigint;
  v_shipping_pence bigint; v_tax_pence bigint; v_total numeric; v_item_count integer:=0; v_first_paid_transition boolean:=false;
BEGIN
  IF p_payment_session_id IS NULL OR NULLIF(BTRIM(p_payment_intent_id),'') IS NULL THEN
    RAISE EXCEPTION 'supplier paid-order materialisation requires payment session and PaymentIntent' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_session FROM public.payment_sessions WHERE id=p_payment_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier payment session not found' USING ERRCODE='P0002'; END IF;
  IF v_session.status NOT IN ('pending','completed') THEN RAISE EXCEPTION 'supplier payment session status % is not processable',v_session.status USING ERRCODE='P0001'; END IF;
  IF upper(BTRIM(v_session.currency))<>'GBP' THEN RAISE EXCEPTION 'supplier payment session currency must be GBP' USING ERRCODE='22023'; END IF;

  v_metadata:=v_session.metadata;
  IF private.payment_session_has_supplier_snapshot_v2(v_metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'complete supplier-fulfilled commercial snapshot v2 is required' USING ERRCODE='22023';
  END IF;
  v_buyer:=v_metadata->'buyerSnapshot'; v_platform:=v_metadata->'platformSnapshot'; v_tax:=v_metadata->'taxSnapshot';
  v_order_id:=(v_metadata->>'orderId')::uuid; v_buyer_id:=(v_buyer->>'id')::uuid;
  v_total_pence:=(v_metadata->>'totalPence')::bigint; v_shipping_pence:=(v_metadata->>'shippingAmountPence')::bigint;
  v_tax_pence:=(v_metadata->>'taxAmountPence')::bigint; v_total:=v_total_pence::numeric/100;

  IF v_total_pence<=0 OR v_shipping_pence<0 OR v_tax_pence<0
     OR round(v_session.amount*100)::bigint IS DISTINCT FROM v_total_pence
     OR v_session."userId" IS DISTINCT FROM v_buyer_id OR v_session."orderId" IS DISTINCT FROM v_order_id
     OR (v_session."stripePaymentIntent" IS NOT NULL AND v_session."stripePaymentIntent"<>p_payment_intent_id) THEN
    RAISE EXCEPTION 'supplier payment session conflicts with persisted commercial evidence' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pre-payment canonical supplier order is required' USING ERRCODE='P0002'; END IF;
  IF v_order."buyerId" IS DISTINCT FROM v_buyer_id OR v_order."sellerId" IS NOT NULL
     OR v_order."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled' OR v_order.total IS DISTINCT FROM v_total
     OR v_order."legalSellerRefSnapshot" IS DISTINCT FROM v_platform->>'legalSellerRef'
     OR v_order."merchantOfRecordRefSnapshot" IS DISTINCT FROM v_platform->>'merchantOfRecordRef'
     OR v_order."invoiceIssuerRefSnapshot" IS DISTINCT FROM v_platform->>'invoiceIssuerRef'
     OR v_order."paymentRecipientRefSnapshot" IS DISTINCT FROM v_platform->>'paymentRecipientRef'
     OR v_order."returnResponsibilitySnapshot" IS DISTINCT FROM 'loadify'
     OR v_order."taxDecisionSource" IS DISTINCT FROM 'supplier_pricing_snapshot_v1'
     OR v_order."taxDecisionSnapshot" IS DISTINCT FROM v_tax THEN
    RAISE EXCEPTION 'pre-payment supplier order conflicts with payment evidence' USING ERRCODE='P0001';
  END IF;
  IF v_order.status NOT IN ('awaiting_payment','paid') THEN RAISE EXCEPTION 'pre-payment supplier order status % is not processable',v_order.status USING ERRCODE='P0001'; END IF;
  IF v_order."stripePaymentIntentId" IS NOT NULL AND v_order."stripePaymentIntentId"<>p_payment_intent_id THEN RAISE EXCEPTION 'supplier order PaymentIntent identity cannot change' USING ERRCODE='P0001'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_metadata->'items') LOOP
    v_item_count:=v_item_count+1;
    SELECT * INTO v_order_item FROM public.order_items oi
     WHERE oi."orderId"=v_order_id AND oi."productId"=(v_item->>'productId')::uuid FOR UPDATE;
    IF NOT FOUND OR v_order_item.quantity IS DISTINCT FROM (v_item->>'quantity')::integer
       OR round(v_order_item."pricePerUnit"*100)::bigint IS DISTINCT FROM (v_item->>'unitPricePence')::bigint
       OR v_order_item."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
       OR v_order_item."supplierCanonicalProductIdSnapshot" IS DISTINCT FROM (v_item->>'canonicalProductId')::uuid
       OR v_order_item."supplierOfferIdSnapshot" IS DISTINCT FROM (v_item->>'supplierOfferId')::uuid
       OR v_order_item."supplierVariantRefSnapshot" IS DISTINCT FROM COALESCE(v_item->>'supplierVariantRef','')
       OR v_order_item."fulfillerTypeSnapshot" IS DISTINCT FROM 'supplier'
       OR v_order_item."productSnapshotSource" IS DISTINCT FROM 'checkout_verified'
       OR v_order_item."taxTreatmentSource" IS DISTINCT FROM 'supplier_pricing_snapshot_v1'
       OR v_order_item."taxTreatmentSnapshot"->>'pricingSnapshotId' IS DISTINCT FROM v_item->>'pricingSnapshotId' THEN
      RAISE EXCEPTION 'supplier order item conflicts with payment route evidence' USING ERRCODE='P0001';
    END IF;

    SELECT * INTO v_res FROM private.supplier_stock_reservations r
     WHERE r.id=(v_item->>'reservationId')::uuid AND r.order_id=v_order_id AND r.order_item_id=v_order_item.id
       AND r.supplier_offer_id=(v_item->>'supplierOfferId')::uuid AND r.pricing_snapshot_id=(v_item->>'pricingSnapshotId')::uuid
       AND r.status='active' AND r.expires_at>now() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'active supplier reservation required at payment materialisation' USING ERRCODE='P0001'; END IF;

    SELECT * INTO v_leg FROM private.supplier_fulfilment_legs l
     WHERE l.id=(v_item->>'fulfilmentLegId')::uuid AND l.orchestration_id=v_res.orchestration_id
       AND l.supplier_offer_id=v_res.supplier_offer_id AND l.commercial_mode='loadify_supplier_fulfilled';
    IF NOT FOUND THEN RAISE EXCEPTION 'supplier fulfilment leg identity mismatch at payment materialisation' USING ERRCODE='P0001'; END IF;
  END LOOP;

  IF v_item_count<>jsonb_array_length(v_metadata->'items')
     OR v_item_count<>(SELECT count(*) FROM public.order_items oi WHERE oi."orderId"=v_order_id) THEN
    RAISE EXCEPTION 'supplier payment item set does not match canonical order item set' USING ERRCODE='P0001';
  END IF;

  IF v_order.status='awaiting_payment' THEN
    UPDATE public.orders SET status='paid',"stripePaymentIntentId"=p_payment_intent_id,"updatedAt"=now()
     WHERE id=v_order.id AND status='awaiting_payment' RETURNING * INTO v_order;
    IF NOT FOUND THEN RAISE EXCEPTION 'supplier paid transition lost expected state' USING ERRCODE='40001'; END IF;
    v_first_paid_transition:=true;
  ELSE v_first_paid_transition:=false;
  END IF;

  UPDATE public.payment_sessions SET "stripePaymentIntent"=p_payment_intent_id,status='completed',amount=v_total,"updatedAt"=now()
   WHERE id=v_session.id;

  RETURN jsonb_build_object('orderId',v_order.id,'orderNumber',v_order."orderNumber",'commercialMode','loadify_supplier_fulfilled',
    'sellerId',NULL,'customerTotal',v_total,'firstPaidTransition',v_first_paid_transition,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_materialize_paid_supplier_order_v1(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_materialize_paid_supplier_order_v1(uuid,text) TO service_role;
