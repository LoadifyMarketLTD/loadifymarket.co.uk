-- ─────────────────────────────────────────────────────────────────────────────
-- 510_realtime_messages.sql
--
-- Adds the messages table to the supabase_realtime publication so that chat
-- subscribers (BuyerMessages.tsx, MobileChatPage.tsx) receive live INSERT
-- events via Supabase Realtime postgres_changes without needing a page refresh.
--
-- Safe to run multiple times: publication membership is checked before
-- ALTER PUBLICATION ADD TABLE.
-- ─────────────────────────────────────────────────────────────────────────────

-- FULL replica identity ensures all column values are included in change
-- payloads, not just the primary key.
ALTER TABLE public.messages SET (replica_identity = full);

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
        AND c.relname = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
      RAISE NOTICE '510_realtime_messages: messages added to supabase_realtime publication.';
    ELSE
      RAISE NOTICE '510_realtime_messages: messages already present in supabase_realtime publication.';
    END IF;
  ELSE
    RAISE NOTICE '510_realtime_messages: publication supabase_realtime not found.';
  END IF;
END $$;
