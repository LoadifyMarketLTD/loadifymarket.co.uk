-- ================================================================
-- 448_service_lifecycle.sql
-- Loadify Market — Service Lifecycle & Escrow
-- ================================================================
-- Adds 'completed' to the orders.status vocabulary.
-- Adds serviceCompletedAt to record when a provider declares a job done.
--
-- Status semantic mapping (service context):
--   pending   → requested
--   paid      → accepted
--   packed    → ignored / skipped for services
--   shipped   → in_progress
--   delivered → awaiting_confirmation (provider declared done)
--   completed → ✅ FINAL (buyer confirmed OR auto-released after N days)
--
-- Safe to run multiple times (idempotent).
-- ================================================================

-- ── 1. Extend orders.status CHECK constraint ─────────────────────
-- Drop and re-add to include 'completed'.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'paid', 'packed', 'shipped',
    'delivered', 'completed', 'cancelled', 'refunded'
  ));

-- ── 2. Add serviceCompletedAt column ─────────────────────────────
-- Set by the provider when they mark a job as done (status → delivered).
-- Used by the escrow-release function to determine the auto-release window.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "serviceCompletedAt" TIMESTAMPTZ;

DO $$ BEGIN
  RAISE NOTICE '448_service_lifecycle: completed status added; serviceCompletedAt column added.';
END $$;
