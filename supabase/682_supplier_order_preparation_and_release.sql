-- 682_supplier_order_preparation_and_release.sql
-- E2E remediation Stage 5B: canonical pre-payment order + reservation binding + safe release.
--
-- One public.orders row remains the customer order truth. This migration creates no
-- supplier/provider records, enables no Supplier Commerce control and performs no
-- external provider call. It closes the pre-payment seam so a supplier-fulfilled
-- payment may only be created from an atomically prepared order, exact shipping
-- decision and active reservation.

CREATE SCHEMA IF NOT EXISTS private;

-- The legacy offers engine was retired by migration 595. Its global one-active-order
-- per listing index is incompatible with fixed-price stock and Supplier Commerce,
-- where multiple buyers may legitimately have distinct reserved units.
DROP INDEX IF EXISTS public.one_active_order_per_listing;

-- Supplier tax truth is versioned JSON evidence. The legacy scalar vatRate cannot
-- safely represent every supplier tax rule, so supplier-fulfilled order items may
-- leave it NULL while the immutable taxTreatmentSnapshot remains authoritative.
ALTER TABLE public.order_items
  ALTER COLUMN "vatRate" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "supplierShippingDecisionIdSnapshot" uuid REFERENCES private.supplier_shipping_decisions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierShippingServiceRefSnapshot" text,
  ADD COLUMN IF NOT EXISTS "supplierShippingCostMinorSnapshot" bigint,
  ADD COLUMN IF NOT EXISTS "customerShippingChargeSnapshot" numeric(12,2),
  ADD COLUMN IF NOT EXISTS "shippingCurrencySnapshot" text;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_supplier_shipping_snapshot_shape_check,
  ADD CONSTRAINT order_items_supplier_shipping_snapshot_shape_check CHECK (
    (
      "commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
      AND "supplierShippingDecisionIdSnapshot" IS NULL
      AND "supplierShippingServiceRefSnapshot" IS NULL
      AND "supplierShippingCostMinorSnapshot" IS NULL
      AND "customerShippingChargeSnapshot" IS NULL
      AND "shippingCurrencySnapshot" IS NULL
    )
    OR (
      "commercialModeSnapshot"='loadify_supplier_fulfilled'
      AND "supplierShippingDecisionIdSnapshot" IS NOT NULL
      AND NULLIF(BTRIM("supplierShippingServiceRefSnapshot"),'') IS NOT NULL
      AND "supplierShippingCostMinorSnapshot">=0
      AND "customerShippingChargeSnapshot">=0
      AND "shippingCurrencySnapshot"='GBP'
    )
  );

CREATE INDEX IF NOT EXISTS order_items_supplier_shipping_decision_idx
  ON public.order_items("supplierShippingDecisionIdSnapshot")
  WHERE "commercialModeSnapshot"='loadify_supplier_fulfilled';

CREATE OR REPLACE FUNCTION private.protect_order_item_supplier_shipping_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW."commercialModeSnapshot"='loadify_supplier_fulfilled' THEN
    IF NEW."supplierShippingDecisionIdSnapshot" IS NULL
       OR NULLIF(BTRIM(NEW."supplierShippingServiceRefSnapshot"),'') IS NULL
       OR NEW."supplierShippingCostMinorSnapshot" IS NULL
       OR NEW."customerShippingChargeSnapshot" IS NULL
       OR NEW."shippingCurrencySnapshot" IS DISTINCT FROM 'GBP' THEN
      RAISE EXCEPTION 'supplier-fulfilled order item requires complete shipping snapshot';
    END IF;
  END IF;

  IF TG_OP='UPDATE' THEN
    IF NEW."supplierShippingDecisionIdSnapshot" IS DISTINCT FROM OLD."supplierShippingDecisionIdSnapshot"
       OR NEW."supplierShippingServiceRefSnapshot" IS DISTINCT FROM OLD."supplierShippingServiceRefSnapshot"
       OR NEW."supplierShippingCostMinorSnapshot" IS DISTINCT FROM OLD."supplierShippingCostMinorSnapshot"
       OR NEW."customerShippingChargeSnapshot" IS DISTINCT FROM OLD."customerShippingChargeSnapshot"
       OR NEW."shippingCurrencySnapshot" IS DISTINCT FROM OLD."shippingCurrencySnapshot" THEN
      RAISE EXCEPTION 'order item supplier shipping snapshot is immutable once captured';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_order_item_supplier_shipping_snapshot_v1()
  FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS trg_protect_order_item_supplier_shipping_snapshot_v1 ON public.order_items;
CREATE TRIGGER trg_protect_order_item_supplier_shipping_snapshot_v1
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION private.protect_order_item_supplier_shipping_snapshot_v1();

