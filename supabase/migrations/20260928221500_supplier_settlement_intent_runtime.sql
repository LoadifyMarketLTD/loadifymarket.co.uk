-- Supplier marketplace settlement intent + manual settlement runtime.
-- Fail-closed: this migration never sends money and never enables a market/control.

CREATE TABLE IF NOT EXISTS private.supplier_settlement_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  supplier_commercial_profile_id uuid NOT NULL REFERENCES private.supplier_commercial_profiles(id) ON DELETE RESTRICT,
  supplier_commercial_profile_version integer NOT NULL CHECK (supplier_commercial_profile_version > 0),
  settlement_model text NOT NULL,
  settlement_trigger text NOT NULL,
  supplier_payable_basis text NOT NULL,
  currency text NOT NULL,
  payable_amount numeric(18,4) NOT NULL CHECK (payable_amount >= 0),
  status text NOT NULL,
  external_payment_ref text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  prepared_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_settlement_intent_model_check CHECK (settlement_model IN (
    'stripe_connect_supplier','platform_collection_as_agent','manual_supplier_settlement'
  )),
  CONSTRAINT supplier_settlement_intent_trigger_check CHECK (settlement_trigger IN (
    'payment_confirmed','supplier_acknowledged','dispatched','delivered','protection_window_elapsed','manual_review'
  )),
  CONSTRAINT supplier_settlement_intent_basis_check CHECK (supplier_payable_basis IN (
    'retail_less_attributable_costs','supplier_trade_price_plus_agreed_shipping','fixed_contract_amount','order_level_formula'
  )),
  CONSTRAINT supplier_settlement_intent_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_settlement_intent_status_check CHECK (status IN (
    'manual_payment_pending','ready_for_execution','held','paid','reconciliation_required','cancelled'
  )),
  CONSTRAINT supplier_settlement_intent_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_settlement_intent_paid_check CHECK (
    status<>'paid' OR (
      paid_at IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(external_payment_ref,'')),'') IS NOT NULL
      AND evidence<>'{}'::jsonb
    )
  )
);

