-- 685_supplier_payment_handshake_shipping_closure.sql
-- Stage 6 prerequisite: bind the exact pre-payment shipping decision into the
-- paid supplier-order handshake. No provider call and no control activation.

ALTER TABLE private.supplier_order_handshakes
  ADD COLUMN IF NOT EXISTS shipping_decision_id uuid REFERENCES private.supplier_shipping_decisions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS shipping_service_ref text,
  ADD COLUMN IF NOT EXISTS shipping_binding_fingerprint text;

ALTER TABLE private.supplier_order_handshakes
  DROP CONSTRAINT IF EXISTS supplier_order_handshake_shipping_identity_check,
  ADD CONSTRAINT supplier_order_handshake_shipping_identity_check CHECK (
    (shipping_decision_id IS NULL AND shipping_service_ref IS NULL AND shipping_binding_fingerprint IS NULL)
    OR (
      shipping_decision_id IS NOT NULL
      AND NULLIF(BTRIM(shipping_service_ref),'') IS NOT NULL
      AND shipping_binding_fingerprint ~ '^[0-9a-f]{32}$'
    )
  );

CREATE INDEX IF NOT EXISTS supplier_order_handshake_shipping_decision_idx
  ON private.supplier_order_handshakes(shipping_decision_id)
  WHERE shipping_decision_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.guard_supplier_order_handshake_identity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (
    NEW.order_id IS DISTINCT FROM OLD.order_id OR
    NEW.orchestration_id IS DISTINCT FROM OLD.orchestration_id OR
    NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id OR
    NEW.reservation_id IS DISTINCT FROM OLD.reservation_id OR
    NEW.payment_evidence_id IS DISTINCT FROM OLD.payment_evidence_id OR
    NEW.supplier_offer_id IS DISTINCT FROM OLD.supplier_offer_id OR
    NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR
    NEW.provider_key IS DISTINCT FROM OLD.provider_key OR
    NEW.adapter_version IS DISTINCT FROM OLD.adapter_version OR
    NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
    NEW.correlation_id IS DISTINCT FROM OLD.correlation_id OR
    NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
  ) THEN
    RAISE EXCEPTION 'supplier order handshake identity is immutable';
  END IF;

  IF OLD.shipping_decision_id IS NOT NULL AND (
    NEW.shipping_decision_id IS DISTINCT FROM OLD.shipping_decision_id OR
    NEW.shipping_service_ref IS DISTINCT FROM OLD.shipping_service_ref OR
    NEW.shipping_binding_fingerprint IS DISTINCT FROM OLD.shipping_binding_fingerprint
  ) THEN
    RAISE EXCEPTION 'supplier order handshake shipping identity is immutable once bound';
  END IF;

  IF OLD.shipping_decision_id IS NULL AND (
    NEW.shipping_decision_id IS NOT NULL OR NEW.shipping_service_ref IS NOT NULL OR NEW.shipping_binding_fingerprint IS NOT NULL
  ) AND (
    NEW.shipping_decision_id IS NULL OR NULLIF(BTRIM(NEW.shipping_service_ref),'') IS NULL
    OR NEW.shipping_binding_fingerprint !~ '^[0-9a-f]{32}$'
  ) THEN
    RAISE EXCEPTION 'complete supplier order handshake shipping identity is required';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_handshake_identity_v1 ON private.supplier_order_handshakes;
