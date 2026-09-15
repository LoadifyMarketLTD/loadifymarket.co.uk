ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS "sellerResponse" text,
  ADD COLUMN IF NOT EXISTS "sellerRespondedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "escalatedAt" timestamptz;

ALTER TABLE public.disputes
  DROP CONSTRAINT IF EXISTS disputes_seller_response_length;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_seller_response_length CHECK (
    "sellerResponse" IS NULL OR char_length(btrim("sellerResponse")) BETWEEN 10 AND 4000
  );

CREATE OR REPLACE FUNCTION public.respond_to_dispute(p_dispute_id uuid, p_response text)
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
  UPDATE public.disputes d
  SET "sellerResponse" = btrim(p_response), "sellerRespondedAt" = now(), status = 'in_review'
  WHERE d.id = p_dispute_id AND d."sellerId" = auth.uid() AND d.status IN ('open', 'in_review')
  RETURNING d.* INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Dispute is unavailable or cannot accept a seller response';
  END IF;
  INSERT INTO public.notifications ("userId", type, title, message, link)
  VALUES (v_row."buyerId", 'dispute', 'Seller responded to your case',
    'The seller submitted a response. Review it in your order and escalate if the issue is unresolved.',
    '/orders?mode=buy&orderId=' || v_row."orderId"::text);
  RETURN v_row;
END;
$function$;
REVOKE ALL ON FUNCTION public.respond_to_dispute(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_dispute(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.escalate_dispute(p_dispute_id uuid)
RETURNS public.disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_row public.disputes;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.disputes d
  SET status = 'in_review', "escalatedAt" = coalesce(d."escalatedAt", now())
  WHERE d.id = p_dispute_id AND d."buyerId" = auth.uid()
    AND d.status IN ('open', 'in_review')
    AND (d."sellerResponse" IS NOT NULL OR now() >= coalesce(d."sellerResponseDeadline", d."createdAt" + interval '48 hours'))
  RETURNING d.* INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'The case cannot be escalated until the seller responds or the response deadline passes';
  END IF;
  INSERT INTO public.notifications ("userId", type, title, message, link)
  SELECT u.id, 'dispute', 'Dispute escalated for review',
    'A buyer escalated a marketplace dispute. Review the case evidence and order snapshot.',
    '/admin/disputes'
  FROM public.users u WHERE u.role = 'admin' AND u."isActive" = true;
  RETURN v_row;
END;
$function$;
REVOKE ALL ON FUNCTION public.escalate_dispute(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escalate_dispute(uuid) TO authenticated;

COMMENT ON FUNCTION public.respond_to_dispute(uuid,text) IS
  'Seller-only dispute response transition with participant validation and buyer notification.';
COMMENT ON FUNCTION public.escalate_dispute(uuid) IS
  'Buyer-only escalation after seller response or the canonical 48-hour response deadline.';

CREATE OR REPLACE FUNCTION private.protect_dispute_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."buyerId" := auth.uid();
      NEW.status := 'open';
      NEW.resolution := NULL;
      NEW."resolutionType" := NULL;
      NEW."refundAmount" := NULL;
      NEW."resolvedBy" := NULL;
      NEW."escrowStatus" := 'held';
      NEW."buyerAbuseFlagged" := false;
      NEW."sellerResponse" := NULL;
      NEW."sellerRespondedAt" := NULL;
      NEW."escalatedAt" := NULL;
      NEW."sellerResponseDeadline" := now() + interval '48 hours';
      NEW."adminReviewDeadline" := now() + interval '5 days';
      NEW."createdAt" := now();
    ELSE
      NEW."orderId" := OLD."orderId";
      NEW."buyerId" := OLD."buyerId";
      NEW."sellerId" := OLD."sellerId";
      NEW.resolution := OLD.resolution;
      NEW."resolutionType" := OLD."resolutionType";
      NEW."refundAmount" := OLD."refundAmount";
      NEW."resolvedBy" := OLD."resolvedBy";
      NEW."sellerResponseDeadline" := OLD."sellerResponseDeadline";
      NEW."adminReviewDeadline" := OLD."adminReviewDeadline";
      NEW."escrowStatus" := OLD."escrowStatus";
      NEW."buyerAbuseFlagged" := OLD."buyerAbuseFlagged";
      NEW."createdAt" := OLD."createdAt";

      IF auth.uid() = OLD."sellerId" AND NEW."sellerResponse" IS DISTINCT FROM OLD."sellerResponse" THEN
        NEW.status := 'in_review';
        NEW."sellerRespondedAt" := now();
        NEW."escalatedAt" := OLD."escalatedAt";
      ELSIF auth.uid() = OLD."buyerId" AND NEW."escalatedAt" IS DISTINCT FROM OLD."escalatedAt" THEN
        NEW.status := 'in_review';
        NEW."sellerResponse" := OLD."sellerResponse";
        NEW."sellerRespondedAt" := OLD."sellerRespondedAt";
      ELSE
        NEW.status := OLD.status;
        NEW."sellerResponse" := OLD."sellerResponse";
        NEW."sellerRespondedAt" := OLD."sellerRespondedAt";
        NEW."escalatedAt" := OLD."escalatedAt";
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_dispute_system_fields() FROM PUBLIC, anon, authenticated;
