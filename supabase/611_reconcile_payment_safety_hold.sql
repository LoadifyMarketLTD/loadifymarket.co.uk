-- 611_reconcile_payment_safety_hold.sql
--
-- Checkpoint A Foundation reconciliation for two emergency payment controls that
-- were installed before the later escrow and checkout-shipping hardening landed.
--
-- Current runtime contract before this migration:
--   * marketplace-held funds are transferred to the seller only from the
--     escrow-release boundary after delivery/completion + protection window;
--   * escrow release re-checks dispute/refund/order state and compensates Stripe
--     transfers when eligibility changes;
--   * checkout persists shipping as an explicit Stripe line item;
--   * migration 610 fail-closes payment sessions to complete immutable commercial
--     snapshot evidence and materialises paid history atomically.
--
-- Preserve the global safety switch as an emergency fail-closed mechanism, but
-- return it to its normal disabled state after proving there is no in-flight
-- financial state. Remove only the obsolete shipping guard whose old heuristic
-- would now reject legitimate web checkout even though shipping is charged by
-- the current Stripe producer.

DO $$
BEGIN
  IF to_regprocedure('public.server_materialize_paid_order_v1(uuid,text,numeric)') IS NULL THEN
    RAISE EXCEPTION 'payment safety reconciliation requires migration 610 atomic materialization';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.platform_settings
     WHERE key = 'payments_safety_hold'
  ) THEN
    RAISE EXCEPTION 'payments_safety_hold setting is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_guard_payment_sessions_during_safety_hold'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'emergency payment safety-hold trigger is missing';
  END IF;

  -- Refuse to reopen checkout over any state that could be mid-cutover.
  IF EXISTS (
    SELECT 1 FROM public.payment_sessions WHERE status = 'pending'
  ) THEN
    RAISE EXCEPTION 'payment safety reconciliation blocked: pending payment session exists';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.orders
     WHERE status IN ('paid', 'packed', 'shipped', 'delivered')
        OR "escrowStatus" = 'held'
  ) THEN
    RAISE EXCEPTION 'payment safety reconciliation blocked: financially active/held order exists';
  END IF;
END;
$$;

-- The current create-checkout producer adds shipping directly to Stripe line_items
-- and persists shippingAmountPence/totalPence in the canonical payment evidence.
-- This older heuristic no longer represents the runtime contract and would
-- incorrectly reject legitimate web shipping after the global hold is disabled.
DROP TRIGGER IF EXISTS trg_guard_web_checkout_shipping_charge
  ON public.payment_sessions;
DROP FUNCTION IF EXISTS private.guard_web_checkout_shipping_charge();

-- Keep the emergency switch and its trigger available for immediate fail-closed
-- use, but disable the historical blanket hold now that its prerequisite
-- Foundation fixes are installed and the cutover pre-state is empty.
UPDATE public.platform_settings
   SET value = 'false'::jsonb,
       description = 'Emergency checkout safety switch. Set true to fail closed. Historical escrow/shipping hold reconciled after verified marketplace-held-funds, transfer-compensation, explicit Stripe shipping-line, and migration-610 atomic commercial-history hardening.',
       "updatedAt" = now()
 WHERE key = 'payments_safety_hold';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_guard_web_checkout_shipping_charge'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'obsolete web checkout shipping guard remains installed';
  END IF;

  IF to_regprocedure('private.guard_web_checkout_shipping_charge()') IS NOT NULL THEN
    RAISE EXCEPTION 'obsolete web checkout shipping guard function remains installed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.platform_settings
     WHERE key = 'payments_safety_hold'
       AND value = 'false'::jsonb
  ) THEN
    RAISE EXCEPTION 'payments_safety_hold was not disabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_guard_payment_sessions_during_safety_hold'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'emergency payment safety-hold trigger was not preserved';
  END IF;
END;
$$;
