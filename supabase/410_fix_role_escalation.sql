-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 410: Fix privilege escalation in users_update RLS policy.
--
-- PROBLEM: The previous users_update policy had no WITH CHECK clause, so an
-- authenticated user could update their own row and set role='admin' without
-- being an admin themselves.
--
-- FIX: Add WITH CHECK that reads the caller's CURRENT role from the DB and
-- ensures the new value is the same unless the caller is already an admin.
-- PostgreSQL RLS WITH CHECK does not expose OLD, so we re-read from the table.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_update"
ON users
FOR UPDATE
USING (auth.uid() = id OR is_admin())
WITH CHECK (
  -- Allow the update only when:
  --   (a) the role column is not being changed, OR
  --   (b) the caller is already an admin (can promote / demote others).
  -- We read the current role via a sub-select because OLD is unavailable here.
  role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
  OR is_admin()
);
