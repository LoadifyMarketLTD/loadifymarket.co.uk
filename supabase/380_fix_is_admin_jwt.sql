-- ============================================================================
-- Migration 380: Replace is_admin() and is_seller() with JWT-first versions
-- ============================================================================
--
-- PROBLEM:
--   The live is_admin() function is the original PL/pgSQL version that queries
--   ONLY public.users.  If the admin's public.users row is missing or the role
--   column is wrong, is_admin() returns FALSE — causing every RLS policy that
--   calls it (users_select, products_select/update/delete, seller_profiles_select,
--   stripe_events_*, product_shipping_*) to return 0 rows / deny writes.
--
-- WHY DROP FAILS:
--   "cannot drop function is_admin() because other objects depend on it"
--   10 RLS policies reference is_admin() by name.  DROP FUNCTION (even with
--   CASCADE) would delete those policies.
--
-- FIX — CREATE OR REPLACE:
--   PostgreSQL allows CREATE OR REPLACE FUNCTION to change the implementation
--   language (plpgsql → sql) as long as the function signature is identical.
--   Dependent objects (RLS policies) bind to the function OID, not the body,
--   so they survive the replacement intact.
--
-- RESULT:
--   is_admin() checks JWT app_metadata.role FIRST (set server-side by
--   migration 340 and by handle_new_auth_user) and falls back to the
--   public.users DB query.  This means admin access works even during
--   the brief window before public.users is synced, and even if the
--   public.users row has a stale role value.
--
-- SAFE: Fully idempotent — CREATE OR REPLACE never drops dependents.
-- ============================================================================

-- ── is_admin() ───────────────────────────────────────────────────────────────
-- JWT path:  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
--   • Set by the 340 migration trigger (trg_sync_role_to_auth_metadata) on every
--     public.users INSERT/UPDATE OF role.
--   • Also set by the 370 handle_new_auth_user trigger on new signups.
--   • Embedded in the Supabase JWT so it is available WITHOUT a DB round-trip.
-- DB fallback: EXISTS (SELECT 1 FROM public.users WHERE ...)
--   • Catches edge cases where app_metadata is stale or not yet populated.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'admin'
        AND "isActive" = TRUE
    )
  );
$$;

-- ── is_seller() ──────────────────────────────────────────────────────────────
-- Same dual-path pattern as is_admin() for consistency.

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'seller'
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'seller'
        AND "isActive" = TRUE
    )
  );
$$;

-- ── is_owner() ───────────────────────────────────────────────────────────────
-- Backward-compat alias — delegates to is_admin().
-- Kept as LANGUAGE sql for consistency (avoids plpgsql BEGIN/END block).

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin();
$$;
