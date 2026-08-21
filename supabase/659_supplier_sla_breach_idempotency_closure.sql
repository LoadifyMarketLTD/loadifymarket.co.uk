-- 659_supplier_sla_breach_idempotency_closure.sql
-- Phase M Branch Guard closure: exact SLA-breach replays are idempotent, but an
-- idempotency-key collision with changed canonical evidence must fail closed.

CREATE OR REPLACE FUNCTION private.guard_supplier_sla_breach_identity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.breach_key IS DISTINCT FROM OLD.breach_key OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
     OR NEW.sla_version_id IS DISTINCT FROM OLD.sla_version_id OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id OR NEW.breach_type IS DISTINCT FROM OLD.breach_type
     OR NEW.severity IS DISTINCT FROM OLD.severity OR NEW.threshold_value IS DISTINCT FROM OLD.threshold_value
     OR NEW.observed_value IS DISTINCT FROM OLD.observed_value OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
     OR NEW.customer_impact IS DISTINCT FROM OLD.customer_impact OR NEW.financial_impact IS DISTINCT FROM OLD.financial_impact
     OR NEW.evidence IS DISTINCT FROM OLD.evidence OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'supplier SLA breach evidence identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_sla_breach_identity_v1 ON private.supplier_sla_breach_events;
CREATE TRIGGER trg_guard_supplier_sla_breach_identity_v1 BEFORE UPDATE ON private.supplier_sla_breach_events
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_sla_breach_identity_v1();

CREATE OR REPLACE FUNCTION public.server_record_supplier_sla_breach_v1(
  p_supplier_id uuid,p_sla_version_id uuid,p_order_id uuid,p_fulfilment_leg_id uuid,p_breach_type text,
  p_severity text,p_threshold_value numeric,p_observed_value numeric,p_occurred_at timestamptz,
  p_customer_impact text,p_financial_impact text,p_evidence jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_key text; v_existing private.supplier_sla_breach_events%ROWTYPE; v_id uuid; v_evidence jsonb:=COALESCE(p_evidence,'{}'::jsonb);
BEGIN
  IF p_supplier_id IS NULL OR p_sla_version_id IS NULL OR p_occurred_at IS NULL
     OR lower(BTRIM(COALESCE(p_breach_type,''))) NOT IN ('acknowledgement','dispatch','stock_freshness','price_freshness','tracking_deadline','refund_response','reimbursement_deadline','defect','stock_accuracy','cancellation')
     OR lower(BTRIM(COALESCE(p_severity,''))) NOT IN ('low','medium','high','critical')
     OR jsonb_typeof(v_evidence)<>'object' THEN
    RAISE EXCEPTION 'complete supplier SLA breach evidence is required';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_sla_versions s WHERE s.id=p_sla_version_id AND s.supplier_id=p_supplier_id) THEN
    RAISE EXCEPTION 'supplier SLA version mismatch';
  END IF;
  IF p_order_id IS NOT NULL AND p_fulfilment_leg_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM private.supplier_fulfilment_legs l WHERE l.id=p_fulfilment_leg_id AND l.order_id=p_order_id AND l.supplier_id=p_supplier_id
  ) THEN RAISE EXCEPTION 'SLA breach order/leg/supplier identity mismatch'; END IF;

  v_key:=encode(digest(concat_ws('|',p_supplier_id::text,p_sla_version_id::text,COALESCE(p_order_id::text,''),COALESCE(p_fulfilment_leg_id::text,''),lower(BTRIM(p_breach_type)),p_occurred_at::text),'sha256'),'hex');
  SELECT * INTO v_existing FROM private.supplier_sla_breach_events WHERE breach_key=v_key;
  IF FOUND THEN
    IF v_existing.supplier_id IS DISTINCT FROM p_supplier_id OR v_existing.sla_version_id IS DISTINCT FROM p_sla_version_id
       OR v_existing.order_id IS DISTINCT FROM p_order_id OR v_existing.fulfilment_leg_id IS DISTINCT FROM p_fulfilment_leg_id
       OR v_existing.breach_type IS DISTINCT FROM lower(BTRIM(p_breach_type)) OR v_existing.severity IS DISTINCT FROM lower(BTRIM(p_severity))
       OR v_existing.threshold_value IS DISTINCT FROM p_threshold_value OR v_existing.observed_value IS DISTINCT FROM p_observed_value
       OR v_existing.customer_impact IS DISTINCT FROM NULLIF(BTRIM(p_customer_impact),'')
       OR v_existing.financial_impact IS DISTINCT FROM NULLIF(BTRIM(p_financial_impact),'') OR v_existing.evidence IS DISTINCT FROM v_evidence THEN
      RAISE EXCEPTION 'supplier SLA breach idempotency collision';
    END IF;
    RETURN v_existing.id;
  END IF;

  INSERT INTO private.supplier_sla_breach_events(
    breach_key,supplier_id,sla_version_id,order_id,fulfilment_leg_id,breach_type,severity,threshold_value,observed_value,
    occurred_at,customer_impact,financial_impact,evidence
  ) VALUES(
    v_key,p_supplier_id,p_sla_version_id,p_order_id,p_fulfilment_leg_id,lower(BTRIM(p_breach_type)),lower(BTRIM(p_severity)),
    p_threshold_value,p_observed_value,p_occurred_at,NULLIF(BTRIM(p_customer_impact),''),NULLIF(BTRIM(p_financial_impact),''),v_evidence
  ) RETURNING id INTO v_id;

  INSERT INTO private.supplier_control_centre_actions(action_key,supplier_id,action_type,reason,evidence)
  VALUES('sla-breach:'||v_id::text,p_supplier_id,'sla_breach_recorded','Canonical supplier SLA breach recorded',jsonb_build_object('breachId',v_id,'breachType',lower(BTRIM(p_breach_type)),'severity',lower(BTRIM(p_severity))));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_sla_breach_v1(uuid,uuid,uuid,uuid,text,text,numeric,numeric,timestamptz,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_sla_breach_v1(uuid,uuid,uuid,uuid,text,text,numeric,numeric,timestamptz,text,text,jsonb) TO service_role;

COMMENT ON FUNCTION public.server_record_supplier_sla_breach_v1(uuid,uuid,uuid,uuid,text,text,numeric,numeric,timestamptz,text,text,jsonb) IS 'Phase M idempotent SLA breach ingestion. Exact replay returns the existing event; changed evidence under the same deterministic key is rejected.';
