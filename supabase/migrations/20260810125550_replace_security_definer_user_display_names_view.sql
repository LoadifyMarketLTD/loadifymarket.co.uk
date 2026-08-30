CREATE TABLE IF NOT EXISTS public.user_display_names_data (
  id uuid PRIMARY KEY,
  "firstName" text,
  "lastName" text
);

ALTER TABLE public.user_display_names_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_display_names_data_read ON public.user_display_names_data;
CREATE POLICY user_display_names_data_read
ON public.user_display_names_data
FOR SELECT
TO authenticated
USING (true);

REVOKE ALL ON TABLE public.user_display_names_data FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.user_display_names_data TO authenticated;
GRANT ALL ON TABLE public.user_display_names_data TO service_role;

INSERT INTO public.user_display_names_data (id, "firstName", "lastName")
SELECT id, "firstName", "lastName"
FROM public.users
ON CONFLICT (id) DO UPDATE SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";

CREATE OR REPLACE FUNCTION private.sync_user_display_names_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_display_names_data WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.user_display_names_data (id, "firstName", "lastName")
  VALUES (NEW.id, NEW."firstName", NEW."lastName")
  ON CONFLICT (id) DO UPDATE SET
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName";

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.sync_user_display_names_data() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_user_display_names_data ON public.users;
CREATE TRIGGER trg_sync_user_display_names_data
AFTER INSERT OR UPDATE OF "firstName", "lastName" OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION private.sync_user_display_names_data();

DROP VIEW IF EXISTS public.user_display_names;
CREATE VIEW public.user_display_names
WITH (security_invoker = true)
AS
SELECT id, "firstName", "lastName"
FROM public.user_display_names_data;

REVOKE ALL ON public.user_display_names FROM PUBLIC, anon;
GRANT SELECT ON public.user_display_names TO authenticated, service_role;;
