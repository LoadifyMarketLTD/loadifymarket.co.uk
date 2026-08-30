CREATE OR REPLACE FUNCTION private.protect_conversation_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    NEW."user1Id" := OLD."user1Id";
    NEW."user2Id" := OLD."user2Id";
    NEW."productId" := OLD."productId";
    NEW."orderId" := OLD."orderId";
    NEW.subject := OLD.subject;
    NEW."lastMessageAt" := OLD."lastMessageAt";
    NEW."createdAt" := OLD."createdAt";
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_conversation_client_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_conversation_client_update ON public.conversations;
CREATE TRIGGER trg_protect_conversation_client_update
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION private.protect_conversation_client_update();

DROP POLICY IF EXISTS conversations_insert ON public.conversations;
REVOKE INSERT ON public.conversations FROM anon, authenticated;
GRANT ALL ON public.conversations TO service_role;

DROP POLICY IF EXISTS conversations_select ON public.conversations;
CREATE POLICY conversations_select ON public.conversations
FOR SELECT TO authenticated
USING (
  "user1Id" = (select auth.uid())
  OR "user2Id" = (select auth.uid())
  OR (select public.is_admin())
);

DROP POLICY IF EXISTS conversations_update_archive ON public.conversations;
CREATE POLICY conversations_update_archive ON public.conversations
FOR UPDATE TO authenticated
USING (
  "user1Id" = (select auth.uid())
  OR "user2Id" = (select auth.uid())
  OR (select public.is_admin())
)
WITH CHECK (
  "user1Id" = (select auth.uid())
  OR "user2Id" = (select auth.uid())
  OR (select public.is_admin())
);

CREATE OR REPLACE FUNCTION private.protect_message_read_receipt_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    NEW."conversationId" := OLD."conversationId";
    NEW."senderId" := OLD."senderId";
    NEW."receiverId" := OLD."receiverId";
    NEW."productId" := OLD."productId";
    NEW."orderId" := OLD."orderId";
    NEW.message := OLD.message;
    NEW."attachmentUrls" := OLD."attachmentUrls";
    NEW."clientMessageId" := OLD."clientMessageId";
    NEW."createdAt" := OLD."createdAt";
    IF OLD."isRead" = true THEN
      NEW."isRead" := true;
      NEW."readAt" := COALESCE(OLD."readAt", NEW."readAt");
    ELSE
      NEW."isRead" := true;
      NEW."readAt" := COALESCE(NEW."readAt", now());
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_message_read_receipt_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_message_read_receipt_update ON public.messages;
CREATE TRIGGER trg_protect_message_read_receipt_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION private.protect_message_read_receipt_update();

DROP POLICY IF EXISTS messages_insert ON public.messages;
REVOKE INSERT ON public.messages FROM anon, authenticated;
GRANT ALL ON public.messages TO service_role;

DROP POLICY IF EXISTS messages_select_participants ON public.messages;
CREATE POLICY messages_select_participants ON public.messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.conversations c
  WHERE c.id = messages."conversationId"
    AND (c."user1Id" = (select auth.uid()) OR c."user2Id" = (select auth.uid()))
));

DROP POLICY IF EXISTS messages_receiver_read_update ON public.messages;
CREATE POLICY messages_receiver_read_update ON public.messages
FOR UPDATE TO authenticated
USING ("receiverId" = (select auth.uid()))
WITH CHECK ("receiverId" = (select auth.uid()));;
