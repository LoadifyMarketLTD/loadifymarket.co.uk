-- Stage B: close the legacy browser-executable admin payout RPCs.
--
-- ROLLOUT ORDER (required for zero downtime):
--   1) apply 20260904223200_server_admin_payout_rpc_boundary;
--   2) deploy the Netlify/frontend change that uses admin-payout-action;
--   3) only then apply this closure migration.
--
-- Seller request_payout remains an authenticated seller contract and is not
-- modified here.

REVOKE ALL ON FUNCTION public.approve_payout(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_payout(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_payout(uuid, text)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.approve_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.complete_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.reject_payout(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.approve_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.complete_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.reject_payout(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy admin payout RPCs remain directly client-executable';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.server_admin_payout_action_v1(uuid,text,uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'server admin payout boundary is unavailable; closure aborted';
  END IF;
END;
$$;
