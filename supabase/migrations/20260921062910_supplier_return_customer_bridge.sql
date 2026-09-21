ALTER TABLE public.returns
  ALTER COLUMN "sellerId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "commercialMode" text,
  ADD COLUMN IF NOT EXISTS "requestedQuantity" integer,
  ADD COLUMN IF NOT EXISTS "supplierReturnCaseId" uuid REFERENCES private.supplier_return_cases(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='returns_commercial_mode_identity_check'
      AND conrelid='public.returns'::regclass
  ) THEN
    ALTER TABLE public.returns
      ADD CONSTRAINT returns_commercial_mode_identity_check
      CHECK (
        ("commercialMode"='loadify_supplier_fulfilled' AND "sellerId" IS NULL)
        OR ("commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled' AND "sellerId" IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='returns_requested_quantity_check'
      AND conrelid='public.returns'::regclass
  ) THEN
    ALTER TABLE public.returns
      ADD CONSTRAINT returns_requested_quantity_check
      CHECK ("requestedQuantity" IS NULL OR "requestedQuantity" > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_returns_commercial_mode
  ON public.returns ("commercialMode");
CREATE INDEX IF NOT EXISTS idx_returns_supplier_case
  ON public.returns ("supplierReturnCaseId");

COMMENT ON COLUMN public.returns."commercialMode" IS
'Commercial identity of the customer return. loadify_supplier_fulfilled means Loadify is the seller of record and sellerId remains null.';

COMMENT ON COLUMN public.returns."supplierReturnCaseId" IS
'Optional link to supplier-side recovery/return truth. Buyer refund truth remains separate from supplier recovery truth.';
