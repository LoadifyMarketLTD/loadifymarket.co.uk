INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-evidence',
  'case-evidence',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "case evidence participant read" ON storage.objects;
CREATE POLICY "case evidence participant read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'case-evidence'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[3]
        AND auth.uid() IN (o."buyerId", o."sellerId")
    )
  )
);
DROP POLICY IF EXISTS "case evidence owner insert" ON storage.objects;
CREATE POLICY "case evidence owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] = 'orders'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[3]
      AND auth.uid() IN (o."buyerId", o."sellerId")
  )
);

DROP POLICY IF EXISTS "case evidence owner delete" ON storage.objects;
CREATE POLICY "case evidence owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS "sellerEvidence" text[] NOT NULL DEFAULT ARRAY[]::text[];
CREATE OR REPLACE FUNCTION private.valid_case_evidence_paths(
  p_paths text[],
  p_user_id uuid,
  p_order_id uuid,
  p_kind text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT coalesce(array_length(p_paths, 1), 0) <= 6
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(p_paths, ARRAY[]::text[])) AS evidence_path
      WHERE evidence_path !~ (
        '^' || p_user_id::text || '/orders/' || p_order_id::text || '/' ||
        p_kind || '/[0-9a-f-]+[.](jpg|png|webp)$'
      )
    );
$function$;