CREATE TRIGGER trg_guard_supplier_order_handshake_identity_v1
BEFORE UPDATE ON private.supplier_order_handshakes
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_handshake_identity_v1();

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_order_handshake_v2(
  p_order_id uuid,
  p_fulfilment_leg_id uuid,
  p_idempotency_key text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_prepared jsonb;
  v_handshake private.supplier_order_handshakes%ROWTYPE;
  v_res private.supplier_stock_reservations%ROWTYPE;
  v_leg_item private.supplier_fulfilment_leg_items%ROWTYPE;
  v_order_item public.order_items%ROWTYPE;
  v_preparation private.supplier_checkout_preparations%ROWTYPE;
  v_shipping private.supplier_shipping_decisions%ROWTYPE;
  v_fingerprint text;
BEGIN
  v_prepared:=public.server_prepare_supplier_order_handshake_v1(
    p_order_id,p_fulfilment_leg_id,p_idempotency_key,p_correlation_id
  );
  IF COALESCE((v_prepared->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN v_prepared;
  END IF;

  SELECT * INTO v_handshake FROM private.supplier_order_handshakes
   WHERE id=(v_prepared->>'handshakeId')::uuid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_handshake_missing_after_prepare','interfaceVersion',2);
  END IF;

  SELECT * INTO v_res FROM private.supplier_stock_reservations
   WHERE id=v_handshake.reservation_id AND order_id=p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_reservation_identity_missing','interfaceVersion',2);
  END IF;

  SELECT * INTO v_leg_item FROM private.supplier_fulfilment_leg_items
   WHERE id=v_res.leg_item_id AND leg_id=p_fulfilment_leg_id AND order_item_id=v_res.order_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_leg_item_identity_mismatch','interfaceVersion',2);
  END IF;

  SELECT * INTO v_order_item FROM public.order_items
   WHERE id=v_res.order_item_id AND "orderId"=p_order_id;
  IF NOT FOUND
     OR v_order_item."commercialModeSnapshot" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     OR v_order_item."supplierOfferIdSnapshot" IS DISTINCT FROM v_handshake.supplier_offer_id
     OR v_order_item."supplierShippingDecisionIdSnapshot" IS NULL
     OR NULLIF(BTRIM(v_order_item."supplierShippingServiceRefSnapshot"),'') IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_item_shipping_identity_missing','interfaceVersion',2);
  END IF;

  SELECT * INTO v_preparation FROM private.supplier_checkout_preparations p
   WHERE p.order_id=p_order_id
     AND p.order_item_id=v_order_item.id
     AND p.orchestration_id=v_handshake.orchestration_id
     AND p.fulfilment_leg_id=p_fulfilment_leg_id
     AND p.reservation_id=v_res.id
     AND p.shipping_decision_id=v_order_item."supplierShippingDecisionIdSnapshot"
     AND p.state='paid';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','paid_supplier_checkout_preparation_missing','interfaceVersion',2);
  END IF;

  SELECT * INTO v_shipping FROM private.supplier_shipping_decisions d
   WHERE d.id=v_preparation.shipping_decision_id
     AND d.public_product_id=v_order_item."productId"
     AND d.supplier_offer_id=v_handshake.supplier_offer_id
     AND d.pricing_snapshot_id=v_res.pricing_snapshot_id
     AND d.service_ref=v_order_item."supplierShippingServiceRefSnapshot"
     AND d.supplier_shipping_cost_minor=v_order_item."supplierShippingCostMinorSnapshot"
     AND d.currency='GBP';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_shipping_decision_identity_mismatch','interfaceVersion',2);
  END IF;

  v_fingerprint:=md5(concat_ws('|',v_handshake.id::text,v_shipping.id::text,v_shipping.service_ref,
    v_res.id::text,v_res.pricing_snapshot_id::text,p_order_id::text,p_fulfilment_leg_id::text));

  IF v_handshake.shipping_decision_id IS NULL THEN
    UPDATE private.supplier_order_handshakes
       SET shipping_decision_id=v_shipping.id,
           shipping_service_ref=v_shipping.service_ref,
           shipping_binding_fingerprint=v_fingerprint,
           updated_at=now()
     WHERE id=v_handshake.id
     RETURNING * INTO v_handshake;
  ELSIF v_handshake.shipping_decision_id IS DISTINCT FROM v_shipping.id
     OR v_handshake.shipping_service_ref IS DISTINCT FROM v_shipping.service_ref
     OR v_handshake.shipping_binding_fingerprint IS DISTINCT FROM v_fingerprint THEN
    RAISE EXCEPTION 'supplier handshake shipping idempotency collision';
  END IF;

  RETURN v_prepared || jsonb_build_object(
    'reason','supplier_order_handshake_shipping_ready',
    'shippingDecisionId',v_handshake.shipping_decision_id,
    'shippingServiceRef',v_handshake.shipping_service_ref,
    'shippingBindingFingerprint',v_handshake.shipping_binding_fingerprint,
    'interfaceVersion',2
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_prepare_supplier_order_handshake_v2(uuid,uuid,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_order_handshake_v2(uuid,uuid,text,uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.server_prepare_supplier_order_handshake_v1(uuid,uuid,text,uuid)
  FROM service_role;

COMMENT ON FUNCTION public.server_prepare_supplier_order_handshake_v2(uuid,uuid,text,uuid) IS
  'Stage 6 fail-closed paid supplier handshake. Binds the exact immutable Stage 5A shipping decision selected before payment and returns its service reference for provider submission.';