CREATE OR REPLACE FUNCTION private.protect_support_ticket_client_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."userId" := auth.uid();
      NEW."guestEmail" := NULL;
      NEW."guestName" := NULL;
      NEW.status := 'open';
      NEW."assignedTo" := NULL;
      NEW."resolvedAt" := NULL;
      NEW."resolutionNote" := NULL;
      NEW."createdAt" := now();
    ELSE
      NEW."userId" := OLD."userId";
      NEW."guestEmail" := OLD."guestEmail";
      NEW."guestName" := OLD."guestName";
      NEW.status := OLD.status;
      NEW."assignedTo" := OLD."assignedTo";
      NEW."resolvedAt" := OLD."resolvedAt";
      NEW."resolutionNote" := OLD."resolutionNote";
      NEW."createdAt" := OLD."createdAt";
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_support_ticket_client_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_support_ticket_client_fields ON public.support_tickets;
CREATE TRIGGER trg_protect_support_ticket_client_fields
BEFORE INSERT OR UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION private.protect_support_ticket_client_fields();

CREATE OR REPLACE FUNCTION private.protect_support_message_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_name text;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    SELECT trim(concat_ws(' ', u."firstName", u."lastName"))
      INTO v_name
      FROM public.users u
     WHERE u.id = auth.uid();
    NEW."senderId" := auth.uid();
    NEW."senderName" := COALESCE(NULLIF(v_name,''), 'User');
    NEW."isStaff" := false;
    NEW."isInternal" := false;
    NEW."createdAt" := now();
  ELSIF auth.role() = 'authenticated' AND public.is_admin() THEN
    NEW."senderId" := auth.uid();
    NEW."isStaff" := true;
    NEW."createdAt" := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_support_message_identity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_support_message_identity ON public.support_ticket_messages;
CREATE TRIGGER trg_protect_support_message_identity
BEFORE INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION private.protect_support_message_identity();

DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK (
  (select public.is_admin())
  OR (
    "userId" = (select auth.uid())
    AND "guestEmail" IS NULL
    AND "guestName" IS NULL
  )
);

DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
CREATE POLICY support_tickets_select ON public.support_tickets
FOR SELECT TO authenticated
USING ("userId" = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS support_tickets_admin_update ON public.support_tickets;
CREATE POLICY support_tickets_admin_update ON public.support_tickets
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));

DROP POLICY IF EXISTS ticket_messages_insert ON public.support_ticket_messages;
CREATE POLICY ticket_messages_insert ON public.support_ticket_messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = support_ticket_messages."ticketId"
      AND (t."userId" = (select auth.uid()) OR (select public.is_admin()))
  )
  AND "senderId" = (select auth.uid())
);

DROP POLICY IF EXISTS ticket_messages_select ON public.support_ticket_messages;
CREATE POLICY ticket_messages_select ON public.support_ticket_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = support_ticket_messages."ticketId"
      AND (t."userId" = (select auth.uid()) OR (select public.is_admin()))
  )
);

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_tickets, public.support_ticket_messages TO service_role;;
