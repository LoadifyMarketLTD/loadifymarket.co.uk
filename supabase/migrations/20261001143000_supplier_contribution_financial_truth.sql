-- Phase O financial truth closure: server-derived expected contribution and realised-order ledger truth.
-- Additive/fail-closed. Does not activate Supplier Commerce or automated settlement.

ALTER TABLE private.supplier_pricing_snapshots
  ADD COLUMN IF NOT EXISTS processor_fee_allowance numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_fee_allowance numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS returns_allowance numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operational_allowance numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_failure_allowance numeric(18,4) NOT NULL DEFAULT 0;

ALTER TABLE private.supplier_pricing_snapshots
  DROP CONSTRAINT IF EXISTS supplier_pricing_allowances_nonnegative_check;
ALTER TABLE private.supplier_pricing_snapshots
  ADD CONSTRAINT supplier_pricing_allowances_nonnegative_check CHECK (
    processor_fee_allowance >= 0 AND provider_fee_allowance >= 0
    AND returns_allowance >= 0 AND operational_allowance >= 0
    AND supplier_failure_allowance >= 0
  );

CREATE OR REPLACE FUNCTION private.guard_supplier_pricing_contribution_truth_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_landed private.supplier_landed_cost_snapshots%ROWTYPE;
  v_allowances jsonb:=COALESCE(NEW.evidence->'costAllowances','{}'::jsonb);
  v_total_allowances numeric(18,4);
BEGIN
  SELECT * INTO v_landed
  FROM private.supplier_landed_cost_snapshots
  WHERE id=NEW.landed_cost_snapshot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'landed cost snapshot is required'; END IF;
  IF v_landed.currency<>NEW.currency THEN RAISE EXCEPTION 'pricing and landed-cost currency must match'; END IF;

  IF jsonb_typeof(v_allowances)<>'object' THEN
    RAISE EXCEPTION 'pricing costAllowances evidence must be an object';
  END IF;

  NEW.processor_fee_allowance:=COALESCE(NULLIF(v_allowances->>'processorFeeAllowance','')::numeric,NEW.processor_fee_allowance,0);
  NEW.provider_fee_allowance:=COALESCE(NULLIF(v_allowances->>'providerFeeAllowance','')::numeric,NEW.provider_fee_allowance,0);
  NEW.returns_allowance:=COALESCE(NULLIF(v_allowances->>'returnsAllowance','')::numeric,NEW.returns_allowance,0);
  NEW.operational_allowance:=COALESCE(NULLIF(v_allowances->>'operationalAllowance','')::numeric,NEW.operational_allowance,0);
  NEW.supplier_failure_allowance:=COALESCE(NULLIF(v_allowances->>'supplierFailureAllowance','')::numeric,NEW.supplier_failure_allowance,0);

  v_total_allowances:=NEW.processor_fee_allowance+NEW.provider_fee_allowance+NEW.returns_allowance
    +NEW.operational_allowance+NEW.supplier_failure_allowance;
  IF v_total_allowances<0 THEN RAISE EXCEPTION 'pricing cost allowances cannot be negative'; END IF;

  NEW.expected_contribution:=ROUND(
    NEW.gross_customer_price-NEW.tax_amount-v_landed.total_landed_cost-v_total_allowances,4
  );
  IF NEW.status='approved' AND NEW.expected_contribution<NEW.minimum_contribution THEN
    RAISE EXCEPTION 'margin_guard_failed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_supplier_pricing_contribution_truth_v2
  ON private.supplier_pricing_snapshots;
CREATE TRIGGER trg_supplier_pricing_contribution_truth_v2
BEFORE INSERT OR UPDATE ON private.supplier_pricing_snapshots
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pricing_contribution_truth_v2();

