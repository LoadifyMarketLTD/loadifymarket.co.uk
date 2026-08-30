ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_insert" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_update" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_owner_insert" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_owner_update" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_owner_delete" ON public.push_tokens;

DROP POLICY IF EXISTS "push_tokens_owner_select" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_select" ON public.push_tokens;
CREATE POLICY "push_tokens_owner_select"
  ON public.push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "userId");

REVOKE ALL ON TABLE public.push_tokens FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.push_tokens FROM authenticated;
GRANT SELECT ON TABLE public.push_tokens TO authenticated;

COMMENT ON TABLE public.push_tokens IS
  'Push notification device registrations. Authenticated users may read their own rows; all writes are server-managed through the push-token endpoint using service_role.';;
