-- Seller settlement fee transparency and exact Stripe fee evidence.
-- Additive migration: existing payout rows remain valid and receive neutral defaults.

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS "grossAmount" numeric(12,2),
  ADD COLUMN IF NOT EXISTS "stripeProcessingFee" numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platformFee" numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platformFeeVat" numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "connectFee" numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustments numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stripeBalanceTransactionId" text;

UPDATE public.payouts
SET "grossAmount" = amount
WHERE "grossAmount" IS NULL;

ALTER TABLE public.payouts
  ALTER COLUMN "grossAmount" SET NOT NULL,
  ALTER COLUMN "grossAmount" SET DEFAULT 0;

ALTER TABLE public.payouts
  DROP CONSTRAINT IF EXISTS payouts_settlement_amounts_nonnegative,
  ADD CONSTRAINT payouts_settlement_amounts_nonnegative CHECK (
    amount >= 0
    AND "grossAmount" >= 0
    AND "stripeProcessingFee" >= 0
    AND "platformFee" >= 0
    AND "platformFeeVat" >= 0
    AND "connectFee" >= 0
    AND adjustments >= 0
  ),
  DROP CONSTRAINT IF EXISTS payouts_settlement_reconciles,
  ADD CONSTRAINT payouts_settlement_reconciles CHECK (
    abs(
      "grossAmount"
      - "stripeProcessingFee"
      - "platformFee"
      - "platformFeeVat"
      - "connectFee"
      - adjustments
      - amount
    ) < 0.005
  );

CREATE UNIQUE INDEX IF NOT EXISTS payouts_stripe_balance_transaction_unique
  ON public.payouts ("stripeBalanceTransactionId")
  WHERE "stripeBalanceTransactionId" IS NOT NULL;

COMMENT ON COLUMN public.payouts."grossAmount" IS
  'Gross buyer payment allocated to this marketplace-seller settlement.';
COMMENT ON COLUMN public.payouts."stripeProcessingFee" IS
  'Actual Stripe processing fee from the immutable charge balance transaction; never an estimate.';
COMMENT ON COLUMN public.payouts."platformFee" IS
  'Loadify marketplace commission captured for the order (0% through 2026-12-31, then configured rate, normally 7%).';
COMMENT ON COLUMN public.payouts."platformFeeVat" IS
  'VAT charged on Loadify platform fees only when supported by configured tax evidence; otherwise zero.';
COMMENT ON COLUMN public.payouts."connectFee" IS
  'Actual attributable Stripe Connect or payout cost, recorded only when evidenced; otherwise zero.';
COMMENT ON COLUMN public.payouts.adjustments IS
  'Explicit refunds, chargebacks or other authorised seller-settlement adjustments.';
COMMENT ON COLUMN public.payouts."stripeBalanceTransactionId" IS
  'Immutable Stripe balance transaction proving the actual processing fee.';

REVOKE INSERT, UPDATE, DELETE ON public.payouts FROM anon, authenticated;
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