CREATE TABLE IF NOT EXISTS private.supplier_checkout_preparations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_key text NOT NULL UNIQUE,
  request_fingerprint text NOT NULL,
  correlation_id uuid NOT NULL,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  public_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity>0),
  shipping_decision_id uuid NOT NULL UNIQUE REFERENCES private.supplier_shipping_decisions(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL UNIQUE REFERENCES public.order_items(id) ON DELETE RESTRICT,
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid NOT NULL REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  reservation_id uuid NOT NULL UNIQUE REFERENCES private.supplier_stock_reservations(id) ON DELETE RESTRICT,
  payment_snapshot jsonb NOT NULL,
  state text NOT NULL DEFAULT 'prepared',
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  paid_at timestamptz,
  release_reason text,
  CONSTRAINT supplier_checkout_preparation_key_check CHECK (NULLIF(BTRIM(preparation_key),'') IS NOT NULL),
  CONSTRAINT supplier_checkout_preparation_fingerprint_check CHECK (request_fingerprint ~ '^[0-9a-f]{32}$'),
  CONSTRAINT supplier_checkout_preparation_snapshot_check CHECK (jsonb_typeof(payment_snapshot)='object' AND payment_snapshot<>'{}'::jsonb),
  CONSTRAINT supplier_checkout_preparation_state_check CHECK (state IN ('prepared','released','paid','cancelled')),
  CONSTRAINT supplier_checkout_preparation_terminal_check CHECK (
    (state='prepared' AND released_at IS NULL AND paid_at IS NULL AND release_reason IS NULL)
    OR (state IN ('released','cancelled') AND released_at IS NOT NULL AND paid_at IS NULL AND NULLIF(BTRIM(release_reason),'') IS NOT NULL)
    OR (state='paid' AND paid_at IS NOT NULL AND released_at IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS supplier_checkout_preparation_order_idx
  ON private.supplier_checkout_preparations(order_id,state,created_at DESC);
CREATE INDEX IF NOT EXISTS supplier_checkout_preparation_buyer_idx
  ON private.supplier_checkout_preparations(buyer_id,state,created_at DESC);
REVOKE ALL ON TABLE private.supplier_checkout_preparations FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.protect_supplier_checkout_preparation_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'supplier checkout preparation history cannot be deleted';
  END IF;
  IF NEW.preparation_key IS DISTINCT FROM OLD.preparation_key
     OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
     OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.public_product_id IS DISTINCT FROM OLD.public_product_id
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.shipping_decision_id IS DISTINCT FROM OLD.shipping_decision_id
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.order_item_id IS DISTINCT FROM OLD.order_item_id
     OR NEW.orchestration_id IS DISTINCT FROM OLD.orchestration_id
     OR NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id
     OR NEW.reservation_id IS DISTINCT FROM OLD.reservation_id
     OR NEW.payment_snapshot IS DISTINCT FROM OLD.payment_snapshot
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'supplier checkout preparation identity/evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_supplier_checkout_preparation_v1 ON private.supplier_checkout_preparations;
CREATE TRIGGER trg_protect_supplier_checkout_preparation_v1
BEFORE UPDATE OR DELETE ON private.supplier_checkout_preparations
FOR EACH ROW EXECUTE FUNCTION private.protect_supplier_checkout_preparation_v1();

-- Reservation v2 closes the remaining pilot/control and order-route seams in the
-- Phase I reservation function. The older v1 function is retained for historical
-- simulator/replay compatibility but is not used by the new buyer checkout path.
CREATE OR REPLACE FUNCTION public.server_reserve_supplier_checkout_v2(
  p_order_id uuid,
  p_order_item_id uuid,
  p_reservation_key text,
  p_orchestration_idempotency_key text,
  p_correlation_id uuid,
  p_risk_signals jsonb DEFAULT '{}'::jsonb,
  p_risk_policy_key text DEFAULT 'supplier_commerce_default',
  p_reservation_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_shipping private.supplier_shipping_decisions%ROWTYPE;
  v_checkout jsonb;
  v_control jsonb;
  v_risk jsonb;
  v_orch private.supplier_order_orchestrations%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_leg_item private.supplier_fulfilment_leg_items%ROWTYPE;
  v_existing private.supplier_stock_reservations%ROWTYPE;
  v_reservation private.supplier_stock_reservations%ROWTYPE;
  v_sellable integer;
  v_already_reserved integer:=0;
  v_available integer;
  v_res_key text:=BTRIM(COALESCE(p_reservation_key,''));
  v_orch_key text:=BTRIM(COALESCE(p_orchestration_idempotency_key,''));
BEGIN
  IF p_order_id IS NULL OR p_order_item_id IS NULL OR v_res_key='' OR v_orch_key=''
     OR p_correlation_id IS NULL OR p_reservation_minutes NOT BETWEEN 1 AND 60
     OR jsonb_typeof(COALESCE(p_risk_signals,'{}'::jsonb))<>'object' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_supplier_checkout_reservation','interfaceVersion',2);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_not_found','interfaceVersion',2); END IF;
  IF v_order.status<>'awaiting_payment'
     OR v_order."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     OR v_order."sellerId" IS NOT NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','canonical_supplier_order_not_awaiting_payment','interfaceVersion',2);
  END IF;

  SELECT * INTO v_item FROM public.order_items
   WHERE id=p_order_item_id AND "orderId"=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_item_not_found','interfaceVersion',2); END IF;
  IF v_item."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     OR v_item."supplierOfferIdSnapshot" IS NULL
     OR v_item."supplierCanonicalProductIdSnapshot" IS NULL
     OR v_item."supplierShippingDecisionIdSnapshot" IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_item_route_incomplete','interfaceVersion',2);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id=v_item."supplierOfferIdSnapshot"
     AND canonical_product_id=v_item."supplierCanonicalProductIdSnapshot"
     AND status='approved'
   FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',2); END IF;

  SELECT * INTO v_shipping FROM private.supplier_shipping_decisions
   WHERE id=v_item."supplierShippingDecisionIdSnapshot"
     AND public_product_id=v_item."productId"
     AND supplier_offer_id=v_offer.id
     AND service_ref=v_item."supplierShippingServiceRefSnapshot"
     AND currency='GBP';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_shipping_identity_mismatch','interfaceVersion',2); END IF;

  v_checkout:=public.server_supplier_listing_checkout_decision_v1(v_item."productId",v_item.quantity);
  IF COALESCE((v_checkout->>'eligible')::boolean,false) IS DISTINCT FROM true
     OR (v_checkout->>'supplierOfferId')::uuid IS DISTINCT FROM v_offer.id
     OR (v_checkout->>'canonicalProductId')::uuid IS DISTINCT FROM v_offer.canonical_product_id
     OR (v_checkout->>'pricingSnapshotId') IS DISTINCT FROM v_item."taxTreatmentSnapshot"->>'pricingSnapshotId' THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_checkout_recheck_failed','checkout',v_checkout,'interfaceVersion',2);
  END IF;
  v_sellable:=(v_checkout->>'sellableQuantity')::integer;

  v_control:=public.server_supplier_commerce_control_decision_v1('reservation',jsonb_build_object(
    'supplierRef',v_offer.supplier_id::text,
    'offerRef',v_offer.id::text,
    'productRef',v_offer.canonical_product_id::text,
    'territory',v_offer.territory
  ));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_control_disabled','control',v_control,'interfaceVersion',2);
  END IF;

  INSERT INTO private.supplier_order_orchestrations(order_id,buyer_id,correlation_id,idempotency_key)
  VALUES(v_order.id,v_order."buyerId",p_correlation_id,v_orch_key)
  ON CONFLICT(order_id) DO NOTHING;
  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=v_order.id FOR UPDATE;
  IF v_orch.idempotency_key<>v_orch_key OR v_orch.correlation_id<>p_correlation_id THEN
    RAISE EXCEPTION 'supplier checkout orchestration idempotency mismatch';
  END IF;

  v_risk:=public.server_supplier_commerce_risk_decision_v1(
    v_order.id,'order',v_order.id::text,COALESCE(p_risk_signals,'{}'::jsonb),p_risk_policy_key,
    'risk:'||v_res_key,v_orch.id
  );
  UPDATE private.supplier_order_orchestrations
     SET risk_state=lower(COALESCE(v_risk->>'action','block')),
         state=CASE COALESCE(v_risk->>'action','BLOCK') WHEN 'REVIEW' THEN 'review' WHEN 'HOLD' THEN 'hold' WHEN 'RESTRICT' THEN 'hold' WHEN 'BLOCK' THEN 'hold' ELSE state END,
         updated_at=now()
   WHERE id=v_orch.id;
  IF COALESCE((v_risk->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','commerce_risk_not_allowed','risk',v_risk,'orchestrationId',v_orch.id,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_existing FROM private.supplier_stock_reservations WHERE reservation_key=v_res_key;
  IF FOUND THEN
    IF v_existing.order_id<>v_order.id OR v_existing.order_item_id<>v_item.id
       OR v_existing.supplier_offer_id<>v_offer.id OR v_existing.quantity<>v_item.quantity
       OR v_existing.canonical_product_id<>v_offer.canonical_product_id
       OR v_existing.pricing_snapshot_id::text IS DISTINCT FROM v_item."taxTreatmentSnapshot"->>'pricingSnapshotId' THEN
      RAISE EXCEPTION 'supplier checkout reservation idempotency collision';
    END IF;
    RETURN jsonb_build_object(
      'eligible',v_existing.status='active' AND v_existing.expires_at>now(),
      'reason','supplier_checkout_reservation_replayed','reservationId',v_existing.id,
      'orchestrationId',v_existing.orchestration_id,
      'fulfilmentLegId',(SELECT li.leg_id FROM private.supplier_fulfilment_leg_items li WHERE li.id=v_existing.leg_item_id),
      'status',v_existing.status,'expiresAt',v_existing.expires_at,'interfaceVersion',2
    );
  END IF;

  SELECT COALESCE(SUM(r.quantity),0)::integer INTO v_already_reserved
    FROM private.supplier_stock_reservations r
   WHERE r.supplier_offer_id=v_offer.id
     AND r.external_variant_ref=v_item."supplierVariantRefSnapshot"
     AND r.status='active' AND r.expires_at>now();
  v_available:=GREATEST(v_sellable-v_already_reserved,0);
  IF v_item.quantity>v_available THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_capacity_exhausted',
      'sellableQuantity',v_sellable,'alreadyReserved',v_already_reserved,'availableToReserve',v_available,
      'orchestrationId',v_orch.id,'interfaceVersion',2);
  END IF;

  INSERT INTO private.supplier_fulfilment_legs(
    orchestration_id,leg_key,fulfiller_type,commercial_mode,supplier_offer_id,status,currency
  ) VALUES(v_orch.id,'supplier:'||v_offer.id::text,'supplier','loadify_supplier_fulfilled',v_offer.id,'planned','GBP')
  ON CONFLICT(orchestration_id,leg_key) DO NOTHING;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs
   WHERE orchestration_id=v_orch.id AND leg_key='supplier:'||v_offer.id::text FOR UPDATE;

  INSERT INTO private.supplier_fulfilment_leg_items(
    leg_id,order_item_id,canonical_product_id,supplier_offer_id,quantity,external_variant_ref,pricing_snapshot_id
  ) VALUES(
    v_leg.id,v_item.id,v_offer.canonical_product_id,v_offer.id,v_item.quantity,
    v_item."supplierVariantRefSnapshot",(v_item."taxTreatmentSnapshot"->>'pricingSnapshotId')::uuid
  ) ON CONFLICT(order_item_id) DO NOTHING;
  SELECT * INTO v_leg_item FROM private.supplier_fulfilment_leg_items WHERE order_item_id=v_item.id;
  IF v_leg_item.leg_id<>v_leg.id OR v_leg_item.supplier_offer_id<>v_offer.id
     OR v_leg_item.canonical_product_id<>v_offer.canonical_product_id OR v_leg_item.quantity<>v_item.quantity THEN
    RAISE EXCEPTION 'supplier checkout order item already routed differently';
  END IF;

  INSERT INTO private.supplier_stock_reservations(
    orchestration_id,leg_item_id,order_id,order_item_id,supplier_offer_id,canonical_product_id,
    external_variant_ref,quantity,status,reservation_key,stock_observation_id,price_observation_id,
    pricing_snapshot_id,sync_policy_version,expires_at
  ) VALUES(
    v_orch.id,v_leg_item.id,v_order.id,v_item.id,v_offer.id,v_offer.canonical_product_id,
    v_item."supplierVariantRefSnapshot",v_item.quantity,'active',v_res_key,
    (v_checkout->>'stockObservationId')::uuid,(v_checkout->>'priceObservationId')::uuid,
    (v_checkout->>'pricingSnapshotId')::uuid,1,now()+make_interval(mins=>p_reservation_minutes)
  ) RETURNING * INTO v_reservation;

  UPDATE private.supplier_fulfilment_legs SET status='reserved',updated_at=now() WHERE id=v_leg.id;
  UPDATE private.supplier_order_orchestrations SET state='reserved',risk_state='allow',updated_at=now() WHERE id=v_orch.id;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_checkout_stock_reserved','reservationId',v_reservation.id,
    'orchestrationId',v_orch.id,'fulfilmentLegId',v_leg.id,'expiresAt',v_reservation.expires_at,
    'stockObservationId',v_reservation.stock_observation_id,'priceObservationId',v_reservation.price_observation_id,
    'pricingSnapshotId',v_reservation.pricing_snapshot_id,'availableBeforeReservation',v_available,
    'reservedQuantity',v_item.quantity,'risk',v_risk,'interfaceVersion',2
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_reserve_supplier_checkout_v2(uuid,uuid,text,text,uuid,jsonb,text,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_reserve_supplier_checkout_v2(uuid,uuid,text,text,uuid,jsonb,text,integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_checkout_order_v1(
  p_buyer_id uuid,
  p_public_product_id uuid,
  p_quantity integer,
  p_shipping_decision_id uuid,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_idempotency_key text,
  p_correlation_id uuid,
  p_risk_signals jsonb DEFAULT '{}'::jsonb,
  p_risk_policy_key text DEFAULT 'supplier_commerce_default',
  p_reservation_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_key text:=BTRIM(COALESCE(p_idempotency_key,''));
  v_fingerprint text;
  v_existing private.supplier_checkout_preparations%ROWTYPE;
  v_buyer public.users%ROWTYPE;
  v_buyer_profile public.buyer_profiles%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_checkout jsonb;
  v_shipping private.supplier_shipping_decisions%ROWTYPE;
  v_shipping_request private.supplier_shipping_quote_requests%ROWTYPE;
  v_pricing private.supplier_pricing_snapshots%ROWTYPE;
  v_tax private.supplier_tax_rule_versions%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_reservation jsonb;
  v_preparation private.supplier_checkout_preparations%ROWTYPE;
  v_buyer_name text;
  v_is_b2b boolean:=false;
  v_reverse_charge boolean:=false;
  v_unit_price_pence bigint;
  v_customer_shipping_pence bigint;
  v_tax_pence bigint;
  v_total_pence bigint;
  v_subtotal numeric(12,2);
  v_shipping_amount numeric(12,2);
  v_total numeric(12,2);
  v_tax_amount numeric(12,2);
  v_tax_snapshot jsonb;
  v_item_tax_snapshot jsonb;
  v_buyer_snapshot jsonb;
  v_platform_snapshot jsonb;
  v_payment_snapshot jsonb;
  v_image text;
BEGIN
  IF p_buyer_id IS NULL OR p_public_product_id IS NULL OR p_quantity IS NULL OR p_quantity<=0
     OR p_shipping_decision_id IS NULL OR v_key='' OR p_correlation_id IS NULL
     OR jsonb_typeof(COALESCE(p_shipping_address,'{}'::jsonb))<>'object' OR COALESCE(p_shipping_address,'{}'::jsonb)='{}'::jsonb
     OR jsonb_typeof(COALESCE(p_billing_address,'{}'::jsonb))<>'object' OR COALESCE(p_billing_address,'{}'::jsonb)='{}'::jsonb
     OR jsonb_typeof(COALESCE(p_risk_signals,'{}'::jsonb))<>'object'
     OR p_reservation_minutes NOT BETWEEN 1 AND 60 THEN
    RETURN jsonb_build_object('prepared',false,'reason','invalid_supplier_checkout_preparation','interfaceVersion',1);
  END IF;

  -- Serialise the caller-provided idempotency key before any order/reservation write.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key,0));
  v_fingerprint:=md5(concat_ws('|',p_buyer_id::text,p_public_product_id::text,p_quantity::text,
    p_shipping_decision_id::text,p_shipping_address::text,p_billing_address::text));

  SELECT * INTO v_existing FROM private.supplier_checkout_preparations WHERE preparation_key=v_key;
  IF FOUND THEN
    IF v_existing.request_fingerprint<>v_fingerprint OR v_existing.correlation_id<>p_correlation_id THEN
      RAISE EXCEPTION 'supplier checkout preparation idempotency collision';
    END IF;
    RETURN jsonb_build_object(
      'prepared',v_existing.state='prepared','reason','supplier_checkout_preparation_replayed',
      'preparationId',v_existing.id,'orderId',v_existing.order_id,'orderItemId',v_existing.order_item_id,
      'reservationId',v_existing.reservation_id,'fulfilmentLegId',v_existing.fulfilment_leg_id,
      'shippingDecisionId',v_existing.shipping_decision_id,'state',v_existing.state,
      'paymentSnapshot',v_existing.payment_snapshot,'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_buyer FROM public.users WHERE id=p_buyer_id AND "isActive"=true;
  IF NOT FOUND THEN RETURN jsonb_build_object('prepared',false,'reason','active_buyer_required','interfaceVersion',1); END IF;
  SELECT * INTO v_buyer_profile FROM public.buyer_profiles WHERE "userId"=p_buyer_id;

  v_buyer_name:=NULLIF(BTRIM(concat_ws(' ',NULLIF(BTRIM(v_buyer."firstName"),''),NULLIF(BTRIM(v_buyer."lastName"),''))),'');
  IF v_buyer_name IS NULL THEN v_buyer_name:=NULLIF(BTRIM(v_buyer.email),''); END IF;
  IF v_buyer_name IS NULL OR NULLIF(BTRIM(v_buyer.email),'') IS NULL THEN
    RETURN jsonb_build_object('prepared',false,'reason','buyer_identity_incomplete','interfaceVersion',1);
  END IF;
  v_is_b2b:=COALESCE(NULLIF(BTRIM(v_buyer_profile."accountType"),'') IS NOT NULL AND v_buyer_profile."accountType"<>'individual',false);

  SELECT * INTO v_product FROM public.products WHERE id=p_public_product_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('prepared',false,'reason','public_product_not_found','interfaceVersion',1); END IF;

  v_checkout:=public.server_supplier_listing_checkout_decision_v1(p_public_product_id,p_quantity);
  IF COALESCE((v_checkout->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('prepared',false,'reason','supplier_checkout_not_ready','checkout',v_checkout,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_shipping FROM private.supplier_shipping_decisions d
   WHERE d.id=p_shipping_decision_id
     AND d.public_product_id=p_public_product_id
     AND d.supplier_offer_id=(v_checkout->>'supplierOfferId')::uuid
     AND d.pricing_snapshot_id=(v_checkout->>'pricingSnapshotId')::uuid
     AND d.currency='GBP';
  IF NOT FOUND THEN RETURN jsonb_build_object('prepared',false,'reason','selected_supplier_shipping_decision_required','interfaceVersion',1); END IF;
  SELECT * INTO v_shipping_request FROM private.supplier_shipping_quote_requests r
   WHERE r.id=v_shipping.request_id AND r.state='selected' AND r.quantity=p_quantity AND r.destination_country='GB';
  IF NOT FOUND THEN RETURN jsonb_build_object('prepared',false,'reason','supplier_shipping_request_not_selected','interfaceVersion',1); END IF;

  SELECT * INTO v_pricing FROM private.supplier_pricing_snapshots p
   WHERE p.id=(v_checkout->>'pricingSnapshotId')::uuid
     AND p.supplier_offer_id=(v_checkout->>'supplierOfferId')::uuid
     AND p.canonical_product_id=(v_checkout->>'canonicalProductId')::uuid
     AND p.commercial_mode='loadify_supplier_fulfilled' AND p.currency='GBP'
     AND p.status='approved' AND p.valid_from<=now() AND (p.valid_to IS NULL OR p.valid_to>now());
  IF NOT FOUND THEN RETURN jsonb_build_object('prepared',false,'reason','supplier_pricing_snapshot_not_current','interfaceVersion',1); END IF;
  SELECT * INTO v_tax FROM private.supplier_tax_rule_versions t
   WHERE t.id=v_pricing.tax_rule_version_id AND t.status='verified' AND t.territory='GB'
     AND t.commercial_mode='loadify_supplier_fulfilled' AND t.effective_from<=now()
     AND (t.effective_to IS NULL OR t.effective_to>now());
  IF NOT FOUND THEN RETURN jsonb_build_object('prepared',false,'reason','supplier_tax_rule_not_current','interfaceVersion',1); END IF;

  IF jsonb_typeof(v_tax.rule_payload->'reverseCharge')='boolean' THEN
    v_reverse_charge:=(v_tax.rule_payload->>'reverseCharge')::boolean;
  END IF;
  IF v_reverse_charge AND NOT v_is_b2b THEN
    RETURN jsonb_build_object('prepared',false,'reason','supplier_tax_reverse_charge_requires_b2b_buyer','interfaceVersion',1);
  END IF;

  v_unit_price_pence:=round((v_pricing.gross_customer_price-v_pricing.customer_shipping_charge)*100)::bigint;
  v_customer_shipping_pence:=round(v_pricing.customer_shipping_charge*100)::bigint;
  v_tax_pence:=round(v_pricing.tax_amount*100)::bigint*p_quantity;
  v_total_pence:=v_unit_price_pence*p_quantity+v_customer_shipping_pence;
  IF v_unit_price_pence<=0 OR v_customer_shipping_pence<0 OR v_tax_pence<0 OR v_total_pence<=0
     OR v_unit_price_pence IS DISTINCT FROM (v_checkout->>'unitPricePence')::bigint
     OR v_customer_shipping_pence IS DISTINCT FROM (v_checkout->>'customerShippingChargePence')::bigint THEN
    RETURN jsonb_build_object('prepared',false,'reason','supplier_checkout_price_evidence_mismatch','interfaceVersion',1);
  END IF;

  v_subtotal:=(v_unit_price_pence*p_quantity)::numeric/100;
  v_shipping_amount:=v_customer_shipping_pence::numeric/100;
  v_tax_amount:=v_tax_pence::numeric/100;
  v_total:=v_total_pence::numeric/100;
  v_image:=CASE WHEN cardinality(v_product.images)>0 THEN v_product.images[1] ELSE NULL END;

  v_tax_snapshot:=jsonb_build_object(
    'version',1,'jurisdiction','GB','destinationCountry','GB','commercialMode','loadify_supplier_fulfilled',
    'items',jsonb_build_array(jsonb_build_object(
      'productId',v_product.id,'canonicalProductId',v_checkout->>'canonicalProductId',
      'supplierOfferId',v_checkout->>'supplierOfferId','pricingSnapshotId',v_pricing.id,
      'taxRuleVersionId',v_tax.id,'taxAmountPence',v_tax_pence
    )),
    'taxAmountPence',v_tax_pence,'evidenceSource','supplier_pricing_snapshots_v1'
  );
  v_item_tax_snapshot:=jsonb_build_object(
    'treatment','supplier_pricing_snapshot','pricingSnapshotId',v_pricing.id,
    'taxRuleVersionId',v_tax.id,'taxAmountPence',v_tax_pence
  );
  v_buyer_snapshot:=jsonb_build_object(
    'id',v_buyer.id,'name',v_buyer_name,'email',v_buyer.email,
    'companyName',CASE WHEN v_buyer_profile."companyName" IS NULL THEN NULL ELSE BTRIM(v_buyer_profile."companyName") END,
    'vatNumber',CASE WHEN v_buyer_profile."vatNumber" IS NULL THEN NULL ELSE BTRIM(v_buyer_profile."vatNumber") END,
    'isB2B',v_is_b2b,'reverseCharge',v_reverse_charge
  );
  v_platform_snapshot:=jsonb_build_object(
    'legalSellerRef','xdrive-logistics-ltd:13171804',
    'legalSellerName','XDrive Logistics Ltd trading as Loadify Market',
    'merchantOfRecordRef','xdrive-logistics-ltd:13171804',
    'merchantOfRecordName','XDrive Logistics Ltd trading as Loadify Market',
    'invoiceIssuerRef','xdrive-logistics-ltd:13171804',
    'invoiceIssuerName','XDrive Logistics Ltd trading as Loadify Market',
    'paymentRecipientRef','xdrive-logistics-ltd:13171804',
    'paymentRecipientName','XDrive Logistics Ltd trading as Loadify Market',
    'returnResponsibility','loadify'
  );

  INSERT INTO public.orders(
    "buyerId","sellerId","productId",quantity,subtotal,"vatAmount","shippingAmount","discountAmount",total,commission,
    status,"shippingAddress","billingAddress","deliveryMethod","shippingMethod","escrowStatus",
    "buyerNameSnapshot","buyerEmailSnapshot","buyerCompanyNameSnapshot","buyerVatNumberSnapshot","sellerBusinessNameSnapshot",
    "isB2BSnapshot","reverseChargeSnapshot","commercialSnapshotSource","commercialSnapshotCapturedAt",
    "commercialModeSnapshot","commercialModeSnapshotVersion","legalSellerRefSnapshot","legalSellerNameSnapshot",
    "merchantOfRecordRefSnapshot","merchantOfRecordNameSnapshot","invoiceIssuerRefSnapshot","invoiceIssuerNameSnapshot",
    "paymentRecipientRefSnapshot","paymentRecipientNameSnapshot","returnResponsibilitySnapshot",
    "taxDecisionSnapshot","taxDecisionSource","taxDecisionCapturedAt"
  ) VALUES(
    v_buyer.id,NULL,v_product.id,p_quantity,v_subtotal,v_tax_amount,v_shipping_amount,0,v_total,0,
    'awaiting_payment',p_shipping_address,p_billing_address,'delivery',v_shipping.service_ref,'held',
    v_buyer_name,v_buyer.email,v_buyer_profile."companyName",v_buyer_profile."vatNumber",v_platform_snapshot->>'legalSellerName',
    v_is_b2b,v_reverse_charge,'checkout_verified',now(),
    'loadify_supplier_fulfilled',1,v_platform_snapshot->>'legalSellerRef',v_platform_snapshot->>'legalSellerName',
    v_platform_snapshot->>'merchantOfRecordRef',v_platform_snapshot->>'merchantOfRecordName',
    v_platform_snapshot->>'invoiceIssuerRef',v_platform_snapshot->>'invoiceIssuerName',
    v_platform_snapshot->>'paymentRecipientRef',v_platform_snapshot->>'paymentRecipientName','loadify',
    v_tax_snapshot,'supplier_pricing_snapshot_v1',now()
  ) RETURNING * INTO v_order;

  INSERT INTO public.order_items(
    "orderId","productId",quantity,"pricePerUnit","vatRate",subtotal,
    "productTitleSnapshot","productImageSnapshot","listingContextSnapshot","productSnapshotSource","productSnapshotCapturedAt",
    "commercialModeSnapshot","supplierCanonicalProductIdSnapshot","supplierOfferIdSnapshot","supplierVariantRefSnapshot","fulfillerTypeSnapshot",
    "taxTreatmentSnapshot","taxTreatmentSource","taxTreatmentCapturedAt",
    "supplierShippingDecisionIdSnapshot","supplierShippingServiceRefSnapshot","supplierShippingCostMinorSnapshot",
    "customerShippingChargeSnapshot","shippingCurrencySnapshot"
  ) VALUES(
    v_order.id,v_product.id,p_quantity,v_unit_price_pence::numeric/100,NULL,v_subtotal,
    v_product.title,v_image,'product','checkout_verified',now(),
    'loadify_supplier_fulfilled',(v_checkout->>'canonicalProductId')::uuid,(v_checkout->>'supplierOfferId')::uuid,
    COALESCE(v_checkout->>'externalVariantRef',''),'supplier',
    v_item_tax_snapshot,'supplier_pricing_snapshot_v1',now(),
    v_shipping.id,v_shipping.service_ref,v_shipping.supplier_shipping_cost_minor,
    v_shipping_amount,'GBP'
  ) RETURNING * INTO v_item;

  v_reservation:=public.server_reserve_supplier_checkout_v2(
    v_order.id,v_item.id,'reservation:'||v_key,'orchestration:'||v_key,p_correlation_id,
    COALESCE(p_risk_signals,'{}'::jsonb),p_risk_policy_key,p_reservation_minutes
  );
  IF COALESCE((v_reservation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier checkout reservation failed: %',COALESCE(v_reservation->>'reason','unknown');
  END IF;

  UPDATE private.supplier_order_orchestrations
     SET state='ready_for_payment',updated_at=now()
   WHERE id=(v_reservation->>'orchestrationId')::uuid;
  UPDATE private.supplier_fulfilment_legs
     SET status='ready_for_payment',updated_at=now()
   WHERE id=(v_reservation->>'fulfilmentLegId')::uuid;

  v_payment_snapshot:=jsonb_build_object(
    'commercialSnapshotVersion',2,'commercialMode','loadify_supplier_fulfilled',
    'orderId',v_order.id,'buyerId',v_buyer.id,'buyerSnapshot',v_buyer_snapshot,'platformSnapshot',v_platform_snapshot,
    'totalPence',v_total_pence,'shippingAmountPence',v_customer_shipping_pence,'taxAmountPence',v_tax_pence,
    'taxSnapshot',v_tax_snapshot,
    'items',jsonb_build_array(jsonb_build_object(
      'productId',v_product.id,'title',v_product.title,'image',v_image,'listingContext','product','quantity',p_quantity,
      'unitPricePence',v_unit_price_pence,'canonicalProductId',v_checkout->>'canonicalProductId',
      'supplierOfferId',v_checkout->>'supplierOfferId','supplierVariantRef',COALESCE(v_checkout->>'externalVariantRef',''),
      'pricingSnapshotId',v_checkout->>'pricingSnapshotId','stockObservationId',v_reservation->>'stockObservationId',
      'priceObservationId',v_reservation->>'priceObservationId','reservationId',v_reservation->>'reservationId',
      'fulfilmentLegId',v_reservation->>'fulfilmentLegId','shippingDecisionId',v_shipping.id,
      'shippingServiceRef',v_shipping.service_ref
    ))
  );

  IF private.payment_session_has_supplier_snapshot_v2(v_payment_snapshot) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'prepared supplier payment snapshot failed canonical v2 validation';
  END IF;

  INSERT INTO private.supplier_checkout_preparations(
    preparation_key,request_fingerprint,correlation_id,buyer_id,public_product_id,quantity,shipping_decision_id,
    order_id,order_item_id,orchestration_id,fulfilment_leg_id,reservation_id,payment_snapshot
  ) VALUES(
    v_key,v_fingerprint,p_correlation_id,v_buyer.id,v_product.id,p_quantity,v_shipping.id,
    v_order.id,v_item.id,(v_reservation->>'orchestrationId')::uuid,(v_reservation->>'fulfilmentLegId')::uuid,
    (v_reservation->>'reservationId')::uuid,v_payment_snapshot
  ) RETURNING * INTO v_preparation;

  RETURN jsonb_build_object(
    'prepared',true,'reason','supplier_checkout_prepared','preparationId',v_preparation.id,
    'orderId',v_order.id,'orderNumber',v_order."orderNumber",'orderItemId',v_item.id,
    'reservationId',v_preparation.reservation_id,'fulfilmentLegId',v_preparation.fulfilment_leg_id,
    'shippingDecisionId',v_shipping.id,'reservationExpiresAt',v_reservation->>'expiresAt',
    'paymentSnapshot',v_payment_snapshot,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_prepare_supplier_checkout_order_v1(uuid,uuid,integer,uuid,jsonb,jsonb,text,uuid,jsonb,text,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_checkout_order_v1(uuid,uuid,integer,uuid,jsonb,jsonb,text,uuid,jsonb,text,integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_payment_preparation_decision_v1(
  p_preparation_id uuid,
  p_buyer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_preparation private.supplier_checkout_preparations%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_res private.supplier_stock_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_preparation FROM private.supplier_checkout_preparations
   WHERE id=p_preparation_id AND buyer_id=p_buyer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_checkout_preparation_not_found','interfaceVersion',1); END IF;
  IF v_preparation.state<>'prepared' THEN
    RETURN jsonb_build_object('ready',false,'reason','supplier_checkout_preparation_not_active','state',v_preparation.state,'interfaceVersion',1);
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=v_preparation.order_id;
  SELECT * INTO v_res FROM private.supplier_stock_reservations WHERE id=v_preparation.reservation_id;
  IF v_order.status<>'awaiting_payment' OR v_order."buyerId"<>p_buyer_id
     OR v_res.status<>'active' OR v_res.expires_at<=now() THEN
    RETURN jsonb_build_object('ready',false,'reason','supplier_checkout_preparation_expired_or_invalid','interfaceVersion',1);
  END IF;
  RETURN jsonb_build_object(
    'ready',true,'reason','supplier_checkout_ready_for_payment','preparationId',v_preparation.id,
    'orderId',v_preparation.order_id,'reservationId',v_preparation.reservation_id,
    'reservationExpiresAt',v_res.expires_at,'paymentSnapshot',v_preparation.payment_snapshot,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_payment_preparation_decision_v1(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_payment_preparation_decision_v1(uuid,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_release_supplier_checkout_preparation_v1(
  p_preparation_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_preparation private.supplier_checkout_preparations%ROWTYPE;
  v_res private.supplier_stock_reservations%ROWTYPE;
  v_reason text:=NULLIF(BTRIM(COALESCE(p_reason,'')),'');
BEGIN
  IF p_preparation_id IS NULL OR v_reason IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','preparation_and_release_reason_required','interfaceVersion',1);
  END IF;
  SELECT * INTO v_preparation FROM private.supplier_checkout_preparations WHERE id=p_preparation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','supplier_checkout_preparation_not_found','interfaceVersion',1); END IF;
  IF v_preparation.state IN ('released','cancelled') THEN
    RETURN jsonb_build_object('ok',true,'reason','supplier_checkout_preparation_already_released','state',v_preparation.state,'interfaceVersion',1);
  END IF;
  IF v_preparation.state='paid' THEN
    RETURN jsonb_build_object('ok',false,'reason','paid_supplier_checkout_requires_post_payment_cancellation','interfaceVersion',1);
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.payment_sessions ps
     WHERE ps."orderId"=v_preparation.order_id AND ps.status IN ('pending','processing')
  ) THEN
    RETURN jsonb_build_object('ok',false,'reason','active_payment_session_must_be_cancelled_first','interfaceVersion',1);
  END IF;

  SELECT * INTO v_res FROM private.supplier_stock_reservations WHERE id=v_preparation.reservation_id FOR UPDATE;
  IF v_res.status='consumed' THEN
    RETURN jsonb_build_object('ok',false,'reason','consumed_reservation_requires_post_payment_cancellation','interfaceVersion',1);
  END IF;
  IF v_res.status='active' THEN
    UPDATE private.supplier_stock_reservations SET status='released',released_at=now() WHERE id=v_res.id;
    UPDATE private.supplier_fulfilment_legs SET status='released',updated_at=now() WHERE id=v_preparation.fulfilment_leg_id;
    UPDATE private.supplier_order_orchestrations SET state='released',updated_at=now() WHERE id=v_preparation.orchestration_id;
  END IF;

  UPDATE public.orders SET status='cancelled',"updatedAt"=now()
   WHERE id=v_preparation.order_id AND status='awaiting_payment';
  UPDATE private.supplier_checkout_preparations
     SET state='released',released_at=now(),release_reason=v_reason
   WHERE id=v_preparation.id;

  RETURN jsonb_build_object('ok',true,'reason','supplier_checkout_preparation_released',
    'preparationId',v_preparation.id,'orderId',v_preparation.order_id,'reservationId',v_preparation.reservation_id,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_release_supplier_checkout_preparation_v1(uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_release_supplier_checkout_preparation_v1(uuid,text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.sync_supplier_checkout_preparation_paid_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NEW.status='paid' AND OLD.status IS DISTINCT FROM 'paid'
     AND NEW."commercialModeSnapshot"='loadify_supplier_fulfilled' THEN
    UPDATE private.supplier_checkout_preparations
       SET state='paid',paid_at=now()
     WHERE order_id=NEW.id AND state='prepared';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_supplier_checkout_preparation_paid_v1()
  FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS trg_sync_supplier_checkout_preparation_paid_v1 ON public.orders;
CREATE TRIGGER trg_sync_supplier_checkout_preparation_paid_v1
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.sync_supplier_checkout_preparation_paid_v1();

COMMENT ON FUNCTION public.server_reserve_supplier_checkout_v2(uuid,uuid,text,text,uuid,jsonb,text,integer) IS
  'Stage 5B reservation boundary for the real Supplier Commerce checkout path. Requires one awaiting-payment supplier order item, exact listing/offer/shipping identity, current checkout evidence and supplier-aware control scope.';
COMMENT ON FUNCTION public.server_prepare_supplier_checkout_order_v1(uuid,uuid,integer,uuid,jsonb,jsonb,text,uuid,jsonb,text,integer) IS
  'Stage 5B atomic pre-payment preparation: canonical order + immutable route/tax/shipping snapshots + active supplier reservation + validated payment snapshot. Performs no Stripe/provider side effect.';
COMMENT ON FUNCTION public.server_release_supplier_checkout_preparation_v1(uuid,text) IS
  'Stage 5B pre-payment release boundary. Refuses paid/consumed state and active payment sessions; releases reservation and cancels only an awaiting-payment canonical order.';