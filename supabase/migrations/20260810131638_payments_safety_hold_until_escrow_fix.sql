INSERT INTO public.platform_settings (key, value)
VALUES ('payments_safety_hold', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION private.guard_payment_sessions_during_safety_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_hold boolean := true;
BEGIN
  SELECT CASE
           WHEN value = 'true'::jsonb THEN true
           WHEN value = 'false'::jsonb THEN false
           ELSE true
         END
    INTO v_hold
    FROM public.platform_settings
   WHERE key = 'payments_safety_hold';

  IF COALESCE(v_hold, true) THEN
    RAISE EXCEPTION 'Payments are temporarily paused while buyer-protection settlement is being hardened';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_payment_sessions_during_safety_hold() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_payment_sessions_during_safety_hold ON public.payment_sessions;
CREATE TRIGGER trg_guard_payment_sessions_during_safety_hold
BEFORE INSERT ON public.payment_sessions
FOR EACH ROW
EXECUTE FUNCTION private.guard_payment_sessions_during_safety_hold();

UPDATE public.payment_sessions
SET status = 'cancelled', "updatedAt" = now()
WHERE status = 'pending'
  AND "orderId" IS NULL
  AND "createdAt" < now() - interval '48 hours';;
