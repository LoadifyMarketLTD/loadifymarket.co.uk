-- 671_identity_function_execute_privilege_closure.sql
-- Stage 2 hosted security closure.
--
-- Supabase production default privileges grant EXECUTE directly to anon and
-- authenticated for newly created public functions. REVOKE FROM PUBLIC alone
-- therefore does not remove those explicit grants. Close only the Stage 2
-- functions whose direct execution surface is not intended.

REVOKE ALL ON FUNCTION public.has_account_capability(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_account_capability(text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_seller()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_seller()
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_legacy_role_to_account_capabilities()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_legacy_role_to_account_capabilities()
  TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user_profile()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_profile()
  TO service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.has_account_capability(text)', 'EXECUTE') THEN
    RAISE EXCEPTION '671 privilege closure failed: anon can execute has_account_capability';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.has_account_capability(text)', 'EXECUTE') THEN
    RAISE EXCEPTION '671 privilege closure failed: authenticated cannot execute has_account_capability';
  END IF;

  IF has_function_privilege('anon', 'public.is_seller()', 'EXECUTE') THEN
    RAISE EXCEPTION '671 privilege closure failed: anon can execute is_seller';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.is_seller()', 'EXECUTE') THEN
    RAISE EXCEPTION '671 privilege closure failed: authenticated cannot execute is_seller';
  END IF;

  IF has_function_privilege('anon', 'public.sync_legacy_role_to_account_capabilities()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.sync_legacy_role_to_account_capabilities()', 'EXECUTE') THEN
    RAISE EXCEPTION '671 privilege closure failed: client role can execute legacy capability sync trigger helper';
  END IF;

  IF has_function_privilege('anon', 'public.handle_new_user_profile()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.handle_new_user_profile()', 'EXECUTE') THEN
    RAISE EXCEPTION '671 privilege closure failed: client role can execute profile trigger helper';
  END IF;
END $$;
;
