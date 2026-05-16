-- ================================================================
-- 570_tighten_support_ticket_insert_rls.sql
-- Loadify Market — Harden support_tickets INSERT policy
-- ================================================================
-- Problem:
--   support_tickets_insert previously used WITH CHECK (TRUE), allowing
--   anonymous direct inserts from the public client and enabling DB spam.
--
-- Fix:
--   Allow direct INSERT only when:
--     1) caller is admin, OR
--     2) caller is authenticated and writing their own userId row
--        (guest fields must be null in that path).
--
-- Note:
--   Public guest ticket creation now goes through the validated
--   server-side Netlify function (service role), not direct browser inserts.
-- ================================================================

DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;

CREATE POLICY "support_tickets_insert" ON support_tickets
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND "userId" = auth.uid()
      AND "guestEmail" IS NULL
      AND "guestName" IS NULL
    )
  );
