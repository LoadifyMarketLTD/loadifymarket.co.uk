CREATE OR REPLACE FUNCTION private.protect_user_platform_managed_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_meta_role text;
  v_email text;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      v_meta_role := auth.jwt() -> 'app_metadata' ->> 'role';
      v_email := auth.jwt() ->> 'email';
      NEW.role := CASE WHEN v_meta_role IN ('buyer','seller') THEN v_meta_role ELSE 'buyer' END;
      NEW."marketplaceRole" := NULL;
      NEW."isEmailVerified" := false;
      NEW."isActive" := true;
      NEW."createdAt" := now();
      IF v_email IS NOT NULL AND length(trim(v_email)) > 0 THEN
        NEW.email := lower(trim(v_email));
      END IF;
    ELSE
      NEW.role := OLD.role;
      NEW."marketplaceRole" := OLD."marketplaceRole";
      NEW."isEmailVerified" := OLD."isEmailVerified";
      NEW."isActive" := OLD."isActive";
      NEW."createdAt" := OLD."createdAt";
      NEW.email := OLD.email;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_user_platform_managed_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_user_platform_managed_fields ON public.users;
CREATE TRIGGER trg_protect_user_platform_managed_fields
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION private.protect_user_platform_managed_fields();

DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
FOR SELECT TO authenticated
USING (((select auth.uid()) = id) OR (select public.is_admin()));

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
FOR UPDATE TO authenticated
USING (((select auth.uid()) = id) OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = id) OR (select public.is_admin()));;
