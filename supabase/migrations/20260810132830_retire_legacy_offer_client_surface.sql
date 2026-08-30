DROP POLICY IF EXISTS offers_select_conversation_participants ON public.offers;
DROP POLICY IF EXISTS offers_update_recipient_pending ON public.offers;
REVOKE ALL ON TABLE public.offers FROM anon, authenticated;
GRANT ALL ON TABLE public.offers TO service_role;;
