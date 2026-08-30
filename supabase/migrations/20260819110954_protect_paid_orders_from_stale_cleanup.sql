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
       AND NOT EXISTS (
         SELECT 1
           FROM public.payment_sessions ps
          WHERE ps."orderId" = o.id
            AND ps.status = 'completed'
            AND COALESCE(ps."stripePaymentIntent", '') <> ''
       )
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
             'releasedAt', NOW(),
             'paymentEvidenceChecked', true
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

COMMENT ON FUNCTION public.release_stale_unpaid_listing_locks() IS
  'Cancels expired awaiting_payment orders only when neither the order nor a linked completed payment session contains Stripe payment evidence, then safely releases unowned listing reservations.';;
