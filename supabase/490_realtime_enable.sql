-- ─────────────────────────────────────────────────────────────────────────────
-- 490_realtime_enable.sql
--
-- Adds the offers and orders tables to the supabase_realtime publication so
-- that the mobile chat page can subscribe to live status changes via
-- Supabase Realtime postgres_changes events.
--
-- Safe to run multiple times: ADD TABLE is idempotent — Postgres ignores the
-- statement if the table is already a member of the publication.
-- ─────────────────────────────────────────────────────────────────────────────

-- Required for Realtime to include old/new values of all columns in UPDATE
-- events (not just the primary key). Without FULL replica identity, UPDATE
-- payloads only contain the primary key + changed columns.
ALTER TABLE offers SET (replica_identity = full);
ALTER TABLE orders SET (replica_identity = full);

-- Add to the Supabase managed Realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
