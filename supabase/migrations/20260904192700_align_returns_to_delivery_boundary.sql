-- Align buyer return eligibility with the physical delivery boundary and canonical 14-day return window.
-- This migration is repository-only until explicitly applied to hosted Supabase.
-- It does not execute refunds or payment mutations.

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
      AND o.status IN ('delivered','completed')
      AND EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.order_id = o.id
          AND lower(trim(s.status)) = 'delivered'
          AND s.updated_at IS NOT NULL
          AND s.updated_at <= now()
          AND s.updated_at >= now() - interval '14 days'
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.can_open_return(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_return(uuid,uuid) TO authenticated, service_role;
