-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 443: Add stripeConnectAccountId column to seller_profiles
--
-- Migration 95 (95_stripe_connect.sql) added stripeConnectStatus but omitted
-- the stripeConnectAccountId column that stores the Stripe Connect Express
-- account ID (format: acct_xxxxx).
--
-- The existing stripeAccountId column has been used by connect-onboard.ts and
-- stripe-webhook.ts to store the Connect account ID.  The new
-- stripeConnectAccountId column provides a semantically explicit home for this
-- value; stripeAccountId is retained for backwards compatibility.
--
-- A one-time backfill copies values from stripeAccountId where they look like
-- Stripe Connect IDs (start with 'acct_') and stripeConnectAccountId is not
-- yet populated.
--
-- Safe: idempotent — ADD COLUMN IF NOT EXISTS, UPDATE only when target is NULL.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT;

COMMENT ON COLUMN public.seller_profiles."stripeConnectAccountId" IS
  'Stripe Connect Express account ID (acct_xxxxx). Populated during onboarding via connect-onboard.ts.';

-- Backfill from stripeAccountId where it carries a Connect account ID
-- (Stripe Connect IDs always start with ''acct_'').
UPDATE public.seller_profiles
SET    "stripeConnectAccountId" = "stripeAccountId"
WHERE  "stripeAccountId"         IS NOT NULL
  AND  "stripeAccountId"         LIKE 'acct_%'
  AND  "stripeConnectAccountId"  IS NULL;

DO $$ BEGIN
  RAISE NOTICE '443_add_stripe_connect_account_id: stripeConnectAccountId column added to seller_profiles and backfilled from stripeAccountId.';
END $$;
