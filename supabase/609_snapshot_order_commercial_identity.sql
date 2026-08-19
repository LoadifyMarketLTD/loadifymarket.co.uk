-- 609_snapshot_order_commercial_identity.sql
--
-- Checkpoint A commercial-history integrity.
--
-- Orders currently preserve financial amounts/addresses, but several historical
-- consumers still resolve mutable product/profile data at read time. A seller or
-- buyer profile edit, product title/image edit, or listing-context edit can then
-- make an old order/invoice appear different from the facts used at checkout.
--
-- This migration creates explicit immutable snapshot fields for NEW verified
-- checkout flows. Legacy rows stay NULL unless a later repair can recover facts
-- from authoritative historical evidence. We never backfill from today's live
-- product/profile state and never turn an unknown historical fact into a guess.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "buyerNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "buyerEmailSnapshot" text,
  ADD COLUMN IF NOT EXISTS "buyerCompanyNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "buyerVatNumberSnapshot" text,
  ADD COLUMN IF NOT EXISTS "sellerBusinessNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "isB2BSnapshot" boolean,
  ADD COLUMN IF NOT EXISTS "reverseChargeSnapshot" boolean,
  ADD COLUMN IF NOT EXISTS "commercialSnapshotSource" text,
  ADD COLUMN IF NOT EXISTS "commercialSnapshotCapturedAt" timestamptz;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS "productTitleSnapshot" text,
  ADD COLUMN IF NOT EXISTS "productImageSnapshot" text,
  ADD COLUMN IF NOT EXISTS "listingContextSnapshot" text,
  ADD COLUMN IF NOT EXISTS "productSnapshotSource" text,
  ADD COLUMN IF NOT EXISTS "productSnapshotCapturedAt" timestamptz;