REVOKE ALL ON TABLE private.supplier_settlement_intents FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_settlement_v1(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_landed private.supplier_landed_cost_snapshots%ROWTYPE;
  v_payment private.supplier_payment_evidence_snapshots%ROWTYPE;
  v_handshake private.supplier_order_handshakes%ROWTYPE;
  v_intent private.supplier_settlement_intents%ROWTYPE;
  v_payable numeric(18,4);
  v_trigger_ready boolean:=false;
  v_status text;
  v_reconciliation jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','order_not_found','interfaceVersion',1); END IF;
  IF v_order."commercialMode"<>'loadify_supplier_fulfilled'
     OR v_order."supplierSellerIdSnapshot" IS NULL
     OR v_order."supplierCommercialProfileIdSnapshot" IS NULL
     OR v_order."supplierCommercialProfileVersionSnapshot" IS NULL
     OR v_order."supplierSettlementModelSnapshot" IS NULL
     OR v_order."pricingSnapshotId" IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_settlement_order_contract_missing','interfaceVersion',1);
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_commercial_profiles
  WHERE id=v_order."supplierCommercialProfileIdSnapshot"
    AND supplier_id=v_order."supplierSellerIdSnapshot"
    AND version=v_order."supplierCommercialProfileVersionSnapshot"
    AND market_code=v_order."marketCode"
    AND status IN ('verified','retired');
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','supplier_commercial_profile_snapshot_unavailable','interfaceVersion',1); END IF;
  IF v_profile.settlement_model<>v_order."supplierSettlementModelSnapshot"
     OR v_profile.settlement_currency<>v_order.currency THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_settlement_contract_snapshot_mismatch','interfaceVersion',1);
  END IF;

  SELECT * INTO v_payment FROM private.supplier_payment_evidence_snapshots WHERE order_id=v_order.id;
  IF v_profile.settlement_trigger='payment_confirmed' THEN
    v_trigger_ready:=FOUND;
  ELSIF v_profile.settlement_trigger='supplier_acknowledged' THEN
    SELECT * INTO v_handshake FROM private.supplier_order_handshakes
    WHERE order_id=v_order.id AND state IN ('accepted','reconciled') ORDER BY created_at DESC LIMIT 1;
    v_trigger_ready:=FOUND;
  ELSIF v_profile.settlement_trigger='dispatched' THEN
    v_trigger_ready:=v_order.status IN ('shipped','delivered','completed');
  ELSIF v_profile.settlement_trigger='delivered' THEN
    v_trigger_ready:=v_order.status IN ('delivered','completed');
  ELSIF v_profile.settlement_trigger='protection_window_elapsed' THEN
    RETURN jsonb_build_object('ok',false,'reason','protection_window_settlement_requires_explicit_elapsed_evidence','interfaceVersion',1);
  ELSIF v_profile.settlement_trigger='manual_review' THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_review_settlement_requires_operator_decision','interfaceVersion',1);
  END IF;
  IF v_trigger_ready IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_settlement_trigger_not_reached','settlementTrigger',v_profile.settlement_trigger,'interfaceVersion',1);
  END IF;
  IF NOT FOUND AND v_profile.settlement_trigger='payment_confirmed' THEN
    RETURN jsonb_build_object('ok',false,'reason','canonical_supplier_payment_evidence_missing','interfaceVersion',1);
  END IF;

  SELECT * INTO v_price FROM private.supplier_pricing_snapshots WHERE id=v_order."pricingSnapshotId";
  IF NOT FOUND OR v_price.currency<>v_order.currency THEN
    RETURN jsonb_build_object('ok',false,'reason','settlement_pricing_snapshot_unavailable','interfaceVersion',1);
  END IF;
  SELECT * INTO v_landed FROM private.supplier_landed_cost_snapshots WHERE id=v_price.landed_cost_snapshot_id;
  IF NOT FOUND OR v_landed.currency<>v_order.currency THEN
    RETURN jsonb_build_object('ok',false,'reason','settlement_landed_cost_snapshot_unavailable','interfaceVersion',1);
  END IF;

  IF v_profile.supplier_payable_basis='supplier_trade_price_plus_agreed_shipping' THEN
    v_payable:=ROUND(((v_landed.supplier_product_cost+v_landed.supplier_shipping_cost)*v_order.quantity)::numeric,2);
  ELSIF v_profile.supplier_payable_basis='fixed_contract_amount' THEN
    IF v_profile.supplier_payable_fixed_amount IS NULL THEN
      RETURN jsonb_build_object('ok',false,'reason','fixed_supplier_payable_amount_missing','interfaceVersion',1);
    END IF;
    v_payable:=ROUND(v_profile.supplier_payable_fixed_amount::numeric,2);
  ELSIF v_profile.supplier_payable_basis='retail_less_attributable_costs' THEN
    RETURN jsonb_build_object('ok',false,'reason','retail_less_attributable_costs_requires_actual_fee_evidence','interfaceVersion',1);
  ELSE
    RETURN jsonb_build_object('ok',false,'reason','order_level_supplier_payable_formula_not_executable','interfaceVersion',1);
  END IF;

  IF v_payable<=0 OR v_payable>ROUND(v_order.total::numeric,2) THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_payable_amount_out_of_bounds','payableAmount',v_payable,'interfaceVersion',1);
  END IF;

  v_status:=CASE
    WHEN v_payable<v_profile.settlement_minimum_amount THEN 'held'
    WHEN v_profile.settlement_model='manual_supplier_settlement' THEN 'manual_payment_pending'
    ELSE 'ready_for_execution'
  END;

  INSERT INTO private.supplier_settlement_intents(
    order_id,supplier_id,supplier_commercial_profile_id,supplier_commercial_profile_version,
    settlement_model,settlement_trigger,supplier_payable_basis,currency,payable_amount,status,evidence
  ) VALUES(
    v_order.id,v_order."supplierSellerIdSnapshot",v_profile.id,v_profile.version,
    v_profile.settlement_model,v_profile.settlement_trigger,v_profile.supplier_payable_basis,
    v_order.currency,v_payable,v_status,
    jsonb_build_object('pricingSnapshotId',v_price.id,'landedCostSnapshotId',v_landed.id,'preparedFromImmutableOrderSnapshot',true)
  ) ON CONFLICT(order_id) DO NOTHING;

  SELECT * INTO v_intent FROM private.supplier_settlement_intents WHERE order_id=v_order.id FOR UPDATE;
  IF v_intent.supplier_id<>v_order."supplierSellerIdSnapshot"
     OR v_intent.supplier_commercial_profile_id<>v_profile.id
     OR v_intent.supplier_commercial_profile_version<>v_profile.version
     OR v_intent.payable_amount<>v_payable
     OR v_intent.currency<>v_order.currency THEN
    RAISE EXCEPTION 'supplier settlement intent identity conflict';
  END IF;

  PERFORM public.server_append_financial_ledger_v1(
    'supplier-customer-payment:'||v_order.id::text,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','customer_payment','customer_cash',v_order.currency,
    ROUND(v_order.total::numeric,2),NULL,v_order."stripePaymentIntentId",
    jsonb_build_object('source','supplier_payment_evidence_snapshot'),COALESCE(v_payment.captured_at,now())
  );
  PERFORM public.server_append_financial_ledger_v1(
    'supplier-payable:'||v_order.id::text,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','supplier_payable','supplier_payable',v_order.currency,
    v_payable,NULL,NULL,
    jsonb_build_object('settlementIntentId',v_intent.id,'supplierCommercialProfileId',v_profile.id,'supplierCommercialProfileVersion',v_profile.version),now()
  );

  v_reconciliation:=public.server_reconcile_supplier_financials_v1(v_order.id);
  RETURN jsonb_build_object(
    'ok',true,'reason','supplier_settlement_intent_prepared','settlementIntentId',v_intent.id,
    'orderId',v_order.id,'supplierId',v_intent.supplier_id,'settlementModel',v_intent.settlement_model,
    'settlementTrigger',v_intent.settlement_trigger,'supplierPayableBasis',v_intent.supplier_payable_basis,
    'payableAmount',v_intent.payable_amount,'currency',v_intent.currency,'status',v_intent.status,
    'externalPaymentPerformed',false,'reconciliation',v_reconciliation,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_prepare_supplier_settlement_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_settlement_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_manual_supplier_settlement_v1(
  p_actor_id uuid,
  p_order_id uuid,
  p_amount numeric,
  p_external_payment_ref text,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor public.users%ROWTYPE;
  v_intent private.supplier_settlement_intents%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_external text:=NULLIF(BTRIM(COALESCE(p_external_payment_ref,'')),'');
  v_reconciliation jsonb;
BEGIN
  SELECT * INTO v_actor FROM public.users WHERE id=p_actor_id;
  IF NOT FOUND OR v_actor.role<>'admin' OR v_actor."isActive" IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok',false,'reason','active_admin_required','interfaceVersion',1);
  END IF;
  IF v_external IS NULL OR p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR p_evidence='{}'::jsonb THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_settlement_reference_and_evidence_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_intent FROM private.supplier_settlement_intents WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','supplier_settlement_intent_not_found','interfaceVersion',1); END IF;
  IF v_intent.settlement_model<>'manual_supplier_settlement' THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_settlement_model_not_configured','interfaceVersion',1);
  END IF;
  IF v_intent.status='paid' THEN
    IF v_intent.external_payment_ref IS DISTINCT FROM v_external OR ROUND(v_intent.payable_amount,2)<>ROUND(p_amount,2) THEN
      RAISE EXCEPTION 'manual supplier settlement retry conflicts with recorded payment';
    END IF;
    RETURN jsonb_build_object('ok',true,'reason','manual_supplier_settlement_already_recorded','settlementIntentId',v_intent.id,'interfaceVersion',1);
  END IF;
  IF v_intent.status<>'manual_payment_pending' THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_supplier_settlement_not_payable','status',v_intent.status,'interfaceVersion',1);
  END IF;
  IF ROUND(COALESCE(p_amount,-1),2)<>ROUND(v_intent.payable_amount,2) THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_supplier_settlement_amount_mismatch','expectedAmount',v_intent.payable_amount,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=v_intent.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'settlement order disappeared'; END IF;

  UPDATE private.supplier_settlement_intents SET
    status='paid',external_payment_ref=v_external,evidence=p_evidence,paid_at=now(),updated_at=now()
  WHERE id=v_intent.id
  RETURNING * INTO v_intent;

  PERFORM public.server_append_financial_ledger_v1(
    'supplier-payout:'||v_order.id::text,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','payout','supplier_payable',v_intent.currency,
    v_intent.payable_amount,NULL,v_external,
    jsonb_build_object('settlementIntentId',v_intent.id,'actorId',p_actor_id,'evidence',p_evidence),now()
  );
  v_reconciliation:=public.server_reconcile_supplier_financials_v1(v_order.id);

  RETURN jsonb_build_object(
    'ok',true,'reason','manual_supplier_settlement_recorded','settlementIntentId',v_intent.id,
    'orderId',v_order.id,'paidAmount',v_intent.payable_amount,'currency',v_intent.currency,
    'externalPaymentRef',v_external,'externalPaymentPerformedByRuntime',false,
    'reconciliation',v_reconciliation,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_record_manual_supplier_settlement_v1(uuid,uuid,numeric,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_manual_supplier_settlement_v1(uuid,uuid,numeric,text,jsonb)
  TO service_role;

COMMENT ON TABLE private.supplier_settlement_intents IS
  'Canonical supplier settlement obligation derived from immutable order/profile evidence. Runtime never infers unsupported formulas.';
COMMENT ON FUNCTION public.server_prepare_supplier_settlement_v1(uuid) IS
  'Prepares one idempotent supplier settlement intent, materialises customer payment + supplier payable ledger truth, and reconciles. No external payment is performed.';
COMMENT ON FUNCTION public.server_record_manual_supplier_settlement_v1(uuid,uuid,numeric,text,jsonb) IS
  'Records externally completed manual supplier settlement only with exact amount, active-admin authority, reference and evidence; appends payout ledger and reconciles.';
