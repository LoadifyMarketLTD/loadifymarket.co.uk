-- ─────────────────────────────────────────────────────────────────────────────
-- 589_fix_conversations_select_rls_drift.sql
--
-- Production drift fix:
-- Re-apply the conversations SELECT RLS policy so either participant in a
-- conversation can read the row, plus admins.
--
-- Live verification that motivated this migration:
--   - direct table query returned conversation 11a962b0-ec4e-4b92-a0f1-2c736e145bc8
--   - authenticated simulation as user2Id returned 0 rows
--
-- This migration is idempotent: it drops the live SELECT policy definition and
-- recreates it with the repository-canonical participant rule.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations FOR SELECT
  USING (
    auth.uid() = "user1Id"
    OR auth.uid() = "user2Id"
    OR is_admin()
  );
