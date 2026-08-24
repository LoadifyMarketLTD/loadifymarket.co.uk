-- Consume a server-side rate-limit counter atomically.
--
-- The previous Netlify helper performed SELECT followed by INSERT/UPDATE.
-- Concurrent requests for the same identifier and fixed window could both
-- observe no row and race into the unique(identifier, windowEnd) constraint.

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_table_name TEXT,
  p_identifier TEXT,
  p_window_end TIMESTAMPTZ,
  p_max_attempts INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_attempts INTEGER;
BEGIN
  IF p_identifier IS NULL OR p_identifier = '' THEN
    RAISE EXCEPTION 'rate-limit identifier is required';
  END IF;

  IF p_window_end IS NULL THEN
    RAISE EXCEPTION 'rate-limit window end is required';
  END IF;

  IF p_max_attempts IS NULL OR p_max_attempts < 1 THEN
    RAISE EXCEPTION 'rate-limit maximum must be positive';
  END IF;

  IF p_table_name NOT IN (
    'admin_sellers_rate_limits',
    'connect_onboard_rate_limits',
    'create_checkout_rate_limits',
    'create_payment_intent_rate_limits',
    'create_product_rate_limits',
    'create_refund_rate_limits',
    'create_shipment_rate_limits',
    'csp_report_rate_limits',
    'delete_account_rate_limits',
    'email_rate_limits',
    'push_token_rate_limits',
    'register_rate_limits',
    'resend_verification_rate_limits',
    'rfq_rate_limits',
    'seller_order_status_rate_limits',
    'send_message_rate_limits',
    'track_shipment_rate_limits',
    'update_product_rate_limits',
    'update_shipment_status_rate_limits',
    'upload_proof_rate_limits'
  ) THEN
    RAISE EXCEPTION 'unsupported rate-limit table: %', p_table_name;
  END IF;

  EXECUTE pg_catalog.format(
    'INSERT INTO public.%I AS current_counter '
    || '(identifier, "windowEnd", attempts) VALUES ($1, $2, 1) '
    || 'ON CONFLICT (identifier, "windowEnd") DO UPDATE '
    || 'SET attempts = LEAST(current_counter.attempts + 1, $3 + 1) '
    || 'RETURNING attempts',
    p_table_name
  )
  INTO v_attempts
  USING p_identifier, p_window_end, p_max_attempts;

  RETURN pg_catalog.jsonb_build_object(
    'attempts', v_attempts,
    'exceeded', v_attempts > p_max_attempts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
