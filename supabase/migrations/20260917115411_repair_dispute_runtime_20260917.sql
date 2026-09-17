ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS "sellerResponse" text,
  ADD COLUMN IF NOT EXISTS "sellerRespondedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "escalatedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "resolvedAt" timestamptz;

ALTER TABLE public.disputes
  DROP CONSTRAINT IF EXISTS disputes_seller_response_length;

ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_seller_response_length
  CHECK (
    "sellerResponse" IS NULL
    OR char_length(btrim("sellerResponse")) BETWEEN 10 AND 4000
  );

CREATE OR REPLACE FUNCTION public.can_open_dispute(p_order_id uuid, p_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND o."buyerId" = auth.uid()
      AND o."sellerId" = p_seller_id
      AND o.status IN ('paid','packed','shipped','delivered','completed')
  );
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_dispute(
  p_dispute_id uuid,
  p_response text,
  p_evidence text[]
)
RETURNS public.disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_row public.disputes;
BEGIN
  IF auth.uid() IS NULL OR char_length(btrim(coalesce(p_response, ''))) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'A seller response between 10 and 4000 characters is required';
  END IF;

  SELECT * INTO v_row
  FROM public.disputes d
  WHERE d.id = p_dispute_id
    AND d."sellerId" = auth.uid()
    AND d.status IN ('open', 'in_review')
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Dispute is unavailable or cannot accept a seller response';
  END IF;

  IF NOT private.valid_case_evidence_paths(
    coalesce(p_evidence, ARRAY[]::text[]),
    auth.uid(),
    v_row."orderId",
    'seller-response'
  ) THEN
    RAISE EXCEPTION 'Invalid seller evidence paths';
  END IF;

  UPDATE public.disputes d
  SET "sellerResponse" = btrim(p_response),
      "sellerEvidence" = coalesce(p_evidence, ARRAY[]::text[]),
      "sellerRespondedAt" = now(),
      status = 'in_review'
  WHERE d.id = p_dispute_id
  RETURNING d.* INTO v_row;

  INSERT INTO public.notifications ("userId", type, title, message, link)
  VALUES (
    v_row."buyerId",
    'dispute',
    'Seller responded to your case',
    'The seller submitted a response and evidence. Review it in your order.',
    '/orders?mode=buy&orderId=' || v_row."orderId"::text
  );

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.escalate_dispute(p_dispute_id uuid)
RETURNS public.disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_row public.disputes;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.disputes d
  SET status = 'in_review',
      "escalatedAt" = coalesce(d."escalatedAt", now())
  WHERE d.id = p_dispute_id
    AND d."buyerId" = auth.uid()
    AND d.status IN ('open', 'in_review')
    AND (
      d."sellerResponse" IS NOT NULL
      OR now() >= coalesce(d."sellerResponseDeadline", d."createdAt" + interval '48 hours')
    )
  RETURNING d.* INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'The case cannot be escalated until the seller responds or the response deadline passes';
  END IF;

  INSERT INTO public.notifications ("userId", type, title, message, link)
  SELECT u.id,
         'dispute',
         'Dispute escalated for review',
         'A buyer escalated a marketplace dispute. Review the case evidence and order snapshot.',
         '/admin/disputes'
  FROM public.users u
  WHERE u.role = 'admin'
    AND u."isActive" = true;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.can_open_dispute(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_dispute(uuid, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.escalate_dispute(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_open_dispute(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_dispute(uuid, text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escalate_dispute(uuid) TO authenticated, service_role;
