-- 601_payment_reservation_ownership.sql
-- Bind every new Stripe-backed product reservation to an opaque token. This
-- prevents a delayed failure/expiry event from one payment session from
-- releasing a newer buyer's reservation for the same product.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "reservationToken" uuid;

CREATE INDEX IF NOT EXISTS idx_products_reservation_token
  ON public.products ("reservationToken")
  WHERE "reservationToken" IS NOT NULL;

-- Token-aware paid fulfilment. The token is checked while the product row is
-- locked, so stock cannot be consumed by a payment that no longer owns the
-- reservation. Services have no stock reservation and only receive the durable
-- order-item finalisation marker.
CREATE OR REPLACE FUNCTION public.finalize_paid_order_item(
  p_order_id uuid,
  p_product_id uuid,
  p_reservation_token uuid
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
  v_reservation_token uuid;
BEGIN
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

  SELECT "listingContext", "stockQuantity", "reservationToken"
    INTO v_context, v_stock, v_reservation_token
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'finalize_paid_order_item: product % not found', p_product_id;
  END IF;

  IF v_context = 'service' THEN
    UPDATE public.order_items
       SET "stockFinalizedAt" = NOW()
     WHERE id = v_item_id;
    RETURN;
  END IF;

  IF p_reservation_token IS NULL OR v_reservation_token IS DISTINCT FROM p_reservation_token THEN
    RAISE EXCEPTION 'finalize_paid_order_item: reservation ownership mismatch for product %', p_product_id;
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
         "listingStatus" = CASE WHEN v_new_stock <= 0 THEN 'sold' ELSE 'active' END,
         "reservedUntil" = NULL,
         "reservationToken" = NULL
   WHERE id = p_product_id;

  UPDATE public.order_items
     SET "stockFinalizedAt" = NOW()
   WHERE id = v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_order_item(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order_item(uuid, uuid, uuid)
  TO service_role;

-- Make the old token-less overload fail closed if stale application code calls
-- it during a deployment boundary. No stock is changed without ownership proof.
CREATE OR REPLACE FUNCTION public.finalize_paid_order_item(
  p_order_id uuid,
  p_product_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RAISE EXCEPTION 'finalize_paid_order_item: reservation token required';
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_order_item(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order_item(uuid, uuid)
  TO service_role;

-- Time-only cleanup may release a legacy token-less reservation, but a new
-- token-owned reservation is protected while its corresponding payment session
-- remains pending.
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE public.products AS p
     SET "listingStatus" = 'active',
         "reservedUntil" = NULL,
         "reservationToken" = NULL
   WHERE p."listingStatus" = 'reserved'
     AND p."reservedUntil" IS NOT NULL
     AND p."reservedUntil" < NOW()
     AND NOT EXISTS (
       SELECT 1
         FROM public.payment_sessions AS ps
        WHERE ps.status = 'pending'
          AND (
            (
              p."reservationToken" IS NOT NULL
              AND ps.metadata ->> 'reservationToken' = p."reservationToken"::text
            )
            OR (
              p."reservationToken" IS NULL
              AND EXISTS (
                SELECT 1
                  FROM jsonb_array_elements(
                    CASE
                      WHEN jsonb_typeof(ps.metadata -> 'items') = 'array'
                        THEN ps.metadata -> 'items'
                      ELSE '[]'::jsonb
                    END
                  ) AS item
                 WHERE item ->> 'productId' = p.id::text
              )
            )
          )
     );

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_reservations()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations()
  TO service_role;

-- Legacy awaiting_payment orders may be cancelled independently, but their
-- cleanup must never clear a product that is currently owned by a Stripe-backed
-- reservation.
CREATE OR REPLACE FUNCTION public.release_stale_unpaid_listing_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  cancelled_count integer := 0;
BEGIN
  WITH stale_orders AS (
    SELECT o.id, o."productId", o."createdAt"
      FROM public.orders o
     WHERE o.status = 'awaiting_payment'
       AND COALESCE(o."stripePaymentIntentId", '') = ''
       AND o."createdAt" < NOW() - INTERVAL '15 minutes'
  ),
  cancelled_orders AS (
    UPDATE public.orders o
       SET status = 'cancelled'
      FROM stale_orders s
     WHERE o.id = s.id
    RETURNING o.id, o."productId", s."createdAt"
  ),
  audit_events AS (
    INSERT INTO public.order_events ("orderId", "actorId", event, metadata)
    SELECT c.id,
           NULL,
           'stale_unpaid_lock_released',
           jsonb_build_object(
             'reason', 'awaiting_payment_expired',
             'orderCreatedAt', c."createdAt",
             'releasedAt', NOW()
           )
      FROM cancelled_orders c
  ),
  released_products AS (
    UPDATE public.products p
       SET "listingStatus" = 'active',
           "reservedUntil" = NULL,
           "reservationToken" = NULL
     WHERE p.id IN (SELECT DISTINCT "productId" FROM cancelled_orders)
       AND p."reservationToken" IS NULL
       AND NOT EXISTS (
         SELECT 1
           FROM public.payment_sessions ps
          WHERE ps.status = 'pending'
            AND EXISTS (
              SELECT 1
                FROM jsonb_array_elements(
                  CASE
                    WHEN jsonb_typeof(ps.metadata -> 'items') = 'array'
                      THEN ps.metadata -> 'items'
                    ELSE '[]'::jsonb
                  END
                ) AS item
               WHERE item ->> 'productId' = p.id::text
            )
       )
       AND NOT EXISTS (
         SELECT 1
           FROM public.orders o
          WHERE o."productId" = p.id
            AND o.status IN ('awaiting_payment', 'paid', 'packed', 'shipped', 'delivered', 'completed')
       )
    RETURNING p.id
  )
  SELECT COUNT(*) INTO cancelled_count FROM cancelled_orders;

  RETURN cancelled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_stale_unpaid_listing_locks()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_unpaid_listing_locks()
  TO service_role;
