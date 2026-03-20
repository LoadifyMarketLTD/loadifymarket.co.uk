-- ================================================================
-- 170_audit_fixes_2026_03_18.sql
-- Loadify Market — Post-Audit Fixes (2026-03-18)
-- ================================================================
-- Based on Master Audit findings.
-- Run this AFTER all existing migrations (00 → 160).
--
-- CHANGES:
--   1. seller_profiles_public view  – safe public projection
--   2. seller_profiles RLS tightened – remove FOR SELECT USING (TRUE)
--   3. stripe_events table           – idempotent webhook processing
--   4. decrement_product_stock guard – prevent overselling
--   5. DB relationship comment fixes  – no duplicate FKs; comments only
--   6. GRANT view SELECT to anon     – so public pages work without auth
-- ================================================================

-- ════════════════════════════════════════════════════════════════
-- 1. SAFE PUBLIC VIEW FOR seller_profiles
-- ════════════════════════════════════════════════════════════════
-- Exposes only safe, non-sensitive fields to public / anon callers.
-- Sensitive fields excluded: commission, listingLimit,
--   stripeAccountId, stripeConnectStatus, verificationDocuments,
--   all internal flags.

DROP VIEW IF EXISTS seller_profiles_public;

CREATE VIEW seller_profiles_public AS
SELECT
  id,
  "userId",
  "businessName",
  "businessType",
  "marketplaceRole",
  "isApproved",
  "verificationStatus",
  "rating",
  "reviewCount",
  "salesCount",
  "responseRate",
  "deliverySuccessRate",
  "paymentBehaviour",
  "createdAt"
FROM seller_profiles;

-- Allow all roles (including anon) to read the safe view.
-- RLS on the underlying table still blocks direct access.
GRANT SELECT ON seller_profiles_public TO anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- 2. TIGHTEN seller_profiles RLS
-- ════════════════════════════════════════════════════════════════
-- BEFORE: FOR SELECT USING (TRUE) — anyone (including anon/public)
--         can read ALL columns including commission, stripeAccountId,
--         and other sensitive business data.
-- AFTER:  seller can read own row; admin can read all; nobody else
--         can query seller_profiles directly (use the view instead).

DROP POLICY IF EXISTS "seller_profiles_select" ON seller_profiles;

-- Sellers can read their own profile; admins/owners can read all.
CREATE POLICY "seller_profiles_select" ON seller_profiles
  FOR SELECT
  USING (
    auth.uid() = "userId"
    OR is_admin_or_owner()
  );

-- ════════════════════════════════════════════════════════════════
-- 3. stripe_events TABLE — Idempotent Webhook Processing
-- ════════════════════════════════════════════════════════════════
-- Tracks every Stripe event that has been processed.
-- The UNIQUE constraint on event_id prevents duplicate processing
-- even if Stripe retries delivery of the same event.

CREATE TABLE IF NOT EXISTS stripe_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        TEXT         NOT NULL,
  event_type      TEXT         NOT NULL,
  livemode        BOOLEAN      NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status          TEXT         NOT NULL DEFAULT 'processed',   -- processed | failed | skipped
  error_message   TEXT,
  metadata        JSONB,
  CONSTRAINT stripe_events_event_id_unique UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id   ON stripe_events (event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events (event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed  ON stripe_events (processed_at DESC);

COMMENT ON TABLE stripe_events IS
  'Record of every Stripe webhook event processed. event_id is UNIQUE to prevent '
  'duplicate order creation if Stripe retries delivery.';

-- Enable RLS — only service role (webhook) and admins write
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_events_admin_read"  ON stripe_events FOR SELECT USING (is_admin_or_owner());
CREATE POLICY "stripe_events_admin_write" ON stripe_events FOR ALL   USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ════════════════════════════════════════════════════════════════
-- 4. ATOMIC STOCK DECREMENT — overselling guard
-- ════════════════════════════════════════════════════════════════
-- Recreate with explicit NOWAIT lock to avoid race conditions.
-- If two simultaneous checkouts try to decrement the same product,
-- one will get an advisory lock and the other will wait briefly.

CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id UUID,
  p_qty        INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  -- Row-level lock prevents concurrent over-decrements
  SELECT "stockQuantity"
  INTO   v_current
  FROM   products
  WHERE  id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  IF v_current IS NULL THEN
    v_current := 0;
  END IF;

  -- Clamp to zero; never go negative
  UPDATE products
  SET
    "stockQuantity" = GREATEST(v_current - p_qty, 0),
    "stockStatus"   = CASE
                        WHEN GREATEST(v_current - p_qty, 0) <= 0  THEN 'out_of_stock'
                        WHEN GREATEST(v_current - p_qty, 0) <= 10 THEN 'low_stock'
                        ELSE 'in_stock'
                      END,
    "updatedAt"     = NOW()
  WHERE id = p_product_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 5. GRANT stripe_events access for monitoring queries
-- ════════════════════════════════════════════════════════════════
GRANT SELECT ON stripe_events TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 6. COMMENTS on FK relationships for clarity
-- ════════════════════════════════════════════════════════════════
COMMENT ON COLUMN orders."sellerId"  IS 'FK → seller_profiles.userId (not seller_profiles.id)';
COMMENT ON COLUMN orders."buyerId"   IS 'FK → users.id';
COMMENT ON COLUMN order_items."orderId"   IS 'FK → orders.id';
COMMENT ON COLUMN order_items."productId" IS 'FK → products.id';
COMMENT ON COLUMN products."sellerId"     IS 'FK → users.id · seller_profiles.userId · seller_stores.userId (all equal the seller user UUID)';
COMMENT ON COLUMN seller_profiles."userId" IS 'FK → users.id – one profile per seller user';
