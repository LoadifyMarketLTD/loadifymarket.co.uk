ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS "stockRestoredAt" timestamptz;

CREATE OR REPLACE FUNCTION public.reconcile_full_order_refund(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item record;
  v_restored integer := 0;
BEGIN
  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconcile_full_order_refund: order % not found', p_order_id;
  END IF;

  FOR v_item IN
    SELECT oi.id, oi."productId", oi.quantity, p."listingContext"
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi."productId"
     WHERE oi."orderId" = p_order_id
       AND oi."stockFinalizedAt" IS NOT NULL
       AND oi."stockRestoredAt" IS NULL
     FOR UPDATE OF oi, p
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'reconcile_full_order_refund: invalid quantity for order item %', v_item.id;
    END IF;

    IF v_item."listingContext" <> 'service' THEN
      UPDATE public.products
         SET "stockQuantity" = COALESCE("stockQuantity", 0) + v_item.quantity,
             "stockStatus" = CASE
               WHEN COALESCE("stockQuantity", 0) + v_item.quantity <= 10 THEN 'low_stock'
               ELSE 'in_stock'
             END,
             "listingStatus" = 'active',
             "reservedUntil" = NULL
       WHERE id = v_item."productId";
      v_restored := v_restored + 1;
    END IF;

    UPDATE public.order_items
       SET "stockRestoredAt" = now()
     WHERE id = v_item.id;
  END LOOP;

  UPDATE public.orders
     SET status = 'refunded', "escrowStatus" = 'refunded'
   WHERE id = p_order_id;

  UPDATE public.order_cancellation_requests
     SET status = 'refunded', "updatedAt" = now()
   WHERE "orderId" = p_order_id
     AND status IN ('requested', 'approved');

  RETURN jsonb_build_object('orderId', p_order_id, 'restoredProductCount', v_restored);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_full_order_refund(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_full_order_refund(uuid) TO service_role;

COMMENT ON FUNCTION public.reconcile_full_order_refund(uuid) IS
  'Atomically marks a fully refunded order, closes its cancellation request, and restores finalized product stock exactly once.';