-- Snapshot-source vocabulary is intentionally small and auditable. The
-- payment_session_backfill value is reserved for a future evidence-backed repair;
-- this migration itself performs no speculative legacy backfill.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_commercial_snapshot_source_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_commercial_snapshot_source_check
      CHECK (
        "commercialSnapshotSource" IS NULL
        OR "commercialSnapshotSource" IN ('checkout_verified', 'payment_session_backfill')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_commercial_snapshot_coherence_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_commercial_snapshot_coherence_check
      CHECK (
        (
          "commercialSnapshotSource" IS NULL
          AND "commercialSnapshotCapturedAt" IS NULL
          AND "buyerNameSnapshot" IS NULL
          AND "buyerEmailSnapshot" IS NULL
          AND "buyerCompanyNameSnapshot" IS NULL
          AND "buyerVatNumberSnapshot" IS NULL
          AND "sellerBusinessNameSnapshot" IS NULL
          AND "isB2BSnapshot" IS NULL
          AND "reverseChargeSnapshot" IS NULL
        )
        OR (
          "commercialSnapshotSource" IS NOT NULL
          AND "commercialSnapshotCapturedAt" IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_reverse_charge_snapshot_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_reverse_charge_snapshot_check
      CHECK (
        COALESCE("reverseChargeSnapshot", false) = false
        OR "isB2BSnapshot" = true
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_product_snapshot_source_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_snapshot_source_check
      CHECK (
        "productSnapshotSource" IS NULL
        OR "productSnapshotSource" IN ('checkout_verified', 'payment_session_backfill')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_listing_context_snapshot_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_listing_context_snapshot_check
      CHECK (
        "listingContextSnapshot" IS NULL
        OR "listingContextSnapshot" IN ('product', 'service')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_product_snapshot_coherence_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_snapshot_coherence_check
      CHECK (
        (
          "productSnapshotSource" IS NULL
          AND "productSnapshotCapturedAt" IS NULL
          AND "productTitleSnapshot" IS NULL
          AND "productImageSnapshot" IS NULL
          AND "listingContextSnapshot" IS NULL
        )
        OR (
          "productSnapshotSource" IS NOT NULL
          AND "productSnapshotCapturedAt" IS NOT NULL
          AND NULLIF(BTRIM("productTitleSnapshot"), '') IS NOT NULL
          AND "listingContextSnapshot" IN ('product', 'service')
        )
      );
  END IF;
END;
$$;

-- Once a canonical order-level snapshot exists, no later service/admin/order
-- lifecycle update may rewrite it. Initial population from NULL is allowed so the
-- payment webhook can atomically materialise verified checkout evidence.
CREATE OR REPLACE FUNCTION private.protect_order_commercial_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF OLD."commercialSnapshotSource" IS NOT NULL THEN
    IF NEW."buyerNameSnapshot" IS DISTINCT FROM OLD."buyerNameSnapshot"
       OR NEW."buyerEmailSnapshot" IS DISTINCT FROM OLD."buyerEmailSnapshot"
       OR NEW."buyerCompanyNameSnapshot" IS DISTINCT FROM OLD."buyerCompanyNameSnapshot"
       OR NEW."buyerVatNumberSnapshot" IS DISTINCT FROM OLD."buyerVatNumberSnapshot"
       OR NEW."sellerBusinessNameSnapshot" IS DISTINCT FROM OLD."sellerBusinessNameSnapshot"
       OR NEW."isB2BSnapshot" IS DISTINCT FROM OLD."isB2BSnapshot"
       OR NEW."reverseChargeSnapshot" IS DISTINCT FROM OLD."reverseChargeSnapshot"
       OR NEW."commercialSnapshotSource" IS DISTINCT FROM OLD."commercialSnapshotSource"
       OR NEW."commercialSnapshotCapturedAt" IS DISTINCT FROM OLD."commercialSnapshotCapturedAt"
    THEN
      RAISE EXCEPTION 'order commercial snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_commercial_snapshot ON public.orders;
CREATE TRIGGER trg_protect_order_commercial_snapshot
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.protect_order_commercial_snapshot();

-- Product identity/context snapshots are likewise immutable after first capture.
CREATE OR REPLACE FUNCTION private.protect_order_item_product_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF OLD."productSnapshotSource" IS NOT NULL THEN
    IF NEW."productTitleSnapshot" IS DISTINCT FROM OLD."productTitleSnapshot"
       OR NEW."productImageSnapshot" IS DISTINCT FROM OLD."productImageSnapshot"
       OR NEW."listingContextSnapshot" IS DISTINCT FROM OLD."listingContextSnapshot"
       OR NEW."productSnapshotSource" IS DISTINCT FROM OLD."productSnapshotSource"
       OR NEW."productSnapshotCapturedAt" IS DISTINCT FROM OLD."productSnapshotCapturedAt"
    THEN
      RAISE EXCEPTION 'order item product snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_item_product_snapshot ON public.order_items;
CREATE TRIGGER trg_protect_order_item_product_snapshot
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION private.protect_order_item_product_snapshot();

-- RLS remains authoritative for row-level access. These non-row capabilities are
-- unnecessary for browser/mobile roles and are not protected by row policies.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.orders, public.order_items
  FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.orders."buyerNameSnapshot" IS
  'Immutable buyer display-name snapshot captured from verified server-side checkout identity; NULL on legacy rows without historical evidence.';
COMMENT ON COLUMN public.orders."buyerEmailSnapshot" IS
  'Immutable buyer email snapshot captured at verified checkout; NULL means historical value is unknown.';
COMMENT ON COLUMN public.orders."buyerCompanyNameSnapshot" IS
  'Immutable B2B company-name snapshot captured at checkout when applicable.';
COMMENT ON COLUMN public.orders."buyerVatNumberSnapshot" IS
  'Immutable buyer VAT-number snapshot captured at checkout when applicable; not inferred from later profile state.';
COMMENT ON COLUMN public.orders."sellerBusinessNameSnapshot" IS
  'Immutable seller business-name snapshot captured from the verified seller profile at checkout.';
COMMENT ON COLUMN public.orders."isB2BSnapshot" IS
  'Immutable checkout-time B2B classification used for historical presentation/tax treatment.';
COMMENT ON COLUMN public.orders."reverseChargeSnapshot" IS
  'Immutable checkout-time reverse-charge decision; true is only valid when isB2BSnapshot is true.';
COMMENT ON COLUMN public.orders."commercialSnapshotSource" IS
  'Evidence source for immutable order identity/tax snapshots. Legacy rows remain NULL unless factually recoverable.';
COMMENT ON COLUMN public.orders."commercialSnapshotCapturedAt" IS
  'Timestamp at which the immutable commercial snapshot was captured from authoritative evidence.';

COMMENT ON COLUMN public.order_items."productTitleSnapshot" IS
  'Immutable verified checkout-time product title. Historical consumers must not resolve a mutable live product title when this snapshot exists.';
COMMENT ON COLUMN public.order_items."productImageSnapshot" IS
  'Immutable verified checkout-time primary product image URL/path used for historical order presentation.';
COMMENT ON COLUMN public.order_items."listingContextSnapshot" IS
  'Immutable checkout-time product/service context used by historical fulfilment/payment rules.';
COMMENT ON COLUMN public.order_items."productSnapshotSource" IS
  'Evidence source for immutable product identity/context snapshots. Legacy rows remain NULL unless factually recoverable.';
COMMENT ON COLUMN public.order_items."productSnapshotCapturedAt" IS
  'Timestamp at which the immutable product snapshot was captured from authoritative evidence.';
