ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS "buyerCarrier" text;

ALTER TABLE public.returns
  DROP CONSTRAINT IF EXISTS returns_buyer_tracking_format;
ALTER TABLE public.returns
  ADD CONSTRAINT returns_buyer_tracking_format CHECK (
    "buyerTrackingNumber" IS NULL OR (
      char_length(btrim("buyerTrackingNumber")) BETWEEN 4 AND 80
      AND "buyerTrackingNumber" ~ '^[A-Za-z0-9][A-Za-z0-9 _./-]*$'
    )
  );

CREATE OR REPLACE FUNCTION private.protect_return_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."buyerId" := auth.uid();
      NEW.status := 'requested';
      NEW."refundAmount" := NULL;
      NEW."buyerTrackingNumber" := NULL;
      NEW."buyerCarrier" := NULL;
      NEW."sellerTrackingNumber" := NULL;
      NEW."resolvedBy" := NULL;
      NEW."resolvedAt" := NULL;
      NEW."createdAt" := now();
    ELSE
      NEW."orderId" := OLD."orderId";
      NEW."buyerId" := OLD."buyerId";
      NEW."sellerId" := OLD."sellerId";
      NEW.reason := OLD.reason;
      NEW.description := OLD.description;
      NEW.images := OLD.images;
      NEW."refundAmount" := OLD."refundAmount";
      NEW."sellerTrackingNumber" := OLD."sellerTrackingNumber";
      NEW."resolvedBy" := OLD."resolvedBy";
      NEW."resolvedAt" := OLD."resolvedAt";
      NEW."createdAt" := OLD."createdAt";

      IF auth.uid() = OLD."buyerId" AND OLD.status = 'approved' THEN
        NEW.status := OLD.status;
        NEW."buyerTrackingNumber" := NULLIF(btrim(NEW."buyerTrackingNumber"), '');
        NEW."buyerCarrier" := NULLIF(btrim(NEW."buyerCarrier"), '');
      ELSE
        NEW."buyerTrackingNumber" := OLD."buyerTrackingNumber";
        NEW."buyerCarrier" := OLD."buyerCarrier";
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_return_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_return_fields ON public.returns;
CREATE TRIGGER trg_protect_return_fields
BEFORE INSERT OR UPDATE ON public.returns
FOR EACH ROW EXECUTE FUNCTION private.protect_return_fields();

DROP POLICY IF EXISTS returns_buyer_tracking_update ON public.returns;
CREATE POLICY returns_buyer_tracking_update ON public.returns
FOR UPDATE TO authenticated
USING (
  "buyerId" = (select auth.uid())
  AND status = 'approved'
)
WITH CHECK (
  "buyerId" = (select auth.uid())
  AND status = 'approved'
  AND "buyerTrackingNumber" IS NOT NULL
);

CREATE INDEX IF NOT EXISTS returns_approved_tracking_pending
  ON public.returns ("buyerId", "createdAt")
  WHERE status = 'approved' AND "buyerTrackingNumber" IS NULL;

COMMENT ON COLUMN public.returns."buyerCarrier" IS
  'Buyer-provided return carrier recorded after seller approval; tracking mutations are RLS and trigger constrained.';

CREATE OR REPLACE FUNCTION private.notify_seller_on_return_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW."buyerTrackingNumber" IS DISTINCT FROM OLD."buyerTrackingNumber"
     AND NEW."buyerTrackingNumber" IS NOT NULL THEN
    INSERT INTO public.notifications ("userId", type, title, message, link)
    VALUES (
      NEW."sellerId",
      'return',
      'Return parcel dispatched',
      'The buyer added return tracking. Open the return request to follow the parcel.',
      '/seller/returns'
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_seller_on_return_tracking() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_seller_on_return_tracking ON public.returns;
CREATE TRIGGER trg_notify_seller_on_return_tracking
AFTER UPDATE OF "buyerTrackingNumber" ON public.returns
FOR EACH ROW EXECUTE FUNCTION private.notify_seller_on_return_tracking();

CREATE OR REPLACE FUNCTION private.notify_admins_on_return_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications ("userId", type, title, message, link)
    SELECT u.id, 'return', 'Approved return awaiting completion',
      'A seller approved a return. Monitor tracking and process the refund only after the return conditions are met.',
      '/admin/orders'
    FROM public.users u
    WHERE u.role = 'admin' AND u."isActive" = true;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_admins_on_return_approval() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_admins_on_return_approval ON public.returns;
CREATE TRIGGER trg_notify_admins_on_return_approval
AFTER UPDATE OF status ON public.returns
FOR EACH ROW EXECUTE FUNCTION private.notify_admins_on_return_approval();
