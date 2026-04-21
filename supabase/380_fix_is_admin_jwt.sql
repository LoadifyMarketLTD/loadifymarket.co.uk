-- ================================================================
-- Migration 380: Fix is_admin() + is_seller() to use JWT claims
-- ================================================================
--
-- ROOT CAUSE OF "No sellers found on /admin/approvals":
--   is_admin() checked only public.users (DB lookup).  When the
--   admin's public.users row is missing — e.g. the account was
--   created directly in the Supabase dashboard and migration 370's
--   backfill hasn't been applied yet — is_admin() returns FALSE.
--   The users_select and seller_profiles_select RLS policies then
--   silently return 0 rows for the admin (RLS blocks reads without
--   raising an error), so the UI shows "No sellers found" instead
--   of a real error.
--
-- FIX:
--   1. Update is_admin() to check app_metadata.role from the JWT
--      FIRST (no DB round-trip, immune to missing public.users rows,
--      immune to RLS).  Keep the DB query as a fallback for sessions
--      where app_metadata hasn't been populated yet (pre-migration-340).
--   2. Update is_seller() the same way for consistency.
--   3. Re-apply users_select and seller_profiles_select policies so
--      they pick up the updated function immediately (DROP IF EXISTS +
--      CREATE is idempotent and safe to run on a live DB).
--
-- REQUIRES:
--   Migration 340 (sync_role_to_auth_metadata) backfills app_metadata.role
--   for existing users.  If 340 has not been applied, this migration still
--   works — the JWT path returns FALSE (no role claim) and the DB fallback
--   takes over, so behaviour is identical to the old function.  Apply 340
--   afterwards to fully benefit from the JWT fast-path.
--
-- SAFE: fully idempotent — CREATE OR REPLACE + DROP POLICY IF EXISTS.
-- ================================================================


-- ── 1. is_admin(): JWT fast-path + DB fallback ───────────────────────────────
--
-- Written as LANGUAGE sql (not plpgsql) so the body is a single SELECT
-- expression with no IF / BEGIN / END.  This avoids a syntax error in the
-- Supabase SQL editor which can misparse PL/pgSQL dollar-quoted blocks when
-- it encounters semicolons inside $$ ... $$ and tries to split statements.
--
-- Logic: JWT app_metadata.role takes priority (no DB round-trip, no RLS).
-- Falls back to a public.users lookup for sessions where app_metadata hasn't
-- been populated yet (pre-migration-340 or before re-authentication).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      (auth.jwt() ->> 'sub') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id       = (auth.jwt() ->> 'sub')::uuid
          AND role     = 'admin'
          AND "isActive" = TRUE
      )
    ),
    false
  )
$$;


-- ── 2. is_owner(): backward-compat alias (delegates to is_admin) ─────────────

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin()
$$;


-- ── 3. is_seller(): same pattern as is_admin() ───────────────────────────────

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'seller'
    OR (
      (auth.jwt() ->> 'sub') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id       = (auth.jwt() ->> 'sub')::uuid
          AND role     = 'seller'
          AND "isActive" = TRUE
      )
    ),
    false
  )
$$;


-- ── 4. Re-apply RLS policies that depend on is_admin() ───────────────────────
--
-- DROP + CREATE is the only reliable way to ensure a policy change takes
-- effect immediately on a live database (PostgreSQL caches policy definitions).

-- users_select
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (auth.uid() = id OR is_admin());

-- seller_profiles_select
DROP POLICY IF EXISTS "seller_profiles_select" ON public.seller_profiles;
CREATE POLICY "seller_profiles_select" ON public.seller_profiles FOR SELECT
  USING (auth.uid() = "userId" OR is_admin());


DO $$ BEGIN
  RAISE NOTICE '380_fix_is_admin_jwt: is_admin() and is_seller() now use '
               'app_metadata.role (JWT) as the primary check with DB fallback. '
               'users_select and seller_profiles_select policies re-applied.';
END $$;
