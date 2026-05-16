-- ─────────────────────────────────────────────────────────────────────────────
-- 581_harden_disputes_update_rls.sql
--
-- Re-applies the safe disputes UPDATE policy for environments that may have
-- been created before the launch_features / audit-gap fixes were executed.
--
-- Goal:
--   - buyers/sellers may update their own disputes
--   - only admins may set resolved / closed
--   - resulting rows are constrained with WITH CHECK
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_update" ON public.disputes;

CREATE POLICY "disputes_update" ON public.disputes
FOR UPDATE
USING (
  auth.uid() = "buyerId"
  OR auth.uid() = "sellerId"
  OR public.is_admin()
)
WITH CHECK (
  public.is_admin()
  OR (
    (auth.uid() = "buyerId" OR auth.uid() = "sellerId")
    AND status NOT IN ('resolved', 'closed')
  )
);
