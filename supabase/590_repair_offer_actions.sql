-- =============================================================================
-- Migration 590: Repair Offer Actions (idempotent production repair)
-- =============================================================================
--
-- Context (live debug 2026-05-18):
--   offer-accept  → 500 {"error":"Failed to accept offer"}
--   offer-counter → 500
--   offer-decline → 500 {"error":"Failed to decline offer"}
--
-- Root causes identified by static analysis:
--
--   1. Migration 582 (offer_counter_support) may not be applied in production.
--      The offers status CHECK constraint from migration 480 only allows:
--        pending, accepted, declined, expired, cancelled
--      But offer-decline.ts writes status='rejected' and
--      offer-counter.ts writes status='countered' — both absent from 480.
--      DB raises a CHECK constraint violation (SQLSTATE 23514) which
--      surfaces as 500 "Failed to decline offer" / "Failed to update original offer".
--
--   2. accept_offer() RPC may not exist or may be at the older 480 revision
--      (missing buyer-id resolution logic from 582), causing RPC errors.
--
--   3. release_stale_unpaid_listing_locks() RPC (migration 583) may be absent.
--      offer-accept.ts calls it non-fatally, but its absence proves partial apply.
--
--   4. offer_counter_rate_limits table is referenced by offer-counter.ts but
--      was never added to migration 500.  rateLimiter fails open, so no direct
--      500, but creates an inconsistent production schema.
--
-- All statements are idempotent (CREATE OR REPLACE / IF NOT EXISTS / DO-block).
-- Safe to re-run against any production database state.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Fix offers status CHECK constraint
--    Drop every CHECK constraint that references the status column on offers
--    and re-add the definitive set that includes all values ever needed.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM   pg_constraint c
    JOIN   pg_class      t ON t.oid = c.conrelid
    JOIN   pg_namespace  n ON n.oid = t.relnamespace
    WHERE  n.nspname = 'public'
      AND  t.relname = 'offers'
      AND  c.contype = 'c'
      AND  pg_get_constraintdef(c.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE '590: dropped offers status constraint: %', r.conname;
  END LOOP;
END;
$$;

ALTER TABLE offers
  ADD CONSTRAINT offers_status_check
  CHECK (status IN (
    'pending',
    'countered',
    'accepted',
    'declined',
    'rejected',
    'expired',
    'cancelled'
  ));


-- ---------------------------------------------------------------------------
-- 2. Re-apply accept_offer() RPC — latest version (from migration 582)
--    Fully idempotent via CREATE OR REPLACE.
--    Correctly resolves buyer identity for seller-originated counter offers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_offer(
  p_offer_id UUID,
  p_actor_id UUID   -- must equal offer."recipientId" (the seller/acceptor)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer          offers%ROWTYPE;
  v_listing        products%ROWTYPE;
  v_order_id       UUID;
  v_reserved_until TIMESTAMPTZ;
  v_system_msg     TEXT;
  v_amount_pounds  NUMERIC;
  v_buyer_id       UUID;
BEGIN
  -- 1. Lock and fetch the offer row.
  SELECT * INTO v_offer
  FROM   offers
  WHERE  id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  -- 2. Idempotency: if already accepted, return the existing order ID.
  IF v_offer.status = 'accepted' THEN
    SELECT id INTO v_order_id
    FROM   orders
    WHERE  "offerId" = p_offer_id
    LIMIT  1;
    RETURN jsonb_build_object('order_id', v_order_id, 'already_done', TRUE);
  END IF;

  -- 3. Validate: only the intended recipient may accept.
  IF v_offer."recipientId" <> p_actor_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- 4. Validate: offer must be pending.
  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer_not_pending: %', v_offer.status;
  END IF;

  -- 5. Lock the listing.
  SELECT * INTO v_listing
  FROM   products
  WHERE  id = v_offer."listingId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  -- 6. Listing must be active.
  IF v_listing."listingStatus" <> 'active' THEN
    RAISE EXCEPTION 'listing_not_available: %', v_listing."listingStatus";
  END IF;

  -- 7. Mark offer as accepted.
  UPDATE offers
  SET    status = 'accepted'
  WHERE  id = p_offer_id;

  v_amount_pounds := v_offer."amountPence"::NUMERIC / 100;

  -- 8. Resolve the true buyer: whichever participant is NOT the listing seller.
  --    Handles both buyer-initiated and seller-counter-offer scenarios.
  IF v_offer."proposedById" = v_listing."sellerId" THEN
    v_buyer_id := v_offer."recipientId";
  ELSE
    v_buyer_id := v_offer."proposedById";
  END IF;

  IF v_buyer_id = v_listing."sellerId" THEN
    RAISE EXCEPTION 'invalid_offer_participants';
  END IF;

  -- 9. Create the order in awaiting_payment state.
  INSERT INTO orders (
    "buyerId", "sellerId", "productId",
    quantity,
    subtotal, "vatAmount", "shippingAmount", total,
    status, "escrowStatus",
    "shippingAddress", "billingAddress",
    "offerId"
  ) VALUES (
    v_buyer_id,
    v_listing."sellerId",
    v_offer."listingId",
    1,
    v_amount_pounds,
    0.00,
    0.00,
    v_amount_pounds,
    'awaiting_payment',
    'held',
    '{}',
    '{}',
    p_offer_id
  )
  RETURNING id INTO v_order_id;

  -- 10. Reserve the listing (15-minute window for buyer to complete payment).
  v_reserved_until := NOW() + INTERVAL '15 minutes';

  UPDATE products
  SET    "listingStatus" = 'reserved',
         "reservedUntil" = v_reserved_until
  WHERE  id = v_offer."listingId";

  -- 11. Insert a system message so the chat thread shows an "offer accepted" card.
  v_system_msg := json_build_object(
    '_t',          'system',
    'event',       'offer_accepted',
    'orderId',     v_order_id,
    'amountPence', v_offer."amountPence"
  )::TEXT;

  INSERT INTO messages (
    "conversationId", "senderId", "receiverId", message
  ) VALUES (
    v_offer."conversationId",
    p_actor_id,
    CASE
      WHEN p_actor_id = v_offer."recipientId" THEN v_offer."proposedById"
      ELSE v_offer."recipientId"
    END,
    v_system_msg
  );

  -- 12. Audit log.
  INSERT INTO order_events ("orderId", "actorId", event, metadata)
  VALUES (
    v_order_id,
    p_actor_id,
    'offer_accepted',
    jsonb_build_object(
      'offerId',     p_offer_id,
      'amountPence', v_offer."amountPence"
    )
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'already_done', FALSE);
END;
$$;

-- Grant only to service_role; Netlify functions authenticate with service-role key.
REVOKE ALL ON FUNCTION accept_offer(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION accept_offer(UUID, UUID) TO service_role;


-- ---------------------------------------------------------------------------
-- 3. Re-apply release_stale_unpaid_listing_locks() — from migration 583.
--    Idempotent via CREATE OR REPLACE.
--    Called non-fatally by offer-accept.ts before every accept attempt.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_stale_unpaid_listing_locks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancelled_count INTEGER := 0;
BEGIN
  WITH stale_orders AS (
    SELECT o.id, o."productId", o."createdAt"
    FROM   orders o
    LEFT JOIN products p ON p.id = o."productId"
    WHERE  o.status = 'awaiting_payment'
      AND  COALESCE(o."stripePaymentIntentId", '') = ''
      AND  o."createdAt" < NOW() - INTERVAL '15 minutes'
      AND  (
             p."reservedUntil" IS NULL
             OR p."reservedUntil" < NOW()
           )
  ),
  cancelled_orders AS (
    UPDATE orders o
    SET    status = 'cancelled'
    FROM   stale_orders s
    WHERE  o.id = s.id
    RETURNING o.id, o."productId", s."createdAt"
  ),
  audit_events AS (
    INSERT INTO order_events ("orderId", "actorId", event, metadata)
    SELECT c.id,
           NULL,
           'stale_unpaid_lock_released',
           jsonb_build_object(
             'reason', 'awaiting_payment_expired',
             'orderCreatedAt', c."createdAt",
             'releasedAt', NOW()
           )
    FROM   cancelled_orders c
  ),
  released_products AS (
    UPDATE products p
    SET    "listingStatus" = 'active',
           "reservedUntil" = NULL
    WHERE  p.id IN (SELECT DISTINCT "productId" FROM cancelled_orders)
      AND  NOT EXISTS (
             SELECT 1
             FROM   orders o
             WHERE  o."productId" = p.id
               AND  o.status IN ('awaiting_payment', 'paid', 'packed', 'shipped', 'delivered', 'completed')
           )
    RETURNING p.id
  )
  SELECT COUNT(*) INTO cancelled_count
  FROM cancelled_orders;

  RETURN cancelled_count;
END;
$$;

REVOKE ALL ON FUNCTION release_stale_unpaid_listing_locks() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION release_stale_unpaid_listing_locks() TO service_role;


-- ---------------------------------------------------------------------------
-- 4. Add offer_counter_rate_limits table — referenced by offer-counter.ts
--    but never included in migration 500.
--    rateLimiter fails open on a missing table, but the table should exist.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_counter_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

ALTER TABLE offer_counter_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS offer_counter_rl_lookup
  ON offer_counter_rate_limits (identifier, "windowEnd");


-- ---------------------------------------------------------------------------
-- 5. Verification queries (run after applying in Supabase SQL editor)
-- ---------------------------------------------------------------------------
--
-- A) Confirm status constraint includes rejected and countered:
--
--   SELECT pg_get_constraintdef(c.oid)
--   FROM   pg_constraint c
--   JOIN   pg_class t ON t.oid = c.conrelid
--   WHERE  t.relname = 'offers' AND c.contype = 'c'
--     AND  pg_get_constraintdef(c.oid) LIKE '%status%';
--   -- Expected: includes 'rejected' AND 'countered'
--
-- B) Confirm accept_offer RPC exists with SECURITY DEFINER:
--
--   SELECT proname, prosecdef
--   FROM   pg_proc
--   WHERE  proname = 'accept_offer';
--   -- Expected: proname='accept_offer', prosecdef=true
--
-- C) Test accept_offer manually (use a real pending offerId from production):
--
--   SELECT accept_offer('<offer-uuid>'::uuid, '<actor-uuid>'::uuid);
--
-- D) Confirm offer_counter_rate_limits table exists:
--
--   SELECT COUNT(*) FROM offer_counter_rate_limits;
--   -- Expected: 0 (or more if already has rows)
--
-- E) Confirm release_stale_unpaid_listing_locks exists:
--
--   SELECT release_stale_unpaid_listing_locks();
--   -- Expected: integer (number of stale orders released, typically 0)
--
-- ---------------------------------------------------------------------------
