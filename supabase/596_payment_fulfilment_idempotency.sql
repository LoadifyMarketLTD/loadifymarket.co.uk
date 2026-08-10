-- 596_payment_fulfilment_idempotency.sql
-- One order per Stripe PaymentIntent (single-seller checkout) and one order item
-- row per product. Product stock finalisation is performed atomically so webhook
-- retries cannot decrement inventory twice.

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_unique
  ON public.orders ("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS order_items_order_product_unique
  ON public.order_items ("orderId", "productId");

CREATE OR REPLACE FUNCTION public.finalize_paid_product(
  p_product_id uuid,
  p_qty integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_context text;
  v_status text;
  v_stock integer;
  v_new_stock integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'finalize_paid_product: quantity must be greater than zero';
  END IF;

  SELECT "listingContext", "listingStatus", "stockQuantity"
    INTO v_context, v_status, v_stock
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'finalize_paid_product: product % not found', p_product_id;
  END IF;

  -- Services do not carry physical inventory.
  IF v_context = 'service' THEN
    RETURN;
  END IF;

  -- A completed previous webhook attempt already finalised this listing.
  IF v_status = 'sold' THEN
    RETURN;
  END IF;

  IF COALESCE(v_stock, 0) < p_qty THEN
    RAISE EXCEPTION 'finalize_paid_product: insufficient stock for product %', p_product_id;
  END IF;

  v_new_stock := v_stock - p_qty;

  UPDATE public.products
     SET "stockQuantity" = v_new_stock,
         "stockStatus" = CASE
           WHEN v_new_stock <= 0 THEN 'out_of_stock'
           WHEN v_new_stock <= 10 THEN 'low_stock'
           ELSE 'in_stock'
         END,
         "listingStatus" = CASE WHEN v_new_stock <= 0 THEN 'sold' ELSE 'active' END,
         "reservedUntil" = NULL
   WHERE id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_product(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_product(uuid, integer) TO service_role;
