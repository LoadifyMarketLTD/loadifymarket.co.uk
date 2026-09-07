-- User-level marketplace blocking for UGC/chat safety.
-- This migration is intentionally separate from administrative account suspension.

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "blockerId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "blockedId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_no_self CHECK ("blockerId" <> "blockedId"),
  CONSTRAINT user_blocks_pair_unique UNIQUE ("blockerId", "blockedId")
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
  ON public.user_blocks ("blockerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON public.user_blocks ("blockedId", "createdAt" DESC);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_blocks FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;
GRANT ALL ON TABLE public.user_blocks TO service_role;

DROP POLICY IF EXISTS user_blocks_select_own ON public.user_blocks;
CREATE POLICY user_blocks_select_own ON public.user_blocks
FOR SELECT TO authenticated
USING (
  (SELECT public.is_active_user())
  AND "blockerId" = (SELECT auth.uid())
);

DROP POLICY IF EXISTS user_blocks_insert_own ON public.user_blocks;
CREATE POLICY user_blocks_insert_own ON public.user_blocks
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.is_active_user())
  AND "blockerId" = (SELECT auth.uid())
  AND "blockedId" <> (SELECT auth.uid())
);

DROP POLICY IF EXISTS user_blocks_delete_own ON public.user_blocks;
CREATE POLICY user_blocks_delete_own ON public.user_blocks
FOR DELETE TO authenticated
USING (
  (SELECT public.is_active_user())
  AND "blockerId" = (SELECT auth.uid())
);
