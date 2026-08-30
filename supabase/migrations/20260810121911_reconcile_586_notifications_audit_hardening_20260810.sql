ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.audit_logs (
    "actorId", action, "tableName", "recordId", "oldData", "newData"
  ) VALUES (
    auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB) TO service_role;;
