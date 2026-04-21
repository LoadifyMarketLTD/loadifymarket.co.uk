-- ================================================================
-- Migration 390: Guard UUID cast in is_admin / is_seller / owns_product
-- ================================================================
--
-- ROOT CAUSE:
--   auth.uid() is defined by Supabase as:
--     SELECT (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid
--   If request.jwt.claims contains a sub value that is not a valid UUID
--   (e.g. the literal placeholder "<uuid-admin>", an empty string, or any
--   other non-UUID text), the ::uuid cast throws:
--     ERROR 22P02: invalid input syntax for type uuid: "<value>"
--   This crash surfaces as "SQL function is_admin during startup" because
--   every RLS policy that calls is_admin() fails at connection time.
--
--   Additionally, when auth.jwt() is NULL (unauthenticated SQL-editor
--   context), the boolean expression evaluates to NULL rather than FALSE,
--   causing is_admin() to return NULL instead of FALSE.
--
-- FIX:
--   1. Replace auth.uid() with a safe inline extraction:
--        (auth.jwt() ->> 'sub') ~ '^[0-9a-f-]{36}$'
--      Only attempt the ::uuid cast when the sub value looks like a UUID.
--   2. Wrap the whole expression in COALESCE(..., false) so the function
--      always returns a boolean, never NULL.
--   3. Apply the same pattern to is_seller() and owns_product().
--   4. is_owner() delegates to is_admin() — no change needed there.
--
-- SAFE: fully idempotent — CREATE OR REPLACE on all functions.
-- ================================================================

-- ── UUID validation helper pattern (used inline below) ─────────────────────
-- We match the canonical 8-4-4-4-12 hex pattern.
-- '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
-- Using case-insensitive (~*) to also accept upper-case UUIDs from some
-- identity providers.

-- ── 1. is_admin() ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    -- Fast path: JWT app_metadata.role (no DB round-trip, immune to RLS).
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    -- DB fallback: only attempt uuid cast when sub looks like a valid UUID.
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


-- ── 2. is_owner(): backward-compat alias ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin()
$$;


-- ── 3. is_seller() ──────────────────────────────────────────────────────────

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


-- ── 4. owns_product() ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.owns_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'sub') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE id         = p_product_id
        AND "sellerId" = (auth.jwt() ->> 'sub')::uuid
    ),
    false
  )
$$;


DO $$ BEGIN
  RAISE NOTICE '390_fix_uuid_safe_cast: is_admin(), is_seller(), is_owner(), owns_product() '
               'now guard UUID cast with regex — invalid sub values return false instead of '
               'throwing 22P02. COALESCE ensures false (never null) when jwt is absent.';
END $$;
