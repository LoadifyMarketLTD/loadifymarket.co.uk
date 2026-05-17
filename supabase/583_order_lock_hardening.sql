-- 583_order_lock_hardening.sql
--
-- Adds a service-role-only cleanup RPC for abandoned awaiting_payment orders so
-- stale test flows do not keep listings locked forever.

CREATE OR REPLACE FUNCTION release_stale_unpaid_listing_locks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancelled_count INTEGER := 0;
BEGIN
  WITH stale_orders AS (
    SELECT o.id, o."productId", o."createdAt"
    FROM   orders o
    LEFT JOIN products p ON p.id = o."productId"
    WHERE  o.status = 'awaiting_payment'
      AND  COALESCE(o."stripePaymentIntentId", '') = ''
      AND  o."createdAt" < NOW() - INTERVAL '15 minutes'
      AND  (
             p."reservedUntil" IS NULL
             OR p."reservedUntil" < NOW()
           )
  ),
  cancelled_orders AS (
    UPDATE orders o
    SET    status = 'cancelled'
    FROM   stale_orders s
    WHERE  o.id = s.id
    RETURNING o.id, o."productId", s."createdAt"
  ),
  audit_events AS (
    INSERT INTO order_events ("orderId", "actorId", event, metadata)
    SELECT c.id,
           NULL,
           'stale_unpaid_lock_released',
           jsonb_build_object(
             'reason', 'awaiting_payment_expired',
             'orderCreatedAt', c."createdAt",
             'releasedAt', NOW()
           )
    FROM   cancelled_orders c
  ),
  released_products AS (
    UPDATE products p
    SET    "listingStatus" = 'active',
           "reservedUntil" = NULL
    WHERE  p.id IN (SELECT DISTINCT "productId" FROM cancelled_orders)
      AND  NOT EXISTS (
             SELECT 1
             FROM   orders o
             WHERE  o."productId" = p.id
               AND  o.status IN ('awaiting_payment', 'paid', 'packed', 'shipped', 'delivered', 'completed')
           )
    RETURNING p.id
  )
  SELECT COUNT(*) INTO cancelled_count
  FROM cancelled_orders;

  RETURN cancelled_count;
END;
$$;

REVOKE ALL ON FUNCTION release_stale_unpaid_listing_locks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION release_stale_unpaid_listing_locks() TO service_role;