CREATE TABLE IF NOT EXISTS private.supplier_processor_fee_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  payment_intent_ref text NOT NULL,
  charge_ref text NOT NULL UNIQUE,
  balance_transaction_ref text NOT NULL UNIQUE,
  gross_amount numeric(18,4) NOT NULL CHECK (gross_amount > 0),
  processor_fee_amount numeric(18,4) NOT NULL CHECK (processor_fee_amount >= 0),
  net_amount numeric(18,4) NOT NULL CHECK (net_amount >= 0),
  currency text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_processor_fee_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_processor_fee_balance_check CHECK (gross_amount=processor_fee_amount+net_amount),
  CONSTRAINT supplier_processor_fee_evidence_check CHECK (jsonb_typeof(evidence)='object' AND evidence<>'{}'::jsonb)
);
REVOKE ALL ON TABLE private.supplier_processor_fee_evidence FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION private.guard_supplier_processor_fee_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier processor-fee evidence is immutable';
END;
$$;
DROP TRIGGER IF EXISTS trg_supplier_processor_fee_immutable_v1 ON private.supplier_processor_fee_evidence;
CREATE TRIGGER trg_supplier_processor_fee_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_processor_fee_evidence
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_processor_fee_immutable_v1();

CREATE OR REPLACE FUNCTION public.server_record_supplier_processor_fee_v1(
  p_order_id uuid,
  p_payment_intent_ref text,
  p_charge_ref text,
  p_balance_transaction_ref text,
  p_gross_amount numeric,
  p_processor_fee_amount numeric,
  p_net_amount numeric,
  p_currency text,
  p_occurred_at timestamptz,
  p_evidence jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_payment private.supplier_payment_evidence_snapshots%ROWTYPE;
  v_row private.supplier_processor_fee_evidence%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND OR v_order."commercialMode"<>'loadify_supplier_fulfilled' OR v_order."supplierOfferId" IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_order_not_found','interfaceVersion',1);
  END IF;
  SELECT * INTO v_payment FROM private.supplier_payment_evidence_snapshots WHERE order_id=v_order.id;
  IF NOT FOUND OR v_payment.payment_intent_ref<>BTRIM(COALESCE(p_payment_intent_ref,'')) THEN
    RETURN jsonb_build_object('ok',false,'reason','canonical_supplier_payment_evidence_missing','interfaceVersion',1);
  END IF;
  IF upper(BTRIM(COALESCE(p_currency,'')))<>v_order.currency
     OR ROUND(p_gross_amount,2)<>ROUND(v_order.total::numeric,2)
     OR ROUND(p_gross_amount,2)<>ROUND(p_processor_fee_amount+p_net_amount,2)
     OR p_processor_fee_amount<0 OR p_net_amount<0 OR p_occurred_at IS NULL
     OR NULLIF(BTRIM(COALESCE(p_charge_ref,'')),'') IS NULL
     OR NULLIF(BTRIM(COALESCE(p_balance_transaction_ref,'')),'') IS NULL
     OR jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' OR COALESCE(p_evidence,'{}'::jsonb)='{}'::jsonb THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_processor_fee_evidence_mismatch','interfaceVersion',1);
  END IF;

  INSERT INTO private.supplier_processor_fee_evidence(
    order_id,payment_intent_ref,charge_ref,balance_transaction_ref,gross_amount,
    processor_fee_amount,net_amount,currency,evidence,occurred_at
  ) VALUES(
    v_order.id,v_payment.payment_intent_ref,BTRIM(p_charge_ref),BTRIM(p_balance_transaction_ref),
    ROUND(p_gross_amount,2),ROUND(p_processor_fee_amount,2),ROUND(p_net_amount,2),
    upper(BTRIM(p_currency)),p_evidence,p_occurred_at
  ) ON CONFLICT(order_id) DO NOTHING;
  SELECT * INTO v_row FROM private.supplier_processor_fee_evidence WHERE order_id=v_order.id;
  IF v_row.payment_intent_ref<>v_payment.payment_intent_ref
     OR v_row.charge_ref<>BTRIM(p_charge_ref)
     OR v_row.balance_transaction_ref<>BTRIM(p_balance_transaction_ref)
     OR ROUND(v_row.gross_amount,2)<>ROUND(p_gross_amount,2)
     OR ROUND(v_row.processor_fee_amount,2)<>ROUND(p_processor_fee_amount,2)
     OR ROUND(v_row.net_amount,2)<>ROUND(p_net_amount,2) THEN
    RAISE EXCEPTION 'supplier processor-fee idempotency collision';
  END IF;

  PERFORM public.server_append_financial_ledger_v1(
    'supplier-processor-fee:'||v_order.id::text,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','processor_fee','processor_fee',v_order.currency,
    -ROUND(v_row.processor_fee_amount,2),NULL,v_row.balance_transaction_ref,
    jsonb_build_object('processorFeeEvidenceId',v_row.id,'chargeRef',v_row.charge_ref),v_row.occurred_at
  );

  RETURN jsonb_build_object(
    'ok',true,'reason','supplier_processor_fee_recorded','processorFeeEvidenceId',v_row.id,
    'processorFeeAmount',v_row.processor_fee_amount,'currency',v_row.currency,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_processor_fee_v1(uuid,text,text,text,numeric,numeric,numeric,text,timestamptz,jsonb)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_processor_fee_v1(uuid,text,text,text,numeric,numeric,numeric,text,timestamptz,jsonb)
TO service_role;
CREATE OR REPLACE FUNCTION public.server_materialize_supplier_cost_ledger_v1(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_landed private.supplier_landed_cost_snapshots%ROWTYPE;
  v_quantity numeric;
  v_other numeric;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND OR v_order."commercialMode"<>'loadify_supplier_fulfilled'
     OR v_order."supplierOfferId" IS NULL OR v_order."pricingSnapshotId" IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_order_contract_missing','interfaceVersion',1);
  END IF;
  SELECT * INTO v_price FROM private.supplier_pricing_snapshots WHERE id=v_order."pricingSnapshotId";
  IF NOT FOUND OR v_price.currency<>v_order.currency THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_pricing_snapshot_missing','interfaceVersion',1);
  END IF;
  SELECT * INTO v_landed FROM private.supplier_landed_cost_snapshots WHERE id=v_price.landed_cost_snapshot_id;
  IF NOT FOUND OR v_landed.currency<>v_order.currency THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_landed_cost_snapshot_missing','interfaceVersion',1);
  END IF;
  v_quantity:=GREATEST(COALESCE(v_order.quantity,1),1);
  PERFORM public.server_append_financial_ledger_v1('supplier-product-cost:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','supplier_product_cost','supplier_product_cost',v_order.currency,
    -ROUND(v_landed.supplier_product_cost*v_quantity,2),NULL,NULL,jsonb_build_object('landedCostSnapshotId',v_landed.id),now());
  PERFORM public.server_append_financial_ledger_v1('supplier-shipping-cost:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','supplier_shipping_cost','supplier_shipping_cost',v_order.currency,
    -ROUND(v_landed.supplier_shipping_cost*v_quantity,2),NULL,NULL,jsonb_build_object('landedCostSnapshotId',v_landed.id),now());
  PERFORM public.server_append_financial_ledger_v1('supplier-carrier-cost:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','carrier_cost','carrier_cost',v_order.currency,
    -ROUND(v_landed.carrier_cost*v_quantity,2),NULL,NULL,jsonb_build_object('landedCostSnapshotId',v_landed.id),now());
  PERFORM public.server_append_financial_ledger_v1('supplier-customs-duty:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','customs_duty','customs_duty',v_order.currency,
    -ROUND(v_landed.customs_duty*v_quantity,2),NULL,NULL,jsonb_build_object('landedCostSnapshotId',v_landed.id),now());
  PERFORM public.server_append_financial_ledger_v1('supplier-import-vat:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','import_vat','import_vat',v_order.currency,
    -ROUND(v_landed.import_vat*v_quantity,2),NULL,NULL,jsonb_build_object('landedCostSnapshotId',v_landed.id),now());
  PERFORM public.server_append_financial_ledger_v1('supplier-fx-cost:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
    'loadify_supplier_fulfilled','fx','fx_cost',v_order.currency,
    -ROUND(v_landed.fx_cost*v_quantity,2),NULL,NULL,jsonb_build_object('landedCostSnapshotId',v_landed.id),now());
  IF v_price.tax_amount>0 THEN
    PERFORM public.server_append_financial_ledger_v1('supplier-customer-tax:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
      'loadify_supplier_fulfilled','tax_vat','customer_tax_liability',v_order.currency,
      -ROUND(v_price.tax_amount*v_quantity,2),NULL,NULL,jsonb_build_object('pricingSnapshotId',v_price.id),now());
  END IF;
  v_other:=ROUND(v_landed.other_cost*v_quantity,2);
  IF v_other>0 THEN
    PERFORM public.server_append_financial_ledger_v1('supplier-other-cost:'||v_order.id,v_order.id,v_order.id,v_order."supplierOfferId",
      'loadify_supplier_fulfilled','adjustment','other_attributable_cost',v_order.currency,
      -v_other,NULL,NULL,jsonb_build_object('landedCostSnapshotId',v_landed.id),now());
  END IF;
  RETURN jsonb_build_object('ok',true,'reason','supplier_cost_ledger_materialized','interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_materialize_supplier_cost_ledger_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_materialize_supplier_cost_ledger_v1(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.server_supplier_order_financial_truth_v1(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_processor_count integer;
  v_payment numeric:=0;
  v_processor numeric:=0;
  v_supplier_payable numeric:=0;
  v_costs numeric:=0;
  v_refunds numeric:=0;
  v_recoveries numeric:=0;
  v_chargebacks numeric:=0;
  v_unrecovered numeric:=0;
  v_realised numeric:=0;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND OR v_order."commercialMode"<>'loadify_supplier_fulfilled' THEN
    RETURN jsonb_build_object('ready',false,'reason','supplier_order_not_found','interfaceVersion',1);
  END IF;
  SELECT count(*) INTO v_processor_count FROM private.supplier_processor_fee_evidence WHERE order_id=v_order.id;
  IF v_processor_count<>1 THEN
    RETURN jsonb_build_object('ready',false,'reason','supplier_processor_fee_evidence_missing','interfaceVersion',1);
  END IF;
  SELECT
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type='customer_payment'),0),
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type='processor_fee'),0),
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type='supplier_payable'),0),
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type IN ('carrier_cost','tax_vat','customs_duty','import_vat','fx')
      OR (event_type='adjustment' AND account_code='other_attributable_cost')),0),
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type='customer_refund'),0),
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type='supplier_recovery'),0),
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type='chargeback'),0),
    COALESCE(SUM(signed_amount) FILTER (WHERE event_type='unrecovered_loss'),0)
  INTO v_payment,v_processor,v_supplier_payable,v_costs,v_refunds,v_recoveries,v_chargebacks,v_unrecovered
  FROM private.commerce_financial_ledger_entries WHERE order_id=v_order.id;

  IF ROUND(v_payment,2)<>ROUND(v_order.total::numeric,2) THEN
    RETURN jsonb_build_object('ready',false,'reason','customer_payment_ledger_mismatch','interfaceVersion',1);
  END IF;
  IF v_supplier_payable<=0 THEN
    RETURN jsonb_build_object('ready',false,'reason','supplier_payable_ledger_missing','interfaceVersion',1);
  END IF;
  v_realised:=ROUND(v_payment+v_processor-v_supplier_payable+v_costs+v_refunds+v_recoveries+v_chargebacks+v_unrecovered,2);
  RETURN jsonb_build_object(
    'ready',true,'reason','supplier_financial_truth_ready','orderId',v_order.id,'currency',v_order.currency,
    'customerPayment',ROUND(v_payment,2),'processorFee',ROUND(v_processor,2),
    'supplierPayable',ROUND(v_supplier_payable,2),'attributableCosts',ROUND(v_costs,2),'customerRefunds',ROUND(v_refunds,2),
    'supplierRecoveries',ROUND(v_recoveries,2),'chargebacks',ROUND(v_chargebacks,2),
    'unrecoveredLoss',ROUND(v_unrecovered,2),'realisedContribution',v_realised,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_order_financial_truth_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_order_financial_truth_v1(uuid) TO service_role;

COMMENT ON FUNCTION public.server_supplier_order_financial_truth_v1(uuid) IS
  'Phase O canonical realised-contribution view derived only from append-only ledger events and immutable processor-fee evidence.';
