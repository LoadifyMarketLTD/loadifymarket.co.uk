-- ================================================================
-- Migration 455: Fix gaps found by FULL_SCHEMA_AUDIT.sql
-- ================================================================
-- Addresses the 5 ❌ MISSING items from the live Supabase audit:
--
--   1. orders_status_check constraint — must include 'completed' and
--      'invoice_requested' (migrations 448 + 450 ran but the original
--      inline constraint was auto-named differently so the DROP in
--      those migrations silently did nothing via IF EXISTS).
--
--   2. idx_products_listing_context — index from migration 449
--
--   3. idx_orders_rfq — index from migration 452
--
--   4. idx_orders_is_b2b — index from migration 450
--
--   5. disputes_update RLS policy — defined in 90_launch_features.sql
--      but missing from the live DB.
--
-- All statements are fully idempotent.
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. orders.status CHECK constraint
--    Drop ANY existing status-related check on the orders table
--    (handles both the auto-named variant from the base schema and
--    the explicitly-named variant from migrations 448/450), then
--    add the final constraint with all current valid values.
-- ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop every CHECK constraint on orders that governs the status column.
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
    RAISE NOTICE '455: dropped constraint % from orders', r.conname;
  END LOOP;
END;
$$;

-- Add the definitive constraint (mig 448 + mig 450 values combined).
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
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


-- ────────────────────────────────────────────────────────────────
-- 2. Missing index: idx_products_listing_context (mig 449)
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_listing_context
  ON public.products ("listingContext");


-- ────────────────────────────────────────────────────────────────
-- 3. Missing index: idx_orders_rfq (mig 452)
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_rfq
  ON public.orders ("rfqId");


-- ────────────────────────────────────────────────────────────────
-- 4. Missing index: idx_orders_is_b2b (mig 450)
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_is_b2b
  ON public.orders ("isB2B")
  WHERE "isB2B" = TRUE;


-- ────────────────────────────────────────────────────────────────
-- 5. Missing RLS policy: disputes_update (mig 90_launch_features)
--    Buyers and sellers may update disputes they own, but cannot
--    self-resolve or self-close — only admins may set those states.
-- ────────────────────────────────────────────────────────────────

-- Ensure RLS is on (safe no-op if already enabled)
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_update" ON public.disputes;

CREATE POLICY "disputes_update" ON public.disputes
  FOR UPDATE
  -- Who may touch the row at all:
  USING (
    auth.uid() = "buyerId"
    OR auth.uid() = "sellerId"
    OR public.is_admin()
  )
  -- What the resulting row may look like:
  WITH CHECK (
    -- Admins can set any status
    public.is_admin()
    OR (
      -- Buyers and sellers may update their own dispute
      -- but cannot self-resolve or self-close
      (auth.uid() = "buyerId" OR auth.uid() = "sellerId")
      AND status NOT IN ('resolved', 'closed')
    )
  );


-- ────────────────────────────────────────────────────────────────
-- Completion notice
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE
    '455_fix_audit_gaps: applied — '
    'orders_status_check rebuilt (completed + invoice_requested), '
    'idx_products_listing_context created, '
    'idx_orders_rfq created, '
    'idx_orders_is_b2b created, '
    'disputes_update RLS policy created.';
END $$;
