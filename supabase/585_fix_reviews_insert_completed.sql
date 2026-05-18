-- ─────────────────────────────────────────────────────────────────────────────
-- 585_fix_reviews_insert_completed.sql
--
-- Fix reviews_insert RLS to include 'completed' order status.
--
-- Root cause:
--   Migration 90_launch_features.sql tightened reviews_insert to require a
--   verified purchase with order status = 'delivered'.  However the
--   confirm-delivery Netlify function transitions the order to 'completed'
--   (not 'delivered') when the buyer confirms receipt.  This means that any
--   buyer who confirms delivery can no longer leave a review — the INSERT
--   is silently rejected by RLS.
--
-- Fix:
--   Extend the status check from status = 'delivered'
--   to    status IN ('delivered', 'completed').
--
-- Security properties preserved:
--   • reviewer must be the order buyer (o."buyerId" = auth.uid())
--   • reviewer's userId column must match auth.uid()
--   • order must contain the exact product being reviewed
--   • review row must reference the real orderId
--   • one review per (orderId, userId) — enforced by UNIQUE constraint on table
--   • fake/unverified reviews remain impossible
--
-- Idempotent (DROP IF EXISTS + CREATE).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "reviews_insert" ON reviews;

CREATE POLICY "reviews_insert" ON reviews FOR INSERT
  WITH CHECK (
    -- review must be attributed to the requesting user
    auth.uid() = "userId"
    AND
    -- the order must exist, belong to this buyer, be in a terminal
    -- fulfilled state, and contain the exact product being reviewed
    EXISTS (
      SELECT 1
      FROM   orders o
      JOIN   order_items oi ON oi."orderId" = o.id
      WHERE  o.id           = reviews."orderId"
        AND  o."buyerId"    = auth.uid()
        AND  o.status       IN ('delivered', 'completed')
        AND  oi."productId" = reviews."productId"
    )
  );

DO $$ BEGIN
  RAISE NOTICE '585_fix_reviews_insert_completed: reviews_insert now allows status IN (''delivered'',''completed'').';
END $$;
