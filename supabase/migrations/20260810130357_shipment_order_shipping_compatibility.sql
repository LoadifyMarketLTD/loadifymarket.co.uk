ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method text,
  ADD COLUMN IF NOT EXISTS shipping_cost numeric;

CREATE OR REPLACE FUNCTION private.sync_legacy_order_shipping_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.shipping_method IS DISTINCT FROM OLD.shipping_method
     AND NEW.shipping_method IS NOT NULL THEN
    NEW."shippingMethod" := NEW.shipping_method;
  END IF;

  IF NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost
     AND NEW.shipping_cost IS NOT NULL THEN
    NEW."shippingAmount" := NEW.shipping_cost;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.sync_legacy_order_shipping_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_legacy_order_shipping_columns ON public.orders;
CREATE TRIGGER trg_sync_legacy_order_shipping_columns
BEFORE UPDATE OF shipping_method, shipping_cost ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.sync_legacy_order_shipping_columns();;
