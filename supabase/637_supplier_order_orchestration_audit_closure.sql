-- 637_supplier_order_orchestration_audit_closure.sql
-- Phase I audit closure: state/reservation transitions are durable append-only evidence.

CREATE TABLE IF NOT EXISTS private.supplier_order_orchestration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES private.supplier_stock_reservations(id) ON DELETE RESTRICT,
  event text NOT NULL,
  previous_state text,
  new_state text,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_orchestration_event_check CHECK (
    event IN ('orchestration_created','orchestration_state_changed','reservation_created','reservation_released','reservation_expired','reservation_consumed')
  ),
  CONSTRAINT supplier_order_orchestration_event_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_order_orchestration_event_metadata_check CHECK (jsonb_typeof(metadata)='object')
);
CREATE INDEX IF NOT EXISTS supplier_order_orchestration_event_idx
  ON private.supplier_order_orchestration_events(orchestration_id,created_at);
REVOKE ALL ON TABLE private.supplier_order_orchestration_events FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_order_orchestration_event_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier order orchestration events are append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_orchestration_event_immutable_v1 ON private.supplier_order_orchestration_events;
CREATE TRIGGER trg_guard_supplier_order_orchestration_event_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_order_orchestration_events
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_orchestration_event_immutable_v1();

CREATE OR REPLACE FUNCTION private.audit_supplier_order_orchestration_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO private.supplier_order_orchestration_events(orchestration_id,event,new_state,reason,metadata)
    VALUES(NEW.id,'orchestration_created',NEW.state,'canonical_order_orchestration_created',jsonb_build_object('orderId',NEW.order_id,'riskState',NEW.risk_state));
  ELSIF NEW.state IS DISTINCT FROM OLD.state OR NEW.risk_state IS DISTINCT FROM OLD.risk_state THEN
    INSERT INTO private.supplier_order_orchestration_events(orchestration_id,event,previous_state,new_state,reason,metadata)
    VALUES(NEW.id,'orchestration_state_changed',OLD.state,NEW.state,'orchestration_state_transition',
      jsonb_build_object('previousRiskState',OLD.risk_state,'newRiskState',NEW.risk_state));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_supplier_order_orchestration_v1 ON private.supplier_order_orchestrations;
CREATE TRIGGER trg_audit_supplier_order_orchestration_v1
AFTER INSERT OR UPDATE ON private.supplier_order_orchestrations
FOR EACH ROW EXECUTE FUNCTION private.audit_supplier_order_orchestration_v1();

CREATE OR REPLACE FUNCTION private.audit_supplier_stock_reservation_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_leg_id uuid;
BEGIN
  SELECT i.leg_id INTO v_leg_id FROM private.supplier_fulfilment_leg_items i WHERE i.id=NEW.leg_item_id;
  IF TG_OP='INSERT' THEN
    INSERT INTO private.supplier_order_orchestration_events(
      orchestration_id,fulfilment_leg_id,reservation_id,event,new_state,reason,metadata
    ) VALUES(
      NEW.orchestration_id,v_leg_id,NEW.id,'reservation_created',NEW.status,'supplier_stock_reserved',
      jsonb_build_object('orderItemId',NEW.order_item_id,'supplierOfferId',NEW.supplier_offer_id,'quantity',NEW.quantity,'expiresAt',NEW.expires_at)
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO private.supplier_order_orchestration_events(
      orchestration_id,fulfilment_leg_id,reservation_id,event,previous_state,new_state,reason,metadata
    ) VALUES(
      NEW.orchestration_id,v_leg_id,NEW.id,
      CASE NEW.status WHEN 'released' THEN 'reservation_released' WHEN 'expired' THEN 'reservation_expired' WHEN 'consumed' THEN 'reservation_consumed' ELSE 'orchestration_state_changed' END,
      OLD.status,NEW.status,
      CASE NEW.status WHEN 'released' THEN 'reservation_released' WHEN 'expired' THEN 'reservation_expired' WHEN 'consumed' THEN 'reservation_consumed' ELSE 'reservation_state_transition' END,
      jsonb_build_object('orderItemId',NEW.order_item_id,'quantity',NEW.quantity)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_supplier_stock_reservation_v1 ON private.supplier_stock_reservations;
CREATE TRIGGER trg_audit_supplier_stock_reservation_v1
AFTER INSERT OR UPDATE ON private.supplier_stock_reservations
FOR EACH ROW EXECUTE FUNCTION private.audit_supplier_stock_reservation_v1();

COMMENT ON TABLE private.supplier_order_orchestration_events IS 'Append-only Phase I orchestration and reservation lifecycle evidence; customer order history remains in public.orders/order_events.';
