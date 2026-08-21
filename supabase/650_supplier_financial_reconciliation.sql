-- 650_supplier_financial_reconciliation.sql
-- Phase L order-level financial reconciliation.
-- order completed != financially reconciled.
-- Reconciliation compares canonical payment evidence, ledger, supplier payable/payment,
-- customer refunds, supplier recoveries, chargebacks and unrecovered loss.

CREATE OR REPLACE FUNCTION public.server_reconcile_supplier_financials_v1(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_payment private.supplier_payment_evidence_snapshots%ROWTYPE;
  v_currency text;
  v_customer_payment numeric:=0;
  v_ledger_customer_payment numeric:=0;
  v_refunds numeric:=0;
  v_ledger_refunds numeric:=0;
  v_supplier_payable numeric:=0;
  v_supplier_paid numeric:=0;
  v_recoveries numeric:=0;
  v_ledger_recoveries numeric:=0;
  v_chargebacks numeric:=0;
  v_unrecovered_ledger numeric:=0;
  v_unrecovered numeric:=0;
  v_has_unrecoverable boolean:=false;
  v_state text;
  v_evidence jsonb;
  v_existing private.supplier_financial_reconciliations%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM private.supplier_payment_evidence_snapshots WHERE order_id=p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('reconciled',false,'state','EXCEPTION','reason','canonical_customer_payment_evidence_missing','interfaceVersion',1);
  END IF;
  v_currency:=v_payment.currency;
  v_customer_payment:=v_payment.amount;

  IF EXISTS(
    SELECT 1 FROM private.commerce_financial_ledger_entries l
    WHERE l.order_id=p_order_id AND l.currency<>v_currency
      AND l.event_type IN ('customer_payment','supplier_payable','payout','customer_refund','supplier_recovery','chargeback','unrecovered_loss')
  ) THEN
    v_state:='EXCEPTION';
    v_evidence:=jsonb_build_object('reason','financial_ledger_currency_mismatch');
  ELSE
    SELECT COALESCE(SUM(ABS(l.signed_amount)),0) INTO v_ledger_customer_payment
      FROM private.commerce_financial_ledger_entries l WHERE l.order_id=p_order_id AND l.event_type='customer_payment' AND l.currency=v_currency;
    SELECT COALESCE(SUM(r.amount),0) INTO v_refunds
      FROM private.supplier_customer_refund_evidence r WHERE r.order_id=p_order_id AND r.currency=v_currency AND r.state IN ('partial','succeeded');
    SELECT COALESCE(SUM(ABS(l.signed_amount)),0) INTO v_ledger_refunds
      FROM private.commerce_financial_ledger_entries l WHERE l.order_id=p_order_id AND l.event_type='customer_refund' AND l.currency=v_currency;
    SELECT COALESCE(SUM(ABS(l.signed_amount)),0) INTO v_supplier_payable
      FROM private.commerce_financial_ledger_entries l WHERE l.order_id=p_order_id AND l.event_type='supplier_payable' AND l.currency=v_currency;
    SELECT COALESCE(SUM(ABS(l.signed_amount)),0) INTO v_supplier_paid
      FROM private.commerce_financial_ledger_entries l WHERE l.order_id=p_order_id AND l.event_type='payout' AND l.currency=v_currency;
    SELECT COALESCE(SUM(r.amount),0) INTO v_recoveries
      FROM private.supplier_recovery_evidence r WHERE r.order_id=p_order_id AND r.currency=v_currency AND r.state IN ('partial','recovered');
    SELECT COALESCE(SUM(ABS(l.signed_amount)),0) INTO v_ledger_recoveries
      FROM private.commerce_financial_ledger_entries l WHERE l.order_id=p_order_id AND l.event_type='supplier_recovery' AND l.currency=v_currency;
    SELECT COALESCE(SUM(ABS(l.signed_amount)),0) INTO v_chargebacks
      FROM private.commerce_financial_ledger_entries l WHERE l.order_id=p_order_id AND l.event_type='chargeback' AND l.currency=v_currency;
    SELECT COALESCE(SUM(ABS(l.signed_amount)),0) INTO v_unrecovered_ledger
      FROM private.commerce_financial_ledger_entries l WHERE l.order_id=p_order_id AND l.event_type='unrecovered_loss' AND l.currency=v_currency;
    SELECT EXISTS(
      SELECT 1 FROM private.supplier_return_cases c WHERE c.order_id=p_order_id AND c.supplier_recovery_state='unrecoverable'
    ) INTO v_has_unrecoverable;

    v_unrecovered:=CASE WHEN v_has_unrecoverable THEN GREATEST(v_refunds-v_recoveries,0) ELSE v_unrecovered_ledger END;

    IF v_ledger_customer_payment<>v_customer_payment
       OR v_ledger_refunds<>v_refunds
       OR v_ledger_recoveries<>v_recoveries THEN
      v_state:='EXCEPTION';
    ELSIF v_has_unrecoverable AND v_refunds>v_recoveries THEN
      v_state:='UNRECOVERED';
    ELSIF v_supplier_payable<>v_supplier_paid OR v_refunds<>v_recoveries OR v_unrecovered_ledger<>v_unrecovered THEN
      v_state:='PARTIALLY_RECONCILED';
    ELSE
      v_state:='RECONCILED';
    END IF;

    v_evidence:=jsonb_build_object(
      'paymentEvidenceId',v_payment.id,'paymentIntentRef',v_payment.payment_intent_ref,
      'customerPayment',v_customer_payment,'ledgerCustomerPayment',v_ledger_customer_payment,
      'customerRefunds',v_refunds,'ledgerCustomerRefunds',v_ledger_refunds,
      'supplierPayable',v_supplier_payable,'supplierPaid',v_supplier_paid,
      'supplierRecoveries',v_recoveries,'ledgerSupplierRecoveries',v_ledger_recoveries,
      'chargebacks',v_chargebacks,'unrecoveredLoss',v_unrecovered,'ledgerUnrecoveredLoss',v_unrecovered_ledger
    );
  END IF;

  INSERT INTO private.supplier_financial_reconciliations(
    order_id,state,currency,customer_payment,ledger_customer_payment,customer_refunds,ledger_customer_refunds,
    supplier_payable,supplier_paid,supplier_recoveries,ledger_supplier_recoveries,chargebacks,unrecovered_loss,evidence,evaluated_at
  ) VALUES(
    p_order_id,v_state,v_currency,v_customer_payment,v_ledger_customer_payment,v_refunds,v_ledger_refunds,
    v_supplier_payable,v_supplier_paid,v_recoveries,v_ledger_recoveries,v_chargebacks,v_unrecovered,v_evidence,now()
  ) ON CONFLICT(order_id) DO UPDATE SET
    state=EXCLUDED.state,currency=EXCLUDED.currency,customer_payment=EXCLUDED.customer_payment,
    ledger_customer_payment=EXCLUDED.ledger_customer_payment,customer_refunds=EXCLUDED.customer_refunds,
    ledger_customer_refunds=EXCLUDED.ledger_customer_refunds,supplier_payable=EXCLUDED.supplier_payable,
    supplier_paid=EXCLUDED.supplier_paid,supplier_recoveries=EXCLUDED.supplier_recoveries,
    ledger_supplier_recoveries=EXCLUDED.ledger_supplier_recoveries,chargebacks=EXCLUDED.chargebacks,
    unrecovered_loss=EXCLUDED.unrecovered_loss,evidence=EXCLUDED.evidence,evaluated_at=now()
  RETURNING * INTO v_existing;

  INSERT INTO private.supplier_return_recovery_events(return_case_id,event_key,event_type,state,evidence)
  SELECT c.id,'reconciliation:'||c.id::text||':'||md5(v_existing.evidence::text||v_existing.state),
    'reconciliation_evaluated',v_existing.state,jsonb_build_object('reconciliationId',v_existing.id)
  FROM private.supplier_return_cases c WHERE c.order_id=p_order_id
  ON CONFLICT(event_key) DO NOTHING;

  RETURN jsonb_build_object(
    'reconciled',v_state='RECONCILED','state',v_state,'orderId',p_order_id,'currency',v_currency,
    'customerPayment',v_customer_payment,'ledgerCustomerPayment',v_ledger_customer_payment,
    'customerRefunds',v_refunds,'supplierRecoveries',v_recoveries,'chargebacks',v_chargebacks,
    'unrecoveredLoss',v_unrecovered,'evidence',v_evidence,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_reconcile_supplier_financials_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_reconcile_supplier_financials_v1(uuid) TO service_role;

-- Phase K deliberately deferred money-movement exception classes. Phase L now owns them.
ALTER TABLE private.supplier_order_exceptions DROP CONSTRAINT IF EXISTS supplier_order_exception_type_check;
ALTER TABLE private.supplier_order_exceptions ADD CONSTRAINT supplier_order_exception_type_check CHECK (exception_type IN (
  'supplier_timeout','accepted_response_lost','duplicate_submit','duplicate_acknowledgement','stock_disappeared','price_changed',
  'api_unavailable','partial_fulfilment','partial_shipment','delayed_dispatch','no_tracking','lost_shipment',
  'supplier_cancellation','buyer_cancellation','supplier_suspended_mid_order','tracking_exception','failed_delivery',
  'return','refund','partial_refund','chargeback','reimbursement_failure','financial_reconciliation_mismatch'
));

CREATE OR REPLACE FUNCTION public.server_open_supplier_financial_exception_v1(p_order_id uuid,p_exception_type text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_o private.supplier_order_orchestrations%ROWTYPE; v_c private.supplier_return_cases%ROWTYPE; v_key text;
BEGIN
  IF p_exception_type NOT IN ('refund','partial_refund','chargeback','reimbursement_failure','financial_reconciliation_mismatch')
     OR NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'invalid Phase L financial exception'; END IF;
  SELECT * INTO v_o FROM private.supplier_order_orchestrations WHERE order_id=p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','orchestration_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_c FROM private.supplier_return_cases WHERE order_id=p_order_id ORDER BY requested_at DESC LIMIT 1;
  v_key:='phase-l:'||p_exception_type||':'||p_order_id::text;
  INSERT INTO private.supplier_order_exceptions(
    order_id,orchestration_id,fulfilment_leg_id,handshake_id,shipment_id,exception_key,exception_type,state,owner_type,
    next_action,customer_impact,financial_impact,metadata
  ) VALUES(
    p_order_id,v_o.id,v_c.fulfilment_leg_id,v_c.handshake_id,v_c.shipment_id,v_key,p_exception_type,'open','finance',
    'reconcile canonical payment, refund and supplier recovery evidence','buyer financial outcome may be unresolved',
    'platform contribution or recoverability is unresolved',jsonb_build_object('reason',BTRIM(p_reason))
  ) ON CONFLICT(exception_key) DO NOTHING;
  RETURN jsonb_build_object('ok',true,'exceptionKey',v_key,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_open_supplier_financial_exception_v1(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_open_supplier_financial_exception_v1(uuid,text,text) TO service_role;

COMMENT ON FUNCTION public.server_reconcile_supplier_financials_v1(uuid) IS 'Phase L canonical reconciliation. Customer-order completion is not treated as financial reconciliation.';
