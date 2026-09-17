DROP POLICY IF EXISTS active_account_access ON public.payment_sessions;
DROP POLICY IF EXISTS payment_sessions_participant_select ON public.payment_sessions;
DROP POLICY IF EXISTS payment_sessions_owner_select ON public.payment_sessions;

CREATE POLICY payment_sessions_owner_select
ON public.payment_sessions
FOR SELECT TO authenticated
USING (
  "userId" = (select auth.uid())
  AND (select public.is_active_user())
);

REVOKE INSERT, UPDATE, DELETE ON public.payment_sessions FROM authenticated;
GRANT SELECT ON public.payment_sessions TO authenticated;

COMMENT ON POLICY payment_sessions_owner_select ON public.payment_sessions IS
  'Authenticated buyers may read only their own payment session rows. Payment lifecycle writes remain server-side.';
