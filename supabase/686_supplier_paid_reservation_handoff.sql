-- 686_supplier_paid_reservation_handoff.sql
-- Stage 6 closure: after the canonical order becomes paid, keep the exact supplier
-- reservation active and hand the internal leg/orchestration from ready_for_payment
-- back to the reserved state expected by the existing Phase J submission guard.
-- No provider call and no control activation.

CREATE OR REPLACE FUNCTION private.sync_supplier_checkout_preparation_paid_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_preparation private.supplier_checkout_preparations%ROWTYPE;
BEGIN
  IF NEW.status='paid' AND OLD.status IS DISTINCT FROM 'paid'
     AND NEW."commercialModeSnapshot"='loadify_supplier_fulfilled' THEN
    SELECT * INTO v_preparation
      FROM private.supplier_checkout_preparations
     WHERE order_id=NEW.id AND state='prepared'
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'paid supplier order requires its canonical checkout preparation';
    END IF;

    UPDATE private.supplier_checkout_preparations
       SET state='paid',paid_at=now()
     WHERE id=v_preparation.id;

    UPDATE private.supplier_fulfilment_legs
       SET status='reserved',updated_at=now()
     WHERE id=v_preparation.fulfilment_leg_id
       AND status='ready_for_payment';

    UPDATE private.supplier_order_orchestrations
       SET state='reserved',updated_at=now()
     WHERE id=v_preparation.orchestration_id
       AND state='ready_for_payment';

    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_stock_reservations r
       WHERE r.id=v_preparation.reservation_id
         AND r.status='active'
         AND r.expires_at>now()
    ) THEN
      RAISE EXCEPTION 'paid supplier order requires an active unexpired reservation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_supplier_checkout_preparation_paid_v1()
  FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS trg_sync_supplier_checkout_preparation_paid_v1 ON public.orders;
CREATE TRIGGER trg_sync_supplier_checkout_preparation_paid_v1
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.sync_supplier_checkout_preparation_paid_v1();

COMMENT ON FUNCTION private.sync_supplier_checkout_preparation_paid_v1() IS
  'Stage 6 paid handoff. Marks the exact checkout preparation paid and keeps its active reservation/leg ready for the Phase J supplier-order submission guard.';