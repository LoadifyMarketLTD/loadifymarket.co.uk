-- Buyer price-drop and back-in-stock alerts.
CREATE TABLE IF NOT EXISTS public.product_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "productId" uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "priceDrop" boolean NOT NULL DEFAULT true,
  "backInStock" boolean NOT NULL DEFAULT true,
  "lastPrice" numeric(12,2),
  "wasInStock" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId", "productId")
);
CREATE INDEX IF NOT EXISTS idx_product_alerts_product ON public.product_alerts("productId");
ALTER TABLE public.product_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_alerts_own ON public.product_alerts;
CREATE POLICY product_alerts_own ON public.product_alerts FOR ALL TO authenticated
  USING ("userId" = (select auth.uid())) WITH CHECK ("userId" = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_product_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.price < OLD.price THEN
    INSERT INTO public.notifications ("userId", type, title, message, link, metadata)
    SELECT a."userId", 'promotion', 'Price drop',
      NEW.title || ' is now £' || to_char(NEW.price, 'FM999999990.00'),
      '/product/' || NEW.id::text, jsonb_build_object('productId',NEW.id,'oldPrice',OLD.price,'newPrice',NEW.price)
    FROM public.product_alerts a WHERE a."productId"=NEW.id AND a."priceDrop" IS TRUE;
  END IF;

  IF COALESCE(OLD."stockQuantity",0) <= 0 AND COALESCE(NEW."stockQuantity",0) > 0 THEN
    INSERT INTO public.notifications ("userId", type, title, message, link, metadata)
    SELECT a."userId", 'promotion', 'Back in stock',
      NEW.title || ' is available again.', '/product/' || NEW.id::text,
      jsonb_build_object('productId',NEW.id,'stockQuantity',NEW."stockQuantity")
    FROM public.product_alerts a WHERE a."productId"=NEW.id AND a."backInStock" IS TRUE;
  END IF;
  UPDATE public.product_alerts SET "lastPrice"=NEW.price,
    "wasInStock"=COALESCE(NEW."stockQuantity",0)>0, "updatedAt"=now()
  WHERE "productId"=NEW.id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_product_alerts ON public.products;
CREATE TRIGGER trg_notify_product_alerts
AFTER UPDATE OF price, "stockQuantity" ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_product_alerts();

-- Cancellation metadata is separate from the immutable commercial snapshot.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancelledAt" timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancellationReason" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancelledBy" uuid REFERENCES public.users(id) ON DELETE SET NULL;


CREATE OR REPLACE FUNCTION public.server_finalize_buyer_cancellation_v1(p_order_id uuid, p_buyer_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.orders WHERE id=p_order_id AND "buyerId"=p_buyer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_status <> 'paid' THEN RAISE EXCEPTION 'order_not_cancellable'; END IF;
  UPDATE public.orders SET status='refunded', "escrowStatus"='refunded', "cancelledAt"=now(), "cancellationReason"=left(coalesce(nullif(trim(p_reason),''),'Buyer cancelled before fulfilment'),500), "cancelledBy"=p_buyer_id WHERE id=p_order_id;
  UPDATE public.products p SET "stockQuantity"=p."stockQuantity"+oi.quantity, "stockStatus"='in_stock', "listingStatus"=CASE WHEN p."isActive" AND p."isApproved" THEN 'active' ELSE p."listingStatus" END
  FROM public.order_items oi WHERE oi."orderId"=p_order_id AND oi."productId"=p.id AND coalesce(p."listingContext",'product') <> 'service';
END; $$;
REVOKE ALL ON FUNCTION public.server_finalize_buyer_cancellation_v1(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_finalize_buyer_cancellation_v1(uuid,uuid,text) TO service_role;
