-- ─────────────────────────────────────────────────────────────────────────────
-- 460_mobile_apk.sql
--
-- Schema additions required for the mobile APK (React Native / Expo) payment
-- flow, push notifications, and product reservation system.
--
-- Applied manually via Supabase SQL Editor; now versioned here for audit trail.
--
-- Contents:
--   1. products — listingContext, listingStatus, reservedUntil columns + indexes
--   2. payment_sessions — index on stripePaymentIntent for fast webhook lookup
--   3. push_tokens — new table for Expo push token management
--   4. release_expired_reservations() — RPC called by create-payment-intent.ts
--      and the scheduled escrow-release function for lazy cleanup
--   5. RLS policies for push_tokens
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. products: mobile listing fields ───────────────────────────────────────

-- listingContext: 'goods' (physical product with inventory) or 'service'
-- (service listing — no stock, no physical reservation needed).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "listingContext" TEXT NOT NULL DEFAULT 'goods'
    CHECK ("listingContext" IN ('goods', 'service'));

-- listingStatus: tracks the availability lifecycle of a listing.
--   active   — available for purchase
--   reserved — held by a buyer's PaymentIntent (max 15 min)
--   sold     — payment completed, permanently unavailable
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "listingStatus" TEXT NOT NULL DEFAULT 'active'
    CHECK ("listingStatus" IN ('active', 'reserved', 'sold'));

-- reservedUntil: absolute UTC timestamp when the reservation expires.
-- NULL when listingStatus is not 'reserved'.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "reservedUntil" TIMESTAMPTZ;

-- Back-fill: mark already-sold products so they don't appear as available.
-- Uses stockQuantity = 0 + stockStatus = 'out_of_stock' as a proxy for sold,
-- only for retail/handmade goods listings where stock was actively managed.
UPDATE products
SET    "listingStatus" = 'sold'
WHERE  "listingStatus" = 'active'
  AND  "listingContext" = 'goods'
  AND  "stockStatus"    = 'out_of_stock'
  AND  "stockQuantity"  = 0
  AND  type IN ('retail', 'handmade');

-- Index for fast webhook / admin queries filtering by listingStatus.
CREATE INDEX IF NOT EXISTS idx_products_listing_status
  ON products ("listingStatus");

-- Index for the scheduled release_expired_reservations() function.
CREATE INDEX IF NOT EXISTS idx_products_reserved_until
  ON products ("reservedUntil")
  WHERE "listingStatus" = 'reserved';

-- ── 2. payment_sessions: fast mobile webhook lookup ───────────────────────────

-- The mobile webhook (handleMobilePaymentIntentSucceeded) and
-- handlePaymentFailed look up sessions by stripePaymentIntent.
-- The column already exists; this adds the missing index.
CREATE INDEX IF NOT EXISTS idx_payment_sessions_payment_intent
  ON payment_sessions ("stripePaymentIntent");

-- ── 3. push_tokens — Expo push notification tokens ───────────────────────────

CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  platform   TEXT        NOT NULL DEFAULT 'android'
               CHECK (platform IN ('ios', 'android', 'web')),
  "isActive" BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One row per (user, device token) — upsert target for push-token function.
  CONSTRAINT push_tokens_user_token_unique UNIQUE ("userId", token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active
  ON push_tokens ("userId", "isActive")
  WHERE "isActive" = TRUE;

CREATE TRIGGER trg_push_tokens_updatedAt
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. release_expired_reservations() RPC ────────────────────────────────────

-- Releases product reservations whose reservedUntil timestamp has passed.
-- Called as a non-fatal RPC from create-payment-intent.ts (lazy cleanup)
-- before availability validation so expired reservations don't block new buyers.
--
-- Returns the number of reservations released.
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE products
  SET    "listingStatus" = 'active',
         "reservedUntil" = NULL
  WHERE  "listingStatus" = 'reserved'
    AND  "reservedUntil" IS NOT NULL
    AND  "reservedUntil" < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

-- Only the service role (used by Netlify functions) may call this RPC.
-- Authenticated users and anon cannot release reservations directly.
REVOKE ALL ON FUNCTION release_expired_reservations() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION release_expired_reservations() TO service_role;

-- ── 5. RLS for push_tokens ───────────────────────────────────────────────────

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens (e.g. to check registration status in-app).
CREATE POLICY "push_tokens_owner_select"
  ON push_tokens FOR SELECT
  USING (auth.uid() = "userId");

-- Users cannot write directly; all writes go through the push-token Netlify
-- function which uses the service role key.
-- Admins/service role bypass RLS entirely (Supabase default behaviour).

COMMENT ON TABLE push_tokens IS
  'Expo push notification tokens registered by mobile app users via the '
  'push-token Netlify function. One row per (userId, device token). '
  'isActive=false means the token has been unregistered but is kept for audit.';

COMMENT ON COLUMN push_tokens.token IS
  'Expo push token in ExponentPushToken[xxx] format.';

COMMENT ON COLUMN products."listingContext" IS
  'goods = physical product with inventory management; '
  'service = service listing, no stock or reservation logic applies.';

COMMENT ON COLUMN products."listingStatus" IS
  'active = available; reserved = held by a buyer PaymentIntent (≤15 min); '
  'sold = payment completed, permanently unavailable.';

COMMENT ON COLUMN products."reservedUntil" IS
  'UTC timestamp when the active reservation expires. NULL unless listingStatus=reserved.';
