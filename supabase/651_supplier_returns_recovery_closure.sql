-- 651_supplier_returns_recovery_closure.sql
-- Phase L Branch Guard closure: immutable return identity, fail-closed recovery context and active-admin visibility.

CREATE OR REPLACE FUNCTION private.guard_supplier_return_case_identity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.return_key IS DISTINCT FROM OLD.return_key OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.orchestration_id IS DISTINCT FROM OLD.orchestration_id OR NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id
     OR NEW.handshake_id IS DISTINCT FROM OLD.handshake_id OR NEW.shipment_id IS DISTINCT FROM OLD.shipment_id
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR NEW.supplier_offer_id IS DISTINCT FROM OLD.supplier_offer_id
     OR NEW.commercial_mode IS DISTINCT FROM OLD.commercial_mode OR NEW.external_supplier_order_ref IS DISTINCT FROM OLD.external_supplier_order_ref
     OR NEW.reason_code IS DISTINCT FROM OLD.reason_code OR NEW.requested_quantity IS DISTINCT FROM OLD.requested_quantity
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id THEN
    RAISE EXCEPTION 'supplier return case identity is immutable';
  END IF;
  IF OLD.external_return_ref IS NOT NULL AND NEW.external_return_ref IS DISTINCT FROM OLD.external_return_ref THEN
    RAISE EXCEPTION 'external supplier return reference is immutable once known';
  END IF;
  IF OLD.state IN ('closed','cancelled') AND NEW.state IS DISTINCT FROM OLD.state THEN
    RAISE EXCEPTION 'terminal supplier return case cannot regress';
  END IF;
  IF OLD.customer_refund_state='succeeded' AND NEW.customer_refund_state<>'succeeded' THEN
    RAISE EXCEPTION 'successful customer refund truth cannot regress';
  END IF;
  IF OLD.supplier_recovery_state IN ('recovered','unrecoverable') AND NEW.supplier_recovery_state IS DISTINCT FROM OLD.supplier_recovery_state THEN
    RAISE EXCEPTION 'terminal supplier recovery truth cannot regress';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_return_case_identity_v1 ON private.supplier_return_cases;
CREATE TRIGGER trg_guard_supplier_return_case_identity_v1
BEFORE UPDATE ON private.supplier_return_cases
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_return_case_identity_v1();

CREATE OR REPLACE FUNCTION public.server_supplier_recovery_context_v1(p_return_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_case private.supplier_return_cases%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_control jsonb;
BEGIN
  SELECT * INTO v_case FROM private.supplier_return_cases WHERE id=p_return_case_id;
  IF NOT FOUND OR v_case.state NOT IN ('authorised','in_transit','received','closed') OR v_case.external_return_ref IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_return_not_authorised','interfaceVersion',1);
  END IF;
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=v_case.handshake_id;
  IF NOT FOUND OR v_h.state<>'reconciled' OR v_h.external_supplier_order_ref IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_not_reconciled','interfaceVersion',1);
  END IF;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE id=v_case.fulfilment_leg_id;
  IF NOT FOUND OR v_leg.currency IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','recovery_currency_unknown','interfaceVersion',1);
  END IF;
  -- Phase G commercial economics is currently GB-only. Automated adapter minor-unit
  -- conversion is therefore deliberately enabled only for GBP (2 decimal places).
  IF v_leg.currency<>'GBP' THEN
    RETURN jsonb_build_object('eligible',false,'reason','automated_recovery_currency_not_enabled','currency',v_leg.currency,'interfaceVersion',1);
  END IF;
  v_control:=public.server_supplier_commerce_control_decision_v1('return_recovery',jsonb_build_object(
    'supplierRef',v_case.supplier_id::text,'offerRef',v_case.supplier_offer_id::text,'territory','GB'
  ));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_recovery_control_disabled','control',v_control,'interfaceVersion',1);
  END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_case.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',1); END IF;
  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
   WHERE a.supplier_id=v_case.supplier_id AND a.status='active' AND a.interface_version=1
     AND a.provider_key=v_h.provider_key AND a.adapter_version=v_h.adapter_version
     AND a.capabilities @> ARRAY['reimbursement']::text[]
   ORDER BY a.verified_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','reimbursement_adapter_not_ready','interfaceVersion',1); END IF;
  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_recovery_ready','returnCaseId',v_case.id,'orderId',v_case.order_id,
    'supplierId',v_case.supplier_id,'supplierKey',v_supplier.supplier_key,'providerKey',v_adapter.provider_key,
    'adapterVersion',v_adapter.adapter_version,'supplierOrderRef',v_case.external_supplier_order_ref,
    'externalReturnRef',v_case.external_return_ref,'currency',v_leg.currency,'currencyMinorUnitExponent',2,
    'correlationId',v_case.correlation_id,'idempotencyKey',v_case.idempotency_key,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_recovery_context_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_recovery_context_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_return_financial_status_v1(p_actor_id uuid,p_order_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object(
    'returns',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.updated_at DESC),'[]'::jsonb) FROM private.supplier_return_cases c WHERE p_order_id IS NULL OR c.order_id=p_order_id),
    'refunds',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.recorded_at DESC),'[]'::jsonb) FROM private.supplier_customer_refund_evidence r WHERE p_order_id IS NULL OR r.order_id=p_order_id),
    'recoveries',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.recorded_at DESC),'[]'::jsonb) FROM private.supplier_recovery_evidence r WHERE p_order_id IS NULL OR r.order_id=p_order_id),
    'reconciliation',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.evaluated_at DESC),'[]'::jsonb) FROM private.supplier_financial_reconciliations x WHERE p_order_id IS NULL OR x.order_id=p_order_id),
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_return_financial_status_v1(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_return_financial_status_v1(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.server_supplier_recovery_context_v1(uuid) IS 'Phase L reimbursement context. Automated minor-unit conversion is fail-closed outside currently enabled GBP economics.';
