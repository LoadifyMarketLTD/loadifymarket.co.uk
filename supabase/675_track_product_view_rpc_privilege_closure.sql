-- 675_track_product_view_rpc_privilege_closure.sql
-- Release-hardening RPC privilege closure.
--
-- track_product_view() is a SECURITY DEFINER write-side-effect function.
-- Repository and hosted dependency inspection found no runtime consumer,
-- RLS policy, trigger, view, or function dependency requiring direct
-- anon/authenticated execution.
--
-- Preserve the function for trusted server-side use while removing direct
-- PostgREST RPC exposure from ordinary API roles.

REVOKE ALL ON FUNCTION public.track_product_view(uuid, uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.track_product_view(uuid, uuid, text)
TO service_role;

-- Fail closed if ordinary API roles can still invoke this SECURITY DEFINER RPC.
DO $$
BEGIN
  IF has_function_privilege(
       'anon',
       'public.track_product_view(uuid,uuid,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.track_product_view(uuid,uuid,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION
      'track_product_view still exposes direct EXECUTE to ordinary API roles';
  END IF;

  IF NOT has_function_privilege(
       'service_role',
       'public.track_product_view(uuid,uuid,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION
      'track_product_view service_role execution privilege was not preserved';
  END IF;
END;
$$;
