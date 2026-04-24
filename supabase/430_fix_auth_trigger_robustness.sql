-- ================================================================
-- Migration 430: Harden handle_new_auth_user trigger
-- ================================================================
--
-- PROBLEM:
--   Registration fails with "Database error creating new user" from
--   Supabase Auth.  The error originates in the on_auth_user_created
--   trigger (migration 370) which inserts a stub row into public.users
--   when a new auth.users row is created.
--
--   The original INSERT used:
--
--     ON CONFLICT (id) DO NOTHING
--
--   This only suppresses PRIMARY KEY conflicts.  Any other unique
--   constraint violation (in particular the `email UNIQUE` constraint)
--   propagates as an unhandled exception, which Supabase converts to
--   the opaque "Database error creating new user" response.
--
--   Two scenarios that trigger the email conflict:
--     a) An orphaned public.users row whose auth.users parent was
--        removed directly in Supabase without the cascade propagating
--        (e.g., a soft-delete scenario or manual admin deletion
--        that bypassed referential integrity).
--     b) A race condition where the register.ts Netlify function
--        inserted the public.users row *before* the auth trigger
--        fired (older versions of the registration flow).
--
-- FIX:
--   1. Replace ON CONFLICT (id) DO NOTHING with ON CONFLICT DO NOTHING
--      (no target = suppress any unique-constraint violation, including
--      the email uniqueness constraint).
--   2. Wrap the body in an EXCEPTION WHEN OTHERS handler so that any
--      unexpected error (transient DB issue, schema drift, etc.) is
--      logged as a WARNING and the trigger returns NEW rather than
--      re-raising — preventing it from ever blocking auth user creation.
--
-- SAFE: fully idempotent — CREATE OR REPLACE FUNCTION, no schema
--       changes, no data mutations.
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert a stub public.users row for the new auth user.
  -- ON CONFLICT DO NOTHING (no explicit target) suppresses violations
  -- on *any* unique constraint — the primary key (id) as well as the
  -- email uniqueness constraint — so orphaned rows with the same email
  -- no longer cause an unhandled exception.
  INSERT INTO public.users (id, email, role, "isEmailVerified")
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN (NEW.raw_app_meta_data  ->>'role') IN ('admin', 'seller', 'buyer')
        THEN (NEW.raw_app_meta_data ->>'role')
      WHEN (NEW.raw_user_meta_data ->>'role') IN ('admin', 'seller', 'buyer')
        THEN (NEW.raw_user_meta_data->>'role')
      ELSE 'buyer'
    END,
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Any unexpected error (transient DB issue, constraint change, etc.)
  -- is logged as a WARNING and swallowed.  The trigger must never block
  -- auth user creation — register.ts inserts the public.users row as a
  -- second step and will surface a cleaner error if it also fails.
  RAISE WARNING 'handle_new_auth_user: non-fatal error for auth user % (email: %): %',
    NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '430_fix_auth_trigger_robustness: handle_new_auth_user updated — ON CONFLICT DO NOTHING + EXCEPTION guard applied.';
END $$;
