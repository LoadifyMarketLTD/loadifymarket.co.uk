DROP POLICY IF EXISTS active_account_access ON public.payment_sessions;
DROP POLICY IF EXISTS payment_sessions_participant_select ON public.payment_sessions;

CREATE POLICY payment_sessions_participant_select
ON public.payment_sessions
FOR SELECT TO authenticated
USING (
  ("userId" = (select auth.uid()) AND (select public.is_active_user()))
  OR (select public.is_admin())
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = payment_sessions."orderId"
      AND o."sellerId" = (select auth.uid())
  )
);

COMMENT ON POLICY payment_sessions_participant_select ON public.payment_sessions IS
  'Payment session rows are readable only by the buyer, the order seller, or an admin. Client writes are not permitted; payment lifecycle mutations remain server-side.';
