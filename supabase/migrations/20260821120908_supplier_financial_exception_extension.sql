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

COMMENT ON FUNCTION public.server_reconcile_supplier_financials_v1(uuid) IS 'Phase L canonical reconciliation. Customer-order completion is not treated as financial reconciliation.';;
