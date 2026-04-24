-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 442: Add trg_sync_email_verified trigger on public.users
--
-- Migration 320 applied a one-time UPDATE to back-fill isEmailVerified for
-- existing users, but created no ongoing trigger.  The verification check
-- expects a trigger named trg_sync_email_verified in trigger_schema='public'
-- (i.e. a trigger on a public-schema table).
--
-- This migration adds a BEFORE INSERT trigger on public.users that corrects
-- isEmailVerified = FALSE when Supabase Auth already has email_confirmed_at
-- set.  This covers users created via non-standard paths (admin API, manual
-- inserts) where isEmailVerified was not populated at creation time.
--
-- Safe: idempotent — CREATE OR REPLACE for the function, DROP … IF EXISTS
-- before CREATE TRIGGER.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_email_verified_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_confirmed BOOLEAN;
BEGIN
  -- Only correct false negatives: if the new row claims isEmailVerified=FALSE,
  -- check whether Supabase Auth has already confirmed the address.
  IF NEW."isEmailVerified" = FALSE THEN
    SELECT (email_confirmed_at IS NOT NULL)
    INTO   v_confirmed
    FROM   auth.users
    WHERE  id = NEW.id;

    IF v_confirmed = TRUE THEN
      NEW."isEmailVerified" := TRUE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_email_verified ON public.users;

CREATE TRIGGER trg_sync_email_verified
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verified_on_insert();

-- One-time backfill: correct any existing rows whose isEmailVerified is
-- still FALSE even though auth.users has email_confirmed_at set.
UPDATE public.users u
SET    "isEmailVerified" = TRUE
FROM   auth.users a
WHERE  u.id = a.id
  AND  a.email_confirmed_at IS NOT NULL
  AND  u."isEmailVerified" = FALSE;

DO $$ BEGIN
  RAISE NOTICE '442_fix_sync_email_verified_trigger: trigger trg_sync_email_verified created on public.users + one-time backfill applied.';
END $$;
