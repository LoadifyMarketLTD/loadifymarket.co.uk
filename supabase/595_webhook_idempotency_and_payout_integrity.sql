-- 595_webhook_idempotency_and_payout_integrity.sql
-- Stripe events must have one durable row per event ID across processing,
-- failure and retry states. Stripe transfers must also be unique per order.

ALTER TABLE public.stripe_events
  DROP CONSTRAINT IF EXISTS stripe_events_status_check;

ALTER TABLE public.stripe_events
  ADD CONSTRAINT stripe_events_status_check
  CHECK (status IN ('processing', 'processed', 'failed', 'skipped'));

DROP INDEX IF EXISTS public.stripe_events_event_id_processed_unique;
DROP INDEX IF EXISTS public.idx_stripe_events_event_id;
CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_event_id_unique
  ON public.stripe_events (event_id);

-- At most one Stripe Connect transfer may be recorded against an order.
-- Failed/pending rows without a transfer ID remain allowed for operational logs.
CREATE UNIQUE INDEX IF NOT EXISTS payouts_order_transfer_unique
  ON public.payouts ("orderId")
  WHERE "orderId" IS NOT NULL AND "stripeTransferId" IS NOT NULL;
