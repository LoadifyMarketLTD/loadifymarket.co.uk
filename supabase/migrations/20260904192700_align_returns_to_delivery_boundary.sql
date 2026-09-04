-- Align buyer return eligibility with the physical delivery boundary.
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
  );
$function$;

REVOKE ALL ON FUNCTION public.can_open_return(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_return(uuid,uuid) TO authenticated, service_role;
