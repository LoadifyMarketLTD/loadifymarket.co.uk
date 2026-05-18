-- ─────────────────────────────────────────────────────────────────────────────
-- 587_realtime_notifications.sql
--
-- Stage 2 hardening:
--   Ensure notifications changes are broadcast via Supabase Realtime.
--
-- Why:
--   Frontend already subscribes to `notifications` postgres_changes for unread
--   counts and notifications pages. If the table is not in
--   `supabase_realtime`, live updates silently fail.
--
-- Safe to re-run:
--   Uses membership check before ALTER PUBLICATION ADD TABLE.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications
  SET (replica_identity = full);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication p
    WHERE p.pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
      RAISE NOTICE '587_realtime_notifications: notifications added to supabase_realtime publication.';
    ELSE
      RAISE NOTICE '587_realtime_notifications: notifications already present in supabase_realtime publication.';
    END IF;
  ELSE
    RAISE NOTICE '587_realtime_notifications: publication supabase_realtime not found.';
  END IF;
END $$;
