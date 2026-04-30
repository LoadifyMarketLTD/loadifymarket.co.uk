-- ─────────────────────────────────────────────────────────────────────────────
-- 480_offers_engine.sql
--
-- Real offers state machine replacing the previous JSON-message approach.
-- Implements the full blueprint offer → accept → order → checkout → paid flow.
--
-- Contents:
--   1. offers table + indexes + RLS
--   2. order_events audit table
--   3. Extend orders: add awaiting_payment status, offerId FK,
--      stripePaymentIntentId, one-active-order-per-listing unique index
--   4. accept_offer() PL/pgSQL RPC — atomic orchestrator called by
--      the offer-accept Netlify function
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. offers table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offers (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversationId" UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  "listingId"      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "proposedById"   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "recipientId"    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "amountPence"    INTEGER     NOT NULL CHECK ("amountPence" > 0),
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  "parentOfferId"  UUID        REFERENCES offers(id) ON DELETE SET NULL,
  "expiresAt"      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active (pending) offer per conversation at a time.
-- Prevents buyer and seller from both having open offers simultaneously.
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_offer_per_conversation
  ON offers ("conversationId")
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_offers_conversation ON offers ("conversationId");
CREATE INDEX IF NOT EXISTS idx_offers_listing      ON offers ("listingId");
CREATE INDEX IF NOT EXISTS idx_offers_proposed_by  ON offers ("proposedById");
CREATE INDEX IF NOT EXISTS idx_offers_recipient    ON offers ("recipientId");
CREATE INDEX IF NOT EXISTS idx_offers_status       ON offers (status);

CREATE TRIGGER trg_offers_updatedAt
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. order_events audit table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId"   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "actorId"   UUID        REFERENCES users(id) ON DELETE SET NULL,
  event       TEXT        NOT NULL,
  metadata    JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order   ON order_events ("orderId");
CREATE INDEX IF NOT EXISTS idx_order_events_created ON order_events ("createdAt" DESC);

-- ── 3. Extend orders table ────────────────────────────────────────────────────

-- Add awaiting_payment to the status check constraint while keeping every
-- value that already exists in the database.
--
-- History of status values across all migrations:
--   base schema (00_consolidated_schema.sql):
--     pending, paid, packed, shipped, delivered, cancelled, refunded
--   migration 448 (not in repo, but reflected in 455):
--     + completed
--   migration 450 (450_b2b_buyer_profiles.sql):
--     + invoice_requested
--   migration 455 (455_fix_audit_gaps.sql):
--     definitive set: pending, paid, packed, shipped, delivered,
--                     completed, cancelled, refunded, invoice_requested
--   THIS migration (480):
--     + awaiting_payment
--
-- We use the same robust DO-block pattern from migration 455 to drop every
-- CHECK constraint that references the status column (handles any name) then
-- add the definitive constraint that includes all current valid values.
-- This means the migration is safe on any DB that ran or skipped 455.
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
      AND  t.relname = 'orders'
      AND  c.contype = 'c'
      AND  pg_get_constraintdef(c.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE '480: dropped constraint % from orders', r.conname;
  END LOOP;
END;
$$;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'awaiting_payment',
    'pending',
    'paid',
    'packed',
    'shipped',
    'delivered',
    'completed',
    'cancelled',
    'refunded',
    'invoice_requested'
  ));

-- Link offer → order so we can look up an order from an offer.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "offerId" UUID REFERENCES offers(id) ON DELETE SET NULL;

-- Stripe PaymentIntent ID for direct lookup from the webhook without going
-- through payment_sessions.  NULL until the buyer initiates checkout.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

-- Prevent two active orders for the same listing (race-condition guard).
-- Covers states where money has changed hands or is about to.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_order_per_listing
  ON orders ("productId")
  WHERE status IN ('awaiting_payment','paid','packed','shipped','delivered');

CREATE INDEX IF NOT EXISTS idx_orders_offer      ON orders ("offerId");
CREATE INDEX IF NOT EXISTS idx_orders_pi         ON orders ("stripePaymentIntentId");

-- ── 4. RLS for offers ─────────────────────────────────────────────────────────

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Conversation participants can read all offers in their conversations.
CREATE POLICY "offers_select_participant" ON offers FOR SELECT
  USING (
    auth.uid() = "proposedById"
    OR auth.uid() = "recipientId"
  );

