CREATE OR REPLACE FUNCTION public.can_open_dispute(p_order_id uuid, p_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o."buyerId" = auth.uid()
      AND o."sellerId" = p_seller_id
      AND o.status IN ('paid','packed','shipped','delivered','completed')
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_open_return(p_order_id uuid, p_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o."buyerId" = auth.uid()
      AND o."sellerId" = p_seller_id
      AND o.status = 'completed'
  );
$function$;
REVOKE ALL ON FUNCTION public.can_open_return(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_return(uuid,uuid) TO authenticated, service_role;

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
      NEW."buyerTrackingNumber" := OLD."buyerTrackingNumber";
      NEW."sellerTrackingNumber" := OLD."sellerTrackingNumber";
      NEW."resolvedBy" := OLD."resolvedBy";
      NEW."resolvedAt" := OLD."resolvedAt";
      NEW."createdAt" := OLD."createdAt";
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

DROP POLICY IF EXISTS returns_insert ON public.returns;
CREATE POLICY returns_insert ON public.returns
FOR INSERT TO authenticated
WITH CHECK (
  "buyerId" = (select auth.uid())
  AND public.can_open_return("orderId", "sellerId")
);

DROP POLICY IF EXISTS returns_select ON public.returns;
CREATE POLICY returns_select ON public.returns
FOR SELECT TO authenticated
USING (
  "buyerId" = (select auth.uid())
  OR "sellerId" = (select auth.uid())
  OR (select public.is_admin())
);

DROP POLICY IF EXISTS returns_seller_update ON public.returns;
CREATE POLICY returns_seller_update ON public.returns
FOR UPDATE TO authenticated
USING (
  "sellerId" = (select auth.uid())
  AND status = 'requested'
)
WITH CHECK (
  "sellerId" = (select auth.uid())
  AND status IN ('approved','rejected')
);

DROP POLICY IF EXISTS returns_admin_update ON public.returns;
CREATE POLICY returns_admin_update ON public.returns
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));

CREATE UNIQUE INDEX IF NOT EXISTS returns_one_nonrejected_per_order
  ON public.returns ("orderId")
  WHERE status <> 'rejected';

CREATE OR REPLACE FUNCTION private.notify_buyer_on_return_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.notifications ("userId", type, title, message, link)
    VALUES (
      NEW."buyerId",
      'return',
      CASE WHEN NEW.status='approved' THEN 'Return approved' ELSE 'Return rejected' END,
      CASE WHEN NEW.status='approved'
        THEN 'Your return request has been approved.'
        ELSE 'Your return request has been rejected. Please contact support if you have questions.'
      END,
      '/buyer/orders'
    );
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.notify_buyer_on_return_decision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_buyer_on_return_decision ON public.returns;
CREATE TRIGGER trg_notify_buyer_on_return_decision
AFTER UPDATE OF status ON public.returns
FOR EACH ROW EXECUTE FUNCTION private.notify_buyer_on_return_decision();;
