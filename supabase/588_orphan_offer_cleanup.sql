-- =============================================================================
-- Migration 588: Orphan Pending Offer Cleanup
-- =============================================================================
-- Context:
--   A race condition or Netlify function timeout between the offer INSERT and
--   the subsequent messages INSERT can leave a "pending" offer row with no
--   corresponding chat message and no seller notification. The buyer cannot
--   retry because the 409 guard blocks a second offer in the same conversation.
--
-- This migration provides:
--   1. A diagnostic VIEW to identify orphan pending offers.
--   2. A FUNCTION to safely expire a single orphan offer (sets status →
--      'expired'; does NOT delete, preserving the audit trail).
--   3. A one-shot cleanup statement (commented out, for reviewed execution only).
--   4. Guidance on verifying production data before any cleanup.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Diagnostic VIEW: orphan_pending_offers
--    Shows every "pending" offer that has no matching chat message containing
--    its offer ID in the message body.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW orphan_pending_offers AS
SELECT
  o.id                    AS "offerId",
  o."conversationId",
  o."listingId",
  o."proposedById"        AS "buyerId",
  o."recipientId"         AS "sellerId",
  o."amountPence",
  o."createdAt",
  o."expiresAt",
  -- True when a matching notification also does not exist.
  NOT EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n."userId" = o."recipientId"
      AND n.type = 'offer_received'
      AND n.link LIKE '%' || o.id::text || '%'
  ) AS "missingNotification"
FROM offers o
WHERE o.status = 'pending'
  AND NOT EXISTS (
    SELECT 1
    FROM messages m
    WHERE m."conversationId" = o."conversationId"
      AND m.message LIKE '%' || o.id::text || '%'
  );

COMMENT ON VIEW orphan_pending_offers IS
  'Pending offers that have no matching offer-display message in the chat '
  'thread. These are orphans caused by a partial failure in conversation-offer '
  'and block the buyer from sending a new offer. Safe to expire individually '
  'using expire_orphan_offer(offer_id).';


-- ---------------------------------------------------------------------------
-- 2. Function: expire_orphan_offer(p_offer_id UUID)
--    Sets the offer status to ''expired'' so the conversation is unblocked.
--    Only operates on offers that are:
--      • actually pending
--      • confirmed orphans (no matching message)
--    Returns a status message so callers can confirm success.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_orphan_offer(p_offer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer offers%ROWTYPE;
  v_message_count INT;
BEGIN
  -- Lock the offer row for update to prevent races.
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'ERROR: offer not found: ' || p_offer_id::text;
  END IF;

  IF v_offer.status <> 'pending' THEN
    RETURN 'SKIPPED: offer status is ' || v_offer.status || ', not pending';
  END IF;

  -- Confirm it is really an orphan before touching it.
  SELECT COUNT(*) INTO v_message_count
  FROM messages
  WHERE "conversationId" = v_offer."conversationId"
    AND message LIKE '%' || p_offer_id::text || '%';

  IF v_message_count > 0 THEN
    RETURN 'SKIPPED: offer has ' || v_message_count || ' matching message(s) – not an orphan';
  END IF;

  UPDATE offers
  SET status = 'expired',
      "updatedAt" = NOW()
  WHERE id = p_offer_id;

  RETURN 'EXPIRED: orphan offer ' || p_offer_id::text || ' has been set to expired';
END;
$$;

COMMENT ON FUNCTION expire_orphan_offer(UUID) IS
  'Safely expires a single orphan pending offer (one with no matching chat '
  'message). Only acts on pending offers that are confirmed orphans. '
  'Does not delete – the row is preserved for audit purposes.';


-- ---------------------------------------------------------------------------
-- 3. Diagnostic queries (run these BEFORE any cleanup)
-- ---------------------------------------------------------------------------
--
-- A) List all current orphan pending offers:
--
--   SELECT * FROM orphan_pending_offers ORDER BY "createdAt" DESC;
--
-- B) Verify a specific offer is an orphan before expiring:
--
--   SELECT expire_orphan_offer('<offer-uuid-here>');
--
-- C) Bulk expire all current orphans (REVIEW the list from A first):
--
--   SELECT "offerId", expire_orphan_offer("offerId")
--   FROM orphan_pending_offers;
--
-- D) Verify no orphans remain after cleanup:
--
--   SELECT COUNT(*) FROM orphan_pending_offers;
--   -- Expected: 0
--
-- E) Confirm affected conversations are now unblocked:
--
--   SELECT o.id, o."conversationId", o.status
--   FROM offers o
--   WHERE o.id IN (<list of expired offerId values>);
--
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 4. Production verification SQL (queries, not mutations)
-- ---------------------------------------------------------------------------
--
-- Verify the full data chain for a specific conversation:
--
--   -- a) Offers for conversation
--   SELECT id, "conversationId", "listingId", "proposedById", "recipientId",
--          status, "createdAt", "expiresAt"
--   FROM offers
--   WHERE "conversationId" = '<conversation-uuid>';
--
--   -- b) Messages containing an offer reference
--   SELECT id, "senderId", "receiverId", message, "createdAt"
--   FROM messages
--   WHERE "conversationId" = '<conversation-uuid>'
--     AND message LIKE '%_t":"offer%';
--
--   -- c) Seller notifications for offer_received
--   SELECT id, "userId", type, title, message, link, "createdAt"
--   FROM notifications
--   WHERE "userId" = '<seller-user-id>'
--     AND type = 'offer_received'
--   ORDER BY "createdAt" DESC
--   LIMIT 10;
--
-- ---------------------------------------------------------------------------
