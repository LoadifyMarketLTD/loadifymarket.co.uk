CREATE OR REPLACE FUNCTION private.guard_web_checkout_shipping_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_shipping numeric := 0;
  v_source text := NULL;
BEGIN
  IF NEW.status = 'pending' AND NEW.metadata IS NOT NULL THEN
    v_shipping := COALESCE((NEW.metadata ->> 'shippingAmount')::numeric, 0);
    v_source := NEW.metadata ->> 'source';

    -- Mobile PaymentIntent includes shipping in the actual Stripe amount and is safe.
    -- Web Checkout Session currently does not include shipping in Stripe line_items.
    IF v_shipping > 0 AND COALESCE(v_source, 'web') <> 'mobile' THEN
      RAISE EXCEPTION 'Web checkout with paid shipping is temporarily blocked until Stripe Checkout includes the shipping charge';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_web_checkout_shipping_charge() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_web_checkout_shipping_charge ON public.payment_sessions;
CREATE TRIGGER trg_guard_web_checkout_shipping_charge
BEFORE INSERT ON public.payment_sessions
FOR EACH ROW EXECUTE FUNCTION private.guard_web_checkout_shipping_charge();;
