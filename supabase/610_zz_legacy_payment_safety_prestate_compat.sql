-- 610_zz_legacy_payment_safety_prestate_compat.sql
--
-- Disposable historical-replay compatibility for a production pre-state that
-- existed before migration 611 but was installed hosted on 10 August 2026 and
-- therefore is not otherwise reconstructible from the numeric repository chain.
--
-- This file reproduces only the exact emergency payment-safety mechanism that
-- migration 611 requires as its input contract. It is deliberately fail-closed:
-- a missing/invalid setting is treated as hold=true. Migration 611 immediately
-- reconciles the switch to false after its zero-in-flight safety assertions and
-- preserves this trigger for emergency use.

CREATE SCHEMA IF NOT EXISTS private;

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'payments_safety_hold',
  'true'::jsonb,
  'Historical emergency checkout safety switch pre-state reconstructed for disposable replay before migration 611.'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.guard_payment_sessions_during_safety_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

REVOKE ALL ON FUNCTION private.guard_payment_sessions_during_safety_hold()
FROM PUBLIC, anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_guard_payment_sessions_during_safety_hold'
       AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_guard_payment_sessions_during_safety_hold
    BEFORE INSERT ON public.payment_sessions
    FOR EACH ROW
    EXECUTE FUNCTION private.guard_payment_sessions_during_safety_hold();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.platform_settings
     WHERE key = 'payments_safety_hold'
  ) THEN
    RAISE EXCEPTION 'historical payment safety setting reconstruction failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_guard_payment_sessions_during_safety_hold'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'historical payment safety trigger reconstruction failed';
  END IF;
END;
$$;
