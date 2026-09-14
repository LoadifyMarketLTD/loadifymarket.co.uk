-- Preserve legacy/manual payout workflow while requiring exact reconciliation
-- for Stripe Connect order-transfer settlement rows.
ALTER TABLE public.payouts
  DROP CONSTRAINT IF EXISTS payouts_settlement_reconciles,
  ADD CONSTRAINT payouts_settlement_reconciles CHECK (
    "stripeTransferId" IS NULL
    OR abs(
      "grossAmount"
      - "stripeProcessingFee"
      - "platformFee"
      - "platformFeeVat"
      - "connectFee"
      - adjustments
      - amount
    ) < 0.005
  );

