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
      AND o.status IN ('paid','shipped','delivered','completed')
  );
$function$;
REVOKE ALL ON FUNCTION public.can_open_dispute(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_dispute(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.protect_dispute_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."buyerId" := auth.uid();
      NEW.status := 'open';
      NEW.resolution := NULL;
      NEW."resolutionType" := NULL;
      NEW."refundAmount" := NULL;
      NEW."resolvedBy" := NULL;
      NEW."escrowStatus" := 'held';
      NEW."buyerAbuseFlagged" := false;
      NEW."createdAt" := now();
    ELSE
      NEW."orderId" := OLD."orderId";
      NEW."buyerId" := OLD."buyerId";
      NEW."sellerId" := OLD."sellerId";
      NEW.status := OLD.status;
      NEW.resolution := OLD.resolution;
      NEW."resolutionType" := OLD."resolutionType";
      NEW."refundAmount" := OLD."refundAmount";
      NEW."resolvedBy" := OLD."resolvedBy";
      NEW."sellerResponseDeadline" := OLD."sellerResponseDeadline";
      NEW."adminReviewDeadline" := OLD."adminReviewDeadline";
      NEW."escrowStatus" := OLD."escrowStatus";
      NEW."buyerAbuseFlagged" := OLD."buyerAbuseFlagged";
      NEW."createdAt" := OLD."createdAt";
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_dispute_system_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_dispute_system_fields ON public.disputes;
CREATE TRIGGER trg_protect_dispute_system_fields
BEFORE INSERT OR UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION private.protect_dispute_system_fields();

DROP POLICY IF EXISTS disputes_insert ON public.disputes;
CREATE POLICY disputes_insert ON public.disputes
FOR INSERT TO authenticated
WITH CHECK (
  "buyerId" = (select auth.uid())
  AND public.can_open_dispute("orderId", "sellerId")
);

DROP POLICY IF EXISTS disputes_select ON public.disputes;
CREATE POLICY disputes_select ON public.disputes
FOR SELECT TO authenticated
USING (
  "buyerId" = (select auth.uid())
  OR "sellerId" = (select auth.uid())
  OR (select public.is_admin())
);

DROP POLICY IF EXISTS disputes_update ON public.disputes;
CREATE POLICY disputes_update ON public.disputes
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));;
