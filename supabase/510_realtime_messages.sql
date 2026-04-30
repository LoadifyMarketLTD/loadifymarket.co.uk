-- ─────────────────────────────────────────────────────────────────────────────
-- 510_realtime_messages.sql
--
-- Adds the messages table to the supabase_realtime publication so that chat
-- subscribers (BuyerMessages.tsx, MobileChatPage.tsx) receive live INSERT
-- events via Supabase Realtime postgres_changes without needing a page refresh.
--
-- Safe to run multiple times: ADD TABLE is idempotent — Postgres silently
-- ignores the statement if the table is already a member of the publication.
-- ─────────────────────────────────────────────────────────────────────────────

-- FULL replica identity ensures all column values are included in change
-- payloads, not just the primary key.
ALTER TABLE messages SET (replica_identity = full);

-- Add to the Supabase managed Realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
