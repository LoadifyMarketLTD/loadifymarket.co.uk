-- Multi-country order and refund money invariants.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_market_currency_coherence_check,
  ADD CONSTRAINT orders_market_currency_coherence_check CHECK (
    ("marketCode"='GB' AND currency='GBP')
    OR ("marketCode"='RO' AND currency='RON')
  );

CREATE OR REPLACE FUNCTION public.guard_order_item_market_currency_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_currency text;
BEGIN
  SELECT currency INTO v_currency FROM public.orders WHERE id=NEW."orderId";
  IF v_currency IS NULL OR NEW.currency IS DISTINCT FROM v_currency THEN
    RAISE EXCEPTION 'order item currency must match order currency';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_order_item_market_currency_v1 ON public.order_items;
CREATE TRIGGER trg_guard_order_item_market_currency_v1
BEFORE INSERT OR UPDATE OF currency,"orderId" ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.guard_order_item_market_currency_v1();

CREATE OR REPLACE FUNCTION public.guard_supplier_refund_market_currency_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_currency text;
BEGIN
  SELECT currency INTO v_currency FROM public.orders WHERE id=NEW.order_id;
  IF v_currency IS NULL OR NEW.currency IS DISTINCT FROM v_currency THEN
    RAISE EXCEPTION 'supplier refund currency must match order currency';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_supplier_refund_market_currency_v1 ON private.supplier_customer_refund_evidence;
CREATE TRIGGER trg_guard_supplier_refund_market_currency_v1
BEFORE INSERT OR UPDATE OF currency,order_id ON private.supplier_customer_refund_evidence
FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_refund_market_currency_v1();

CREATE OR REPLACE FUNCTION public.guard_supplier_recovery_market_currency_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_currency text;
BEGIN
  SELECT currency INTO v_currency FROM public.orders WHERE id=NEW.order_id;
  IF v_currency IS NULL OR NEW.currency IS DISTINCT FROM v_currency THEN
    RAISE EXCEPTION 'supplier recovery currency must match order currency';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_supplier_recovery_market_currency_v1 ON private.supplier_recovery_evidence;
CREATE TRIGGER trg_guard_supplier_recovery_market_currency_v1
BEFORE INSERT OR UPDATE OF currency,order_id ON private.supplier_recovery_evidence
FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_recovery_market_currency_v1();

CREATE OR REPLACE FUNCTION public.guard_supplier_reconciliation_market_currency_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_currency text;
BEGIN
  SELECT currency INTO v_currency FROM public.orders WHERE id=NEW.order_id;
  IF v_currency IS NULL OR NEW.currency IS DISTINCT FROM v_currency THEN
    RAISE EXCEPTION 'supplier reconciliation currency must match order currency';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_supplier_reconciliation_market_currency_v1 ON private.supplier_financial_reconciliations;
CREATE TRIGGER trg_guard_supplier_reconciliation_market_currency_v1
BEFORE INSERT OR UPDATE OF currency,order_id ON private.supplier_financial_reconciliations
FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_reconciliation_market_currency_v1();

REVOKE ALL ON FUNCTION public.guard_order_item_market_currency_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_supplier_refund_market_currency_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_supplier_recovery_market_currency_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_supplier_reconciliation_market_currency_v1() FROM PUBLIC,anon,authenticated;
