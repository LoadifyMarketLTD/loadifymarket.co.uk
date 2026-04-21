-- ============================================================================
-- Migration 340: Sync public.users.role → auth.users.raw_app_meta_data
-- ============================================================================
--
-- PROBLEM:
--   The Supabase JS client exposes auth metadata via session.user.app_metadata.
--   The app's userFromSession() fallback reads app_metadata.role to determine
--   the user's role when the public.users DB query fails or is unavailable.
--   Because this field was never populated, the fallback always returns
--   role='buyer' — causing admin and seller users to be routed to Buyer Hub
--   instead of their correct dashboard, even though public.users has the
--   correct role value.
--
-- FIX:
--   1. One-time backfill: copy public.users.role into
--      auth.users.raw_app_meta_data for every existing user.
--   2. Trigger: keep app_metadata.role in sync whenever public.users.role
--      is changed going forward (INSERT or UPDATE).
--
-- WHY THIS IS THE RIGHT LAYER:
--   app_metadata is set server-side only (Supabase Auth) and cannot be
--   modified by the client, making it the authoritative fallback for role
--   resolution. Any client-side race or DB query failure will now fall back
--   to the correct role rather than defaulting to 'buyer'.
--
-- SAFE:
--   Idempotent — uses CREATE OR REPLACE for the function and
--   DROP TRIGGER IF EXISTS before CREATE TRIGGER.
--   The UPDATE merges using jsonb || so it never removes unrelated keys
--   (e.g. provider, email_verified) from app_metadata.
-- ============================================================================

-- ── 1. Trigger function ──────────────────────────────────────────────────────
-- SECURITY DEFINER so the trigger can write to auth.users even when fired
-- in the context of a normal authenticated user's INSERT/UPDATE.

CREATE OR REPLACE FUNCTION public.sync_role_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Merge role into app_metadata, preserving all other existing keys.
  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- ── 2. Attach trigger to public.users ────────────────────────────────────────
-- Fires AFTER INSERT (new signup) or AFTER UPDATE OF role (admin promotion /
-- role change).  FOR EACH ROW so it handles bulk updates correctly.

DROP TRIGGER IF EXISTS trg_sync_role_to_auth_metadata ON public.users;

CREATE TRIGGER trg_sync_role_to_auth_metadata
  AFTER INSERT OR UPDATE OF role
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_auth_metadata();

-- ── 3. One-time backfill for all existing users ───────────────────────────────
-- Ensures every current user immediately has the correct app_metadata.role,
-- so the fix takes effect for existing sessions without waiting for a sign-out
-- / sign-in cycle to trigger the new trigger.

UPDATE auth.users au
SET raw_app_meta_data =
      COALESCE(au.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE au.id = pu.id;

DO $$ BEGIN
  RAISE NOTICE '340_sync_role_to_auth_metadata: backfill applied + trigger created. app_metadata.role now mirrors public.users.role for all users.';
END $$;
