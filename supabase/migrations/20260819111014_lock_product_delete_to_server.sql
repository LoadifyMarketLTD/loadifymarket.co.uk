CREATE OR REPLACE FUNCTION public.delete_product_if_history_free(
  p_product_id uuid,
  p_caller_id uuid,
  p_is_admin boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  SELECT p."sellerId"
    INTO v_seller_id
    FROM public.products p
   WHERE p.id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF NOT COALESCE(p_is_admin, false)
     AND v_seller_id IS DISTINCT FROM p_caller_id THEN
    RETURN 'forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders             x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.order_items     x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.offers          x WHERE x."listingId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.product_offers  x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.product_questions x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.reviews         x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.reported_listings x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.product_analytics x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.promoted_listings x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.featured_listings x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.conversations   x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.messages        x WHERE x."productId" = p_product_id)
     OR EXISTS (SELECT 1 FROM public.support_tickets x WHERE x."productId" = p_product_id)
  THEN
    RETURN 'retained_history';
  END IF;

  DELETE FROM public.products
   WHERE id = p_product_id;

  RETURN 'deleted';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_product_if_history_free(uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_if_history_free(uuid, uuid, boolean)
  TO service_role;

COMMENT ON FUNCTION public.delete_product_if_history_free(uuid, uuid, boolean) IS
  'Server-only atomic hard-delete boundary for history-free products. Locks the product, rechecks ownership and retained marketplace history, then deletes in the same transaction.';

DROP POLICY IF EXISTS products_delete ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete their own products" ON public.products;
DROP POLICY IF EXISTS "products_delete_owner" ON public.products;

REVOKE DELETE ON TABLE public.products FROM anon, authenticated;
GRANT DELETE ON TABLE public.products TO service_role;;
