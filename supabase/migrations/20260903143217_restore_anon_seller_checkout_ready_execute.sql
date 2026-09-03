-- Restore the intended anonymous execution boundary used by the public products RLS policy.
-- The helper is SECURITY DEFINER and returns only a boolean checkout-readiness decision.
-- This migration restores the privilege originally established by
-- 20260810130642_checkout_ready_seller_policy_helper.sql after later privilege hardening removed anon EXECUTE.

REVOKE ALL ON FUNCTION public.is_seller_checkout_ready(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_seller_checkout_ready(uuid) TO anon, authenticated, service_role;