REVOKE ALL ON FUNCTION private.valid_case_evidence_paths(text[],uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
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

  SELECT * INTO v_row FROM public.disputes d
  WHERE d.id = p_dispute_id AND d."sellerId" = auth.uid()
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
REVOKE ALL ON FUNCTION public.respond_to_dispute(uuid,text,text[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_dispute(uuid,text,text[])
  TO authenticated;

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
      NEW."sellerEvidence" := ARRAY[]::text[];
      NEW."sellerRespondedAt" := NULL;
      NEW."escalatedAt" := NULL;
      NEW."sellerResponseDeadline" := now() + interval '48 hours';
      NEW."adminReviewDeadline" := now() + interval '5 days';
      NEW."createdAt" := now();

      IF NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = NEW."orderId"
          AND o."buyerId" = auth.uid()
          AND o."sellerId" = NEW."sellerId"
      ) THEN
        RAISE EXCEPTION 'Dispute order participants are invalid';
      END IF;
      IF NOT private.valid_case_evidence_paths(
        coalesce(NEW.images, ARRAY[]::text[]),
        auth.uid(),
        NEW."orderId",
        'dispute'
      ) THEN
        RAISE EXCEPTION 'Invalid buyer evidence paths';
      END IF;
    ELSE
      NEW."orderId" := OLD."orderId";
      NEW."buyerId" := OLD."buyerId";
      NEW."sellerId" := OLD."sellerId";
      NEW.subject := OLD.subject;
      NEW.description := OLD.description;
      NEW."protectionReason" := OLD."protectionReason";
      NEW.images := OLD.images;
      NEW.resolution := OLD.resolution;
      NEW."resolutionType" := OLD."resolutionType";
      NEW."refundAmount" := OLD."refundAmount";
      NEW."resolvedBy" := OLD."resolvedBy";
      NEW."sellerResponseDeadline" := OLD."sellerResponseDeadline";
      NEW."adminReviewDeadline" := OLD."adminReviewDeadline";
      NEW."escrowStatus" := OLD."escrowStatus";
      NEW."buyerAbuseFlagged" := OLD."buyerAbuseFlagged";
      NEW."createdAt" := OLD."createdAt";

      IF auth.uid() = OLD."sellerId"
         AND NEW."sellerResponse" IS DISTINCT FROM OLD."sellerResponse" THEN
        NEW.status := 'in_review';
        NEW."sellerRespondedAt" := now();
        NEW."escalatedAt" := OLD."escalatedAt";
      ELSIF auth.uid() = OLD."buyerId"
         AND NEW."escalatedAt" IS DISTINCT FROM OLD."escalatedAt" THEN
        NEW.status := 'in_review';
        NEW."sellerResponse" := OLD."sellerResponse";
        NEW."sellerEvidence" := OLD."sellerEvidence";
        NEW."sellerRespondedAt" := OLD."sellerRespondedAt";
      ELSE
        NEW.status := OLD.status;
        NEW."sellerResponse" := OLD."sellerResponse";
        NEW."sellerEvidence" := OLD."sellerEvidence";
        NEW."sellerRespondedAt" := OLD."sellerRespondedAt";
        NEW."escalatedAt" := OLD."escalatedAt";
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_dispute_system_fields()
  FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.disputes."sellerEvidence" IS
  'Immutable private evidence paths submitted with the latest seller response.';
COMMENT ON FUNCTION public.respond_to_dispute(uuid,text,text[]) IS
  'Seller response with validated private evidence paths and participant enforcement.';

CREATE OR REPLACE FUNCTION private.protect_return_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."buyerId" := auth.uid();
      NEW.status := 'requested';
      NEW."refundAmount" := NULL;
      NEW."buyerTrackingNumber" := NULL;
      NEW."buyerCarrier" := NULL;
      NEW."sellerTrackingNumber" := NULL;
      NEW."resolvedBy" := NULL;
      NEW."resolvedAt" := NULL;
      NEW."createdAt" := now();

      IF NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = NEW."orderId"
          AND o."buyerId" = auth.uid()
          AND o."sellerId" = NEW."sellerId"
      ) THEN
        RAISE EXCEPTION 'Return order participants are invalid';
      END IF;
      IF NOT private.valid_case_evidence_paths(
        coalesce(NEW.images, ARRAY[]::text[]),
        auth.uid(),
        NEW."orderId",
        'return'
      ) THEN
        RAISE EXCEPTION 'Invalid return evidence paths';
      END IF;
    ELSE
      NEW."orderId" := OLD."orderId";
      NEW."buyerId" := OLD."buyerId";
      NEW."sellerId" := OLD."sellerId";
      NEW.reason := OLD.reason;
      NEW.description := OLD.description;
      NEW.images := OLD.images;
      NEW."refundAmount" := OLD."refundAmount";
      NEW."sellerTrackingNumber" := OLD."sellerTrackingNumber";
      NEW."resolvedBy" := OLD."resolvedBy";
      NEW."resolvedAt" := OLD."resolvedAt";
      NEW."createdAt" := OLD."createdAt";

      IF auth.uid() = OLD."buyerId" AND OLD.status = 'approved' THEN
        NEW.status := OLD.status;
        NEW."buyerTrackingNumber" := NULLIF(btrim(NEW."buyerTrackingNumber"), '');
        NEW."buyerCarrier" := NULLIF(btrim(NEW."buyerCarrier"), '');
      ELSIF auth.uid() = OLD."sellerId" THEN
        NEW."buyerTrackingNumber" := OLD."buyerTrackingNumber";
        NEW."buyerCarrier" := OLD."buyerCarrier";
        IF OLD.status = 'requested' AND NEW.status IN ('approved', 'rejected') THEN
          NULL;
        ELSIF OLD.status = 'approved'
          AND NEW.status = 'received'
          AND OLD."buyerTrackingNumber" IS NOT NULL THEN
          NULL;
        ELSE
          NEW.status := OLD.status;
        END IF;
      ELSE
        NEW.status := OLD.status;
        NEW."buyerTrackingNumber" := OLD."buyerTrackingNumber";
        NEW."buyerCarrier" := OLD."buyerCarrier";
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_return_fields()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.notify_return_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'received' THEN
    INSERT INTO public.notifications ("userId", type, title, message, link)
    VALUES (
      NEW."buyerId",
      'return',
      'Returned item received',
      'The seller confirmed receipt. Your refund is now awaiting controlled processing.',
      '/orders?mode=buy&orderId=' || NEW."orderId"::text
    );
    INSERT INTO public.notifications ("userId", type, title, message, link)
    SELECT u.id,
      'return',
      'Return received - refund action required',
      'A returned item was confirmed received. Review the case before issuing the Stripe refund.',
      '/admin/orders'
    FROM public.users u
    WHERE u.role = 'admin' AND u."isActive" = true;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_return_received()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_return_received ON public.returns;
CREATE TRIGGER trg_notify_return_received
AFTER UPDATE OF status ON public.returns
FOR EACH ROW EXECUTE FUNCTION private.notify_return_received();
