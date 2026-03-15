-- ── Stripe Connect Express — schema additions ──────────────────────────────
-- Run this migration in the Supabase SQL Editor ONCE.
-- It adds the stripeConnectStatus column to seller_profiles so the platform
-- can track each seller's onboarding / payout state without querying Stripe
-- on every page load.
--
-- Values:
--   NULL         → seller has not started Stripe Connect onboarding
--   'pending'    → Express account created, onboarding not yet complete
--   'restricted' → details_submitted=true but payouts_enabled=false (needs action)
--   'active'     → charges_enabled=true AND payouts_enabled=true (fully live)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "stripeConnectStatus"
    TEXT
    CHECK ("stripeConnectStatus" IN ('pending', 'restricted', 'active'));

COMMENT ON COLUMN seller_profiles."stripeConnectStatus" IS
  'Mirrors the Stripe Express account state: pending | restricted | active. NULL = not connected.';
