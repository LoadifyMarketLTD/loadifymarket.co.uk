-- 653_supplier_return_quantity_closure.sql
-- Phase L Branch Guard closure: multiple idempotent return cases may not cumulatively
-- claim more units than the canonical fulfilment leg contains.

CREATE OR REPLACE FUNCTION private.guard_supplier_return_quantity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_leg_quantity integer; v_existing_quantity integer;
BEGIN
  -- Serialize return-case creation per fulfilment leg so concurrent requests cannot over-return.
  PERFORM 1 FROM private.supplier_fulfilment_legs l WHERE l.id=NEW.fulfilment_leg_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier return fulfilment leg missing'; END IF;

  SELECT COALESCE(SUM(i.quantity),0)::integer INTO v_leg_quantity
    FROM private.supplier_fulfilment_leg_items i WHERE i.leg_id=NEW.fulfilment_leg_id;
  SELECT COALESCE(SUM(c.requested_quantity),0)::integer INTO v_existing_quantity
    FROM private.supplier_return_cases c
   WHERE c.fulfilment_leg_id=NEW.fulfilment_leg_id AND c.state<>'cancelled';

  IF NEW.requested_quantity<=0 OR v_existing_quantity+NEW.requested_quantity>v_leg_quantity THEN
    RAISE EXCEPTION 'cumulative supplier return quantity exceeds fulfilment leg quantity';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_return_quantity_v1 ON private.supplier_return_cases;
CREATE TRIGGER trg_guard_supplier_return_quantity_v1
BEFORE INSERT ON private.supplier_return_cases
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_return_quantity_v1();

COMMENT ON FUNCTION private.guard_supplier_return_quantity_v1() IS 'Serializes supplier return creation per leg and prevents duplicate/multiple return cases from over-returning canonical ordered quantity.';
