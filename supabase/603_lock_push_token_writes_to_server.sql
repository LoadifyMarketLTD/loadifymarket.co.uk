-- 603_lock_push_token_writes_to_server.sql
--
-- Canonical push-token contract:
--   * authenticated users may read only their own registered devices;
--   * all token registration / reassignment / deactivation is performed through
--     the authenticated push-token Netlify function using service_role;
--   * clients must not be able to bypass ownership reconciliation by writing
--     public.push_tokens directly.
--
-- This migration is deliberately non-destructive to existing token rows.

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Remove drifted client-write policies. Historical environments may contain
-- one or more of these names; DROP IF EXISTS keeps the repair idempotent.
DROP POLICY IF EXISTS "push_tokens_insert" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_update" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_owner_insert" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_owner_update" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_owner_delete" ON public.push_tokens;

-- Reapply the read-only owner policy as the single client-facing contract.
DROP POLICY IF EXISTS "push_tokens_owner_select" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_select" ON public.push_tokens;
CREATE POLICY "push_tokens_owner_select"
  ON public.push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "userId");

-- Supabase projects commonly grant broad table privileges to anon/authenticated
-- by default and rely on RLS for row filtering. For this server-only write
-- boundary, remove the underlying write privileges as defense in depth.
REVOKE ALL ON TABLE public.push_tokens FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.push_tokens FROM authenticated;
GRANT SELECT ON TABLE public.push_tokens TO authenticated;

-- service_role retains its existing privileges and bypasses RLS, which is what
-- the canonical /.netlify/functions/push-token endpoint uses.

COMMENT ON TABLE public.push_tokens IS
  'Push notification device registrations. Authenticated users may read their own rows; all writes are server-managed through the push-token endpoint using service_role.';
