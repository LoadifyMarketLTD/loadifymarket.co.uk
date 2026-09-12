-- Seller fulfilment privacy + direct-to-seller return foundation.
CREATE TABLE IF NOT EXISTS public.seller_fulfilment_profiles (
  "sellerId" uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  "shippingOriginAddress" jsonb,
  "returnAddress" jsonb,
  "useShippingOriginAsReturn" boolean NOT NULL DEFAULT true,
  "dispatchDeadlineHours" integer NOT NULL DEFAULT 48 CHECK ("dispatchDeadlineHours" BETWEEN 1 AND 48),
  "trackingDeadlineHours" integer NOT NULL DEFAULT 48 CHECK ("trackingDeadlineHours" BETWEEN 1 AND 48),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_fulfilment_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seller_fulfilment_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.seller_fulfilment_profiles TO authenticated;

DROP POLICY IF EXISTS seller_fulfilment_select ON public.seller_fulfilment_profiles;
CREATE POLICY seller_fulfilment_select ON public.seller_fulfilment_profiles
FOR SELECT TO authenticated
USING ("sellerId" = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS seller_fulfilment_insert ON public.seller_fulfilment_profiles;
CREATE POLICY seller_fulfilment_insert ON public.seller_fulfilment_profiles
FOR INSERT TO authenticated
WITH CHECK ("sellerId" = (select auth.uid()) OR (select public.is_admin()));
DROP POLICY IF EXISTS seller_fulfilment_update ON public.seller_fulfilment_profiles;
CREATE POLICY seller_fulfilment_update ON public.seller_fulfilment_profiles
FOR UPDATE TO authenticated
USING ("sellerId" = (select auth.uid()) OR (select public.is_admin()))
WITH CHECK ("sellerId" = (select auth.uid()) OR (select public.is_admin()));

ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS "returnAddressSnapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "buyerReturnCarrier" text,
  ADD COLUMN IF NOT EXISTS "returnReceivedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "refundProcessedAt" timestamptz;

ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS returns_buyerReturnCarrier_check;
ALTER TABLE public.returns ADD CONSTRAINT returns_buyerReturnCarrier_check
CHECK ("buyerReturnCarrier" IS NULL OR "buyerReturnCarrier" IN ('Royal Mail','Evri'));

ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS returns_status_check;
ALTER TABLE public.returns ADD CONSTRAINT returns_status_check CHECK (status IN (
  'requested','approved','rejected','awaiting_buyer_dispatch','in_transit_to_seller',
  'awaiting_seller_reception','received','refund_pending','refunded','completed','cancelled'
));

CREATE OR REPLACE FUNCTION public.can_open_return(p_order_id uuid, p_seller_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  SELECT EXISTS (    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND o."buyerId" = auth.uid()
      AND o."sellerId" = p_seller_id
      AND o.status IN ('delivered','completed')
  );
$function$;
REVOKE ALL ON FUNCTION public.can_open_return(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_return(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.protect_return_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."buyerId" := auth.uid();
      NEW.status := 'requested';
      NEW."refundAmount" := NULL;
      NEW."buyerTrackingNumber" := NULL;
      NEW."sellerTrackingNumber" := NULL;
      NEW."resolvedBy" := NULL;
      NEW."resolvedAt" := NULL;
      NEW."returnAddressSnapshot" := NULL;
      NEW."buyerReturnCarrier" := NULL;
      NEW."returnReceivedAt" := NULL;
      NEW."refundProcessedAt" := NULL;
      NEW."createdAt" := now();
    ELSE
      NEW."orderId" := OLD."orderId";
      NEW."buyerId" := OLD."buyerId";
      NEW."sellerId" := OLD."sellerId";
      NEW.reason := OLD.reason;
      NEW.description := OLD.description;
      NEW.images := OLD.images;
      NEW."refundAmount" := OLD."refundAmount";
      NEW."buyerTrackingNumber" := OLD."buyerTrackingNumber";
      NEW."sellerTrackingNumber" := OLD."sellerTrackingNumber";
      NEW."resolvedBy" := OLD."resolvedBy";
      NEW."resolvedAt" := OLD."resolvedAt";
      NEW."returnAddressSnapshot" := OLD."returnAddressSnapshot";
      NEW."buyerReturnCarrier" := OLD."buyerReturnCarrier";
      NEW."returnReceivedAt" := OLD."returnReceivedAt";
      NEW."refundProcessedAt" := OLD."refundProcessedAt";
      NEW."createdAt" := OLD."createdAt";
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;