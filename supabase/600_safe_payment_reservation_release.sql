-- 600_safe_payment_reservation_release.sql
-- A reservation must never be released while a pending Stripe checkout/payment
-- can still succeed. The old time-only cleanup could make stock available again
-- while Stripe still had a live payment object.

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
         "reservedUntil" = NULL
   WHERE p."listingStatus" = 'reserved'
     AND p."reservedUntil" IS NOT NULL
     AND p."reservedUntil" < NOW()
     AND NOT EXISTS (
       SELECT 1
         FROM public.payment_sessions AS ps
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
     );

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_reservations()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations()
  TO service_role;
