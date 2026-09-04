-- Move privileged payout state mutations behind a service-role-only contract.
--
-- The browser previously invoked approve_payout / reject_payout / complete_payout
-- directly as an authenticated user. Those functions self-authorize with is_admin(),
-- but keeping privileged financial mutation RPCs directly executable by every
-- authenticated account unnecessarily widens the Data API surface.
--
-- The replacement RPC below is callable only by service_role. A Netlify Function
-- revalidates the caller against public.users as an active admin and passes that
-- verified actor id into this transaction boundary.

CREATE OR REPLACE FUNCTION public.server_admin_payout_action_v1(
  p_actor_id uuid,
  p_action text,
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_seller_id uuid;
  v_amount numeric(12,2);
  v_status text;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_actor_id
      AND u.role = 'admin'
      AND u."isActive" = TRUE
  ) THEN
    RAISE EXCEPTION 'server_admin_payout_action_v1: active admin actor required';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'server_admin_payout_action_v1: request id is required';
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      UPDATE public.payout_requests
         SET status = 'approved',
             "reviewedBy" = p_actor_id,
             "reviewedAt" = NOW()
       WHERE id = p_request_id
         AND status = 'requested';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'server_admin_payout_action_v1: request % not found or not in requested state', p_request_id;
      END IF;

      v_status := 'approved';

    WHEN 'complete' THEN
      SELECT "sellerId", amount
        INTO v_seller_id, v_amount
        FROM public.payout_requests
       WHERE id = p_request_id
         AND status = 'approved'
       FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'server_admin_payout_action_v1: request % not found or not in approved state', p_request_id;
      END IF;

      UPDATE public.payout_requests
         SET status = 'paid',
             "paidAt" = NOW()
       WHERE id = p_request_id;

      UPDATE public.seller_balance
         SET "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
             "updatedAt" = NOW()
       WHERE "sellerId" = v_seller_id;

      INSERT INTO public.payouts ("sellerId", amount, status, "paidAt")
      VALUES (v_seller_id, v_amount, 'paid', NOW());

      v_status := 'paid';

    WHEN 'reject' THEN
      SELECT "sellerId", amount
        INTO v_seller_id, v_amount
        FROM public.payout_requests
       WHERE id = p_request_id
         AND status IN ('requested', 'approved')
       FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'server_admin_payout_action_v1: request % not found or already processed', p_request_id;
      END IF;

      UPDATE public.payout_requests
         SET status = 'rejected',
             notes = COALESCE(p_notes, notes),
             "reviewedBy" = p_actor_id,
             "reviewedAt" = NOW()
       WHERE id = p_request_id;

      UPDATE public.seller_balance
         SET "availableAmount" = "availableAmount" + v_amount,
             "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
             "updatedAt" = NOW()
       WHERE "sellerId" = v_seller_id;

      v_status := 'rejected';

    ELSE
      RAISE EXCEPTION 'server_admin_payout_action_v1: unsupported action %', p_action;
  END CASE;

  INSERT INTO public.audit_logs (
    "actorId",
    action,
    "tableName",
    "recordId",
    "newData"
  ) VALUES (
    p_actor_id,
    'admin_payout_' || p_action,
    'payout_requests',
    p_request_id,
    CASE
      WHEN p_action = 'reject' THEN jsonb_build_object('status', v_status, 'notes', p_notes)
      ELSE jsonb_build_object('status', v_status)
    END
  );

  RETURN jsonb_build_object(
    'requestId', p_request_id,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_payout_action_v1(uuid, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_payout_action_v1(uuid, text, uuid, text)
  TO service_role;

-- Browser execution is no longer part of the admin payout contract.
REVOKE ALL ON FUNCTION public.approve_payout(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_payout(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_payout(uuid, text)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF has_function_privilege(
    'authenticated',
    'public.server_admin_payout_action_v1(uuid,text,uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.server_admin_payout_action_v1(uuid,text,uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'server admin payout RPC remains client-executable';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.server_admin_payout_action_v1(uuid,text,uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'server admin payout RPC is not executable by service_role';
  END IF;

  IF has_function_privilege('authenticated', 'public.approve_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.complete_payout(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.reject_payout(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy admin payout RPCs remain executable by authenticated';
  END IF;
END;
$$;
