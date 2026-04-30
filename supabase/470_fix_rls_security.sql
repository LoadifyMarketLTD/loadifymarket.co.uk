-- ─────────────────────────────────────────────────────────────────────────────
-- 470_fix_rls_security.sql
--
-- Closes two RLS security gaps identified in the Phase 2 audit:
--
-- 1. conversations_insert
--    The policy already required auth.uid() to be one of the two participants.
--    This migration re-creates it with an explicit comment so the intent is
--    clear and auditable.  No functional change.
--
-- 2. messages_insert  ← REAL FIX
--    The old policy only checked `auth.uid() = "senderId"`.  This was not
--    sufficient: a user who somehow knows a conversation UUID can insert a
--    message into a conversation they are NOT a participant of.
--
--    The new policy adds an EXISTS subquery that verifies the conversation
--    exists AND that auth.uid() is either user1Id or user2Id of that
--    conversation.
--
-- Both changes are idempotent: the old policies are dropped before the new
-- ones are created.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. conversations_insert ───────────────────────────────────────────────────
-- Drop the existing policy so we can recreate it with a canonical name/comment.
DROP POLICY IF EXISTS "conversations_insert" ON conversations;

-- A user may only create a conversation in which they are a participant.
-- This prevents inserting rows where both user1Id and user2Id belong to other
-- users (i.e. creating a conversation between two strangers).
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = "user1Id"
    OR auth.uid() = "user2Id"
  );

-- ── 2. messages_insert ────────────────────────────────────────────────────────
-- Drop the old policy that only checked senderId ownership.
DROP POLICY IF EXISTS "messages_insert" ON messages;

-- A user may insert a message only when BOTH:
--   a) they are the sender (prevents spoofing senderId)
--   b) they are a participant in the target conversation
--      (prevents writing into conversations they are not part of)
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = "senderId"
    AND EXISTS (
      SELECT 1
      FROM   conversations c
      WHERE  c.id = "conversationId"
        AND  (c."user1Id" = auth.uid() OR c."user2Id" = auth.uid())
    )
  );
