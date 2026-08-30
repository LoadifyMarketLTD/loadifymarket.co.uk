CREATE OR REPLACE FUNCTION private.canonicalize_notification_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.link = '/pp/seller/orders' THEN
    NEW.link := '/seller/orders';
  ELSIF NEW.link = '/pp/buyer/orders' THEN
    NEW.link := '/buyer/orders';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.canonicalize_notification_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_canonicalize_notification_link ON public.notifications;
CREATE TRIGGER trg_canonicalize_notification_link
BEFORE INSERT OR UPDATE OF link ON public.notifications
FOR EACH ROW EXECUTE FUNCTION private.canonicalize_notification_link();

UPDATE public.notifications SET link='/seller/orders' WHERE link='/pp/seller/orders';
UPDATE public.notifications SET link='/buyer/orders' WHERE link='/pp/buyer/orders';;
