-- Close direct browser execution of legacy admin payout RPCs after the
-- authenticated Netlify admin-payout-action boundary is live in Production.
--
-- Production rollout evidence before this migration:
-- - main@13aebe6eadfc59389d9d490d0f3392c55f9c83e6 is published;
-- - admin-payout-action is deployed in the canonical Loadify Netlify site;
-- - unauthenticated GET reaches the function and returns Method not allowed;
-- - AdminPayouts no longer calls the legacy RPCs directly;
-- - service_role alone can execute server_admin_payout_action_v1.

REVOKE EXECUTE ON FUNCTION public.approve_payout(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_payout(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_payout(uuid, text) FROM authenticated;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.approve_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.complete_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.reject_payout(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy authenticated payout RPC execute privileges remain';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.server_admin_payout_action_v1(uuid,text,uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role cannot execute server_admin_payout_action_v1';
  END IF;
END $$;
