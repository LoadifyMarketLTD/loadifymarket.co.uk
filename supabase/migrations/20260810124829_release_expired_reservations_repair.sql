CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  released_count integer;
BEGIN
  UPDATE public.products
     SET "listingStatus" = 'active',
         "reservedUntil" = NULL
   WHERE "listingStatus" = 'reserved'
     AND "reservedUntil" IS NOT NULL
     AND "reservedUntil" < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;;
