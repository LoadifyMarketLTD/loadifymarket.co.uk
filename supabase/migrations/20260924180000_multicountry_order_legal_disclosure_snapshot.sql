-- Immutable legal/policy disclosure snapshots for multi-country orders.
-- This records what governed a transaction; it does not infer legal conclusions.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "legalDisclosureSnapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "legalDisclosureCapturedAt" timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_legal_disclosure_snapshot_object_check,
  ADD CONSTRAINT orders_legal_disclosure_snapshot_object_check
    CHECK (jsonb_typeof("legalDisclosureSnapshot")='object'),
  DROP CONSTRAINT IF EXISTS orders_ro_legal_disclosure_snapshot_check,
  ADD CONSTRAINT orders_ro_legal_disclosure_snapshot_check CHECK (
    "marketCode"<>'RO'
    OR (
      "legalDisclosureCapturedAt" IS NOT NULL
      AND NULLIF(BTRIM("legalDisclosureSnapshot"->>'marketCode'),'')='RO'
      AND NULLIF(BTRIM("legalDisclosureSnapshot"->>'locale'),'')='ro-RO'
      AND NULLIF(BTRIM("legalDisclosureSnapshot"->>'currency'),'')='RON'
      AND NULLIF(BTRIM("legalDisclosureSnapshot"->>'buyerTermsVersion'),'') IS NOT NULL
      AND NULLIF(BTRIM("legalDisclosureSnapshot"->>'privacyVersion'),'') IS NOT NULL
      AND NULLIF(BTRIM("legalDisclosureSnapshot"->>'returnsPolicyVersion'),'') IS NOT NULL
      AND NULLIF(BTRIM("legalDisclosureSnapshot"->>'sellerOfRecord'),'') IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.guard_order_legal_disclosure_immutable_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF OLD."legalDisclosureCapturedAt" IS NOT NULL
     AND (
       NEW."legalDisclosureSnapshot" IS DISTINCT FROM OLD."legalDisclosureSnapshot"
       OR NEW."legalDisclosureCapturedAt" IS DISTINCT FROM OLD."legalDisclosureCapturedAt"
     ) THEN
    RAISE EXCEPTION 'captured legal disclosure snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_legal_disclosure_immutable_v1 ON public.orders;
CREATE TRIGGER trg_guard_order_legal_disclosure_immutable_v1
BEFORE UPDATE OF "legalDisclosureSnapshot","legalDisclosureCapturedAt" ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_legal_disclosure_immutable_v1();

REVOKE ALL ON FUNCTION public.guard_order_legal_disclosure_immutable_v1()
  FROM PUBLIC,anon,authenticated;

COMMENT ON COLUMN public.orders."legalDisclosureSnapshot" IS
  'Immutable transaction-time legal/policy disclosure versions and market identity. RO orders must carry an explicit Romanian snapshot.';
