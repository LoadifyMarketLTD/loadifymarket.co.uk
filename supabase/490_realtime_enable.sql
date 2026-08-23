-- ─────────────────────────────────────────────────────────────────────────────
-- 490_realtime_enable.sql
--
-- Adds the offers and orders tables to the supabase_realtime publication so
-- that the mobile chat page can subscribe to live status changes via
-- Supabase Realtime postgres_changes events.
--
-- Safe to run multiple times: publication membership is checked before each
-- ALTER PUBLICATION ADD TABLE statement.
-- ─────────────────────────────────────────────────────────────────────────────

-- Required for Realtime to include old/new values of all columns in UPDATE
-- events (not just the primary key). Without FULL replica identity, UPDATE
-- payloads only contain the primary key + changed columns.
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add to the Supabase managed Realtime publication only when not already a
-- member. PostgreSQL raises an error for duplicate publication membership, so
-- the explicit catalogue checks are required for historical replay safety.
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
        AND c.relname = 'offers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
      RAISE NOTICE '490_realtime_enable: offers added to supabase_realtime publication.';
    ELSE
      RAISE NOTICE '490_realtime_enable: offers already present in supabase_realtime publication.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
      RAISE NOTICE '490_realtime_enable: orders added to supabase_realtime publication.';
    ELSE
      RAISE NOTICE '490_realtime_enable: orders already present in supabase_realtime publication.';
    END IF;
  ELSE
    RAISE NOTICE '490_realtime_enable: publication supabase_realtime not found.';
  END IF;
END $$;
