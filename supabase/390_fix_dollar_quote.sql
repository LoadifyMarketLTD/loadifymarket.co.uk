-- ============================================================================
-- Migration 390: Fix Supabase SQL editor dollar-quote splitting bug
-- ============================================================================
--
-- PROBLEM:
--   The Supabase SQL editor has a well-known parser bug: it splits the entire
--   migration text at every bare `$$` token and attempts to execute the content
--   between each pair as a standalone SQL statement.  When it does this the
--   function body ends up running as:
--
--       COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
--       OR EXISTS (...)
--
--   which is not valid SQL outside a SELECT, producing:
--       ERROR 42601: syntax error at or near "COALESCE"
--
-- FIX — named dollar-quote tags:
--   Replacing bare `$$` with the named tag `$func$` makes the delimiter
--   unambiguous.  The editor's simple `$$` tokeniser no longer matches it,
--   so the entire CREATE OR REPLACE statement is sent to PostgreSQL as one
--   unit and parsed correctly.
--
-- ALSO FIXED — safe UUID extraction:
--   auth.uid() wraps auth.jwt() ->> 'sub' and casts it to uuid. If the sub
--   claim is absent or malformed the cast raises ERROR 22P02 (invalid uuid).
--   The DB-fallback path now guards with a regex before casting so the
--   function never raises — it returns false instead.
--
-- SAFE: CREATE OR REPLACE preserves all 10 dependent RLS policy OIDs.
-- ============================================================================

-- ── is_admin() ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    OR (
      (auth.jwt() ->> 'sub') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (auth.jwt() ->> 'sub')::uuid
          AND role = 'admin'
          AND "isActive" = TRUE
      )
    )
  );
$func$;

-- ── is_seller() ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'seller', false)
    OR (
      (auth.jwt() ->> 'sub') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (auth.jwt() ->> 'sub')::uuid
          AND role = 'seller'
          AND "isActive" = TRUE
      )
    )
  );
$func$;

-- ── is_owner() ───────────────────────────────────────────────────────────────
-- Backward-compat alias — delegates to is_admin().

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT public.is_admin();
$func$;