-- Buyers can insert offers (proposedById must be themselves).
CREATE POLICY "offers_insert_buyer" ON offers FOR INSERT
  WITH CHECK (auth.uid() = "proposedById");

-- No direct client UPDATEs — all state changes go through the
-- conversation-offer / offer-accept / offer-decline Netlify functions
-- which use the service-role key and bypass RLS.

-- ── 5. RLS for order_events ───────────────────────────────────────────────────

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- Buyer and seller can read events for their own orders.
CREATE POLICY "order_events_select_participant" ON order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = "orderId"
        AND (o."buyerId" = auth.uid() OR o."sellerId" = auth.uid())
    )
  );

-- All writes go via service-role (Netlify functions / webhook) — no direct
-- client inserts allowed.

-- ── 6. accept_offer() RPC — atomic orchestrator ───────────────────────────────
--
-- Called by the offer-accept Netlify function.  Runs entirely inside a single
-- transaction so partial failures are impossible.
--
-- Steps:
--   1. Lock + fetch offer (SELECT FOR UPDATE)
--   2. Idempotency: if already accepted, return existing orderId
--   3. Verify p_actor_id is the recipient (seller)
--   4. Verify offer is pending
--   5. Lock + fetch listing (SELECT FOR UPDATE)
--   6. Verify listing is active
--   7. Update offer → accepted
--   8. Insert order (awaiting_payment)
--   9. Update listing → reserved (reservedUntil = +15 min)
--  10. Insert system message into conversation
--  11. Insert order_event audit row
--
-- Returns: { "order_id": UUID, "already_done": boolean }
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION accept_offer(
  p_offer_id UUID,
  p_actor_id UUID   -- must equal offer."recipientId" (the seller)
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
BEGIN
  -- 1. Lock and fetch the offer row so no concurrent accept can race us.
  SELECT * INTO v_offer
  FROM   offers
  WHERE  id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  -- 2. Idempotency: if already accepted return the existing order ID.
  IF v_offer.status = 'accepted' THEN
    SELECT id INTO v_order_id
    FROM   orders
    WHERE  "offerId" = p_offer_id
    LIMIT  1;
    RETURN jsonb_build_object('order_id', v_order_id, 'already_done', TRUE);
  END IF;

  -- 3. Validate: only the intended recipient (seller) may accept.
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

  -- 6. Listing must be active (not already sold or reserved).
  IF v_listing."listingStatus" <> 'active' THEN
    RAISE EXCEPTION 'listing_not_available: %', v_listing."listingStatus";
  END IF;

  -- 7. Mark offer as accepted.
  UPDATE offers
  SET    status = 'accepted'
  WHERE  id = p_offer_id;

  -- 8. Create the order in awaiting_payment state.
  --    Amount is the agreed offer price (pence → pounds).
  v_amount_pounds := v_offer."amountPence"::NUMERIC / 100;

  INSERT INTO orders (
    "buyerId", "sellerId", "productId",
    quantity,
    subtotal, "vatAmount", "shippingAmount", total,
    status, "escrowStatus",
    "shippingAddress", "billingAddress",
    "offerId"
  ) VALUES (
    v_offer."proposedById",
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

  -- 9. Reserve the listing (15-minute window for buyer to complete payment).
  v_reserved_until := NOW() + INTERVAL '15 minutes';

  UPDATE products
  SET    "listingStatus" = 'reserved',
         "reservedUntil" = v_reserved_until
  WHERE  id = v_offer."listingId";

  -- 10. Insert a system message so the chat thread shows an "offer accepted"
  --     card.  The seller (recipientId) is the sender here because they are
  --     the one triggering the acceptance.
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
    v_offer."recipientId",   -- seller sends the acceptance notification
    v_offer."proposedById",  -- buyer receives it
    v_system_msg
  );

  -- 11. Audit log.
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

COMMENT ON FUNCTION accept_offer(UUID, UUID) IS
  'Atomically accepts an offer: locks offer + listing, transitions states, '
  'creates an awaiting_payment order, reserves the listing, inserts a system '
  'message and an audit event.  Called exclusively by the offer-accept Netlify function.';

COMMENT ON TABLE offers IS
  'First-class offer records replacing the previous JSON-message approach. '
  'One pending offer per conversation (enforced by partial unique index). '
  'All state changes are made by Netlify service-role functions.';

COMMENT ON TABLE order_events IS
  'Immutable audit log of order lifecycle events (offer_accepted, paid, '
  'shipped, etc.).  Written by Netlify functions and the Stripe webhook.';
