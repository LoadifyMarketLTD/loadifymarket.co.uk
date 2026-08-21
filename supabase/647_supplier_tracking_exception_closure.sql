-- 647_supplier_tracking_exception_closure.sql
-- Phase K Branch Guard closure: tracking identity/terminal monotonicity + exception lifecycle history.

CREATE OR REPLACE FUNCTION private.guard_supplier_leg_shipment_identity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.orchestration_id IS DISTINCT FROM OLD.orchestration_id
     OR NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id OR NEW.handshake_id IS DISTINCT FROM OLD.handshake_id
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR NEW.provider_key IS DISTINCT FROM OLD.provider_key
     OR NEW.external_supplier_order_ref IS DISTINCT FROM OLD.external_supplier_order_ref THEN
    RAISE EXCEPTION 'supplier leg shipment identity is immutable';
  END IF;
  IF OLD.tracking_ref IS NOT NULL AND NEW.tracking_ref IS DISTINCT FROM OLD.tracking_ref THEN
    RAISE EXCEPTION 'supplier leg shipment tracking reference is immutable once known';
  END IF;
  IF OLD.canonical_status='delivered' AND NEW.canonical_status NOT IN ('delivered','returned') THEN
    RAISE EXCEPTION 'delivered supplier shipment cannot regress';
  END IF;
  IF OLD.canonical_status='returned' AND NEW.canonical_status<>'returned' THEN
    RAISE EXCEPTION 'returned supplier shipment cannot regress';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_leg_shipment_identity_v1 ON private.supplier_leg_shipments;
CREATE TRIGGER trg_guard_supplier_leg_shipment_identity_v1
BEFORE UPDATE ON private.supplier_leg_shipments
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_leg_shipment_identity_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_tracking_mapping_history_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'supplier tracking mapping history cannot be deleted'; END IF;
  IF OLD.status='approved' AND (
    NEW.provider_key IS DISTINCT FROM OLD.provider_key OR NEW.provider_status IS DISTINCT FROM OLD.provider_status
    OR NEW.canonical_status IS DISTINCT FROM OLD.canonical_status OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.evidence IS DISTINCT FROM OLD.evidence OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
  ) THEN RAISE EXCEPTION 'approved supplier tracking mapping truth is immutable; create a new version'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_tracking_mapping_history_v1 ON private.supplier_tracking_status_mappings;
CREATE TRIGGER trg_guard_supplier_tracking_mapping_history_v1
BEFORE UPDATE OR DELETE ON private.supplier_tracking_status_mappings
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_tracking_mapping_history_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_exception_identity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.orchestration_id IS DISTINCT FROM OLD.orchestration_id
     OR NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id OR NEW.handshake_id IS DISTINCT FROM OLD.handshake_id
     OR NEW.shipment_id IS DISTINCT FROM OLD.shipment_id OR NEW.exception_key IS DISTINCT FROM OLD.exception_key
     OR NEW.exception_type IS DISTINCT FROM OLD.exception_type OR NEW.source_event_id IS DISTINCT FROM OLD.source_event_id
     OR NEW.customer_impact IS DISTINCT FROM OLD.customer_impact OR NEW.financial_impact IS DISTINCT FROM OLD.financial_impact THEN
    RAISE EXCEPTION 'supplier order exception identity/impact evidence is immutable';
  END IF;
  IF OLD.state='closed' AND NEW.state<>'closed' THEN RAISE EXCEPTION 'closed supplier order exception cannot regress'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_exception_identity_v1 ON private.supplier_order_exceptions;
CREATE TRIGGER trg_guard_supplier_exception_identity_v1
BEFORE UPDATE ON private.supplier_order_exceptions
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_exception_identity_v1();

CREATE OR REPLACE FUNCTION public.server_admin_approve_supplier_tracking_mapping_v1(
  p_actor_id uuid,p_provider_key text,p_provider_status text,p_canonical_status text,p_evidence jsonb,p_effective_from timestamptz DEFAULT now()
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_id uuid; v_version integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  IF NULLIF(BTRIM(p_provider_key),'') IS NULL OR NULLIF(BTRIM(p_provider_status),'') IS NULL
     OR p_canonical_status NOT IN ('pending','accepted','dispatched','in_transit','exception','out_for_delivery','delivered','failed_delivery','returned')
     OR jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' OR COALESCE(p_evidence,'{}'::jsonb)='{}'::jsonb THEN
    RAISE EXCEPTION 'complete tracking mapping evidence is required';
  END IF;
  UPDATE private.supplier_tracking_status_mappings SET status='retired',effective_to=p_effective_from
   WHERE provider_key=BTRIM(p_provider_key) AND lower(provider_status)=lower(BTRIM(p_provider_status))
     AND status='approved' AND effective_to IS NULL;
  SELECT COALESCE(MAX(version),0)+1 INTO v_version FROM private.supplier_tracking_status_mappings
   WHERE provider_key=BTRIM(p_provider_key) AND lower(provider_status)=lower(BTRIM(p_provider_status));
  INSERT INTO private.supplier_tracking_status_mappings(
    provider_key,provider_status,canonical_status,version,status,evidence,approved_by,approved_at,effective_from
  ) VALUES(BTRIM(p_provider_key),BTRIM(p_provider_status),p_canonical_status,v_version,'approved',p_evidence,p_actor_id,now(),p_effective_from)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_approve_supplier_tracking_mapping_v1(uuid,text,text,text,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_approve_supplier_tracking_mapping_v1(uuid,text,text,text,jsonb,timestamptz) TO service_role;

COMMENT ON FUNCTION private.guard_supplier_leg_shipment_identity_v1() IS 'Phase K terminal/identity guard: delivered tracking truth may only stay delivered or proceed to returned.';
