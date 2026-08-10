-- 599_payment_retry_and_refund_integrity.sql
-- Make paid-order fulfilment idempotent at the order-item level and ensure
-- Stripe dispute retries cannot create duplicate dispute records.
--
-- New marketplace checkout is Stripe Connect-only. Funds remain with the
-- platform until escrow-release transfers them, so refunding a Connect order
-- must never debit an unrelated legacy seller_balance row.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Per-order-item inventory finalisation marker
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS "stockFinalizedAt" timestamptz;

CREATE OR REPLACE FUNCTION public.finalize_paid_order_item(
  p_order_id uuid,
  p_product_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item_id uuid;
  v_qty integer;
  v_finalized_at timestamptz;
  v_context text;
  v_stock integer;
  v_new_stock integer;
BEGIN
  -- Lock the order item first. The timestamp is the durable idempotency marker:
  -- if a webhook retry reaches this item again there is nothing left to do.
  SELECT id, quantity, "stockFinalizedAt"
    INTO v_item_id, v_qty, v_finalized_at
    FROM public.order_items
   WHERE "orderId" = p_order_id
     AND "productId" = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'finalize_paid_order_item: order item not found for order %, product %',
      p_order_id, p_product_id;
  END IF;

  IF v_finalized_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF v_qty IS NULL OR v_qty <= 0 THEN
    RAISE EXCEPTION 'finalize_paid_order_item: invalid quantity for order %, product %',
      p_order_id, p_product_id;
  END IF;

  SELECT "listingContext", "stockQuantity"
    INTO v_context, v_stock
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'finalize_paid_order_item: product % not found', p_product_id;
  END IF;

  -- Services have no physical inventory, but still receive the durable marker
  -- so a retry is explicitly recognised as completed.
  IF v_context = 'service' THEN
    UPDATE public.order_items
       SET "stockFinalizedAt" = NOW()
     WHERE id = v_item_id;
    RETURN;
  END IF;

  IF COALESCE(v_stock, 0) < v_qty THEN
    RAISE EXCEPTION 'finalize_paid_order_item: insufficient stock for product %', p_product_id;
  END IF;

  v_new_stock := v_stock - v_qty;

  UPDATE public.products
     SET "stockQuantity" = v_new_stock,
         "stockStatus" = CASE
           WHEN v_new_stock <= 0 THEN 'out_of_stock'
           WHEN v_new_stock <= 10 THEN 'low_stock'
           ELSE 'in_stock'
         END,
         "listingStatus" = CASE
           WHEN v_new_stock <= 0 THEN 'sold'
           ELSE 'active'
         END,
         "reservedUntil" = NULL
   WHERE id = p_product_id;

  UPDATE public.order_items
     SET "stockFinalizedAt" = NOW()
   WHERE id = v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_order_item(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order_item(uuid, uuid)
  TO service_role;

-- The old product-status-based helper cannot distinguish a successful sale
-- that leaves stock remaining from a webhook retry. Keep it unavailable so new
-- code cannot accidentally reintroduce that behaviour.
REVOKE ALL ON FUNCTION public.finalize_paid_product(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Stripe dispute idempotency
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS "stripeDisputeId" text;

CREATE UNIQUE INDEX IF NOT EXISTS disputes_stripe_dispute_id_unique
  ON public.disputes ("stripeDisputeId")
  WHERE "stripeDisputeId" IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Remove unsafe legacy refund-to-balance trigger
-- ─────────────────────────────────────────────────────────────────────────────
-- New checkout requires active Stripe Connect and does not credit seller_balance.
-- Therefore a refund must not debit seller_balance merely because an order was
-- marked refunded; doing so could consume unrelated legacy funds.
DROP TRIGGER IF EXISTS trg_reconcile_seller_balance_on_refund ON public.orders;
DROP FUNCTION IF EXISTS private.reconcile_seller_balance_on_refund();

-- seller_balance_adjustments is intentionally retained for historical/audit
-- compatibility. It is no longer mutated by the marketplace refund path.
