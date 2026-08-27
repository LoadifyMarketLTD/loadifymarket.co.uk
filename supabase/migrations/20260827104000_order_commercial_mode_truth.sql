-- 677_order_commercial_mode_truth.sql
-- E2E remediation Stage 2: immutable commercial-mode order truth.
--
-- Adds the minimum order-time facts required by Gate B without creating a second
-- customer-order system. Existing marketplace orders remain valid as legacy rows
-- with NULL mode snapshots. Future Loadify-sale orders must not use a fake sellerId.
-- This migration does NOT enable Supplier Commerce or create any supplier/pilot data.

ALTER TABLE public.orders
  ALTER COLUMN "sellerId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "commercialModeSnapshot" text,
  ADD COLUMN IF NOT EXISTS "commercialModeSnapshotVersion" integer,
  ADD COLUMN IF NOT EXISTS "legalSellerRefSnapshot" text,
  ADD COLUMN IF NOT EXISTS "legalSellerNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "merchantOfRecordRefSnapshot" text,
  ADD COLUMN IF NOT EXISTS "merchantOfRecordNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "invoiceIssuerRefSnapshot" text,
  ADD COLUMN IF NOT EXISTS "invoiceIssuerNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "paymentRecipientRefSnapshot" text,
  ADD COLUMN IF NOT EXISTS "paymentRecipientNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "returnResponsibilitySnapshot" text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS "commercialModeSnapshot" text,
  ADD COLUMN IF NOT EXISTS "supplierCanonicalProductIdSnapshot" uuid REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierOfferIdSnapshot" uuid REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "supplierVariantRefSnapshot" text,
  ADD COLUMN IF NOT EXISTS "fulfillerTypeSnapshot" text;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_commercial_mode_snapshot_check,
  ADD CONSTRAINT orders_commercial_mode_snapshot_check CHECK (
    "commercialModeSnapshot" IS NULL
    OR "commercialModeSnapshot" IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')
  ),
  DROP CONSTRAINT IF EXISTS orders_commercial_mode_snapshot_shape_check,
  ADD CONSTRAINT orders_commercial_mode_snapshot_shape_check CHECK (
    (
      "commercialModeSnapshot" IS NULL
      AND "commercialModeSnapshotVersion" IS NULL
      AND "legalSellerRefSnapshot" IS NULL
      AND "legalSellerNameSnapshot" IS NULL
      AND "merchantOfRecordRefSnapshot" IS NULL
      AND "merchantOfRecordNameSnapshot" IS NULL
      AND "invoiceIssuerRefSnapshot" IS NULL
      AND "invoiceIssuerNameSnapshot" IS NULL
      AND "paymentRecipientRefSnapshot" IS NULL
      AND "paymentRecipientNameSnapshot" IS NULL
      AND "returnResponsibilitySnapshot" IS NULL
    )
    OR (
      "commercialModeSnapshot" IS NOT NULL
      AND "commercialModeSnapshotVersion" = 1
      AND "commercialSnapshotSource" IS NOT NULL
      AND "commercialSnapshotCapturedAt" IS NOT NULL
      AND NULLIF(BTRIM("legalSellerRefSnapshot"),'') IS NOT NULL
      AND NULLIF(BTRIM("legalSellerNameSnapshot"),'') IS NOT NULL
      AND NULLIF(BTRIM("merchantOfRecordRefSnapshot"),'') IS NOT NULL
      AND NULLIF(BTRIM("merchantOfRecordNameSnapshot"),'') IS NOT NULL
      AND NULLIF(BTRIM("invoiceIssuerRefSnapshot"),'') IS NOT NULL
      AND NULLIF(BTRIM("invoiceIssuerNameSnapshot"),'') IS NOT NULL
      AND NULLIF(BTRIM("paymentRecipientRefSnapshot"),'') IS NOT NULL
      AND NULLIF(BTRIM("paymentRecipientNameSnapshot"),'') IS NOT NULL
      AND "returnResponsibilitySnapshot" IN ('marketplace_seller','loadify')
    )
  ),
  DROP CONSTRAINT IF EXISTS orders_commercial_mode_seller_shape_check,
  ADD CONSTRAINT orders_commercial_mode_seller_shape_check CHECK (
    (
      "commercialModeSnapshot" IS NULL
      AND "sellerId" IS NOT NULL
    )
    OR (
      "commercialModeSnapshot"='marketplace_seller'
      AND "sellerId" IS NOT NULL
      AND "legalSellerRefSnapshot"="sellerId"::text
      AND "merchantOfRecordRefSnapshot"="legalSellerRefSnapshot"
      AND "invoiceIssuerRefSnapshot"="legalSellerRefSnapshot"
      AND "paymentRecipientRefSnapshot"="legalSellerRefSnapshot"
      AND "merchantOfRecordNameSnapshot"="legalSellerNameSnapshot"
      AND "invoiceIssuerNameSnapshot"="legalSellerNameSnapshot"
      AND "paymentRecipientNameSnapshot"="legalSellerNameSnapshot"
      AND "returnResponsibilitySnapshot"='marketplace_seller'
    )
    OR (
      "commercialModeSnapshot" IN ('loadify_supplier_fulfilled','loadify_direct')
      AND "sellerId" IS NULL
      AND "merchantOfRecordRefSnapshot"="legalSellerRefSnapshot"
      AND "invoiceIssuerRefSnapshot"="legalSellerRefSnapshot"
      AND "paymentRecipientRefSnapshot"="legalSellerRefSnapshot"
      AND "merchantOfRecordNameSnapshot"="legalSellerNameSnapshot"
      AND "invoiceIssuerNameSnapshot"="legalSellerNameSnapshot"
      AND "paymentRecipientNameSnapshot"="legalSellerNameSnapshot"
      AND "returnResponsibilitySnapshot"='loadify'
    )
  );

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_commercial_mode_snapshot_check,
  ADD CONSTRAINT order_items_commercial_mode_snapshot_check CHECK (
    "commercialModeSnapshot" IS NULL
    OR "commercialModeSnapshot" IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')
  ),
  DROP CONSTRAINT IF EXISTS order_items_supplier_route_snapshot_shape_check,
  ADD CONSTRAINT order_items_supplier_route_snapshot_shape_check CHECK (
    (
      "commercialModeSnapshot" IS NULL
      AND "supplierCanonicalProductIdSnapshot" IS NULL
      AND "supplierOfferIdSnapshot" IS NULL
      AND "supplierVariantRefSnapshot" IS NULL
      AND "fulfillerTypeSnapshot" IS NULL
    )
    OR (
      "commercialModeSnapshot"='marketplace_seller'
      AND "supplierCanonicalProductIdSnapshot" IS NULL
      AND "supplierOfferIdSnapshot" IS NULL
      AND "supplierVariantRefSnapshot" IS NULL
      AND "fulfillerTypeSnapshot"='marketplace_seller'
    )
    OR (
      "commercialModeSnapshot"='loadify_direct'
      AND "supplierCanonicalProductIdSnapshot" IS NULL
      AND "supplierOfferIdSnapshot" IS NULL
      AND "supplierVariantRefSnapshot" IS NULL
      AND "fulfillerTypeSnapshot"='loadify_direct'
    )
    OR (
      "commercialModeSnapshot"='loadify_supplier_fulfilled'
      AND "supplierCanonicalProductIdSnapshot" IS NOT NULL
      AND "supplierOfferIdSnapshot" IS NOT NULL
      AND "supplierVariantRefSnapshot" IS NOT NULL
      AND "fulfillerTypeSnapshot"='supplier'
    )
  );

CREATE INDEX IF NOT EXISTS orders_commercial_mode_snapshot_idx
  ON public.orders("commercialModeSnapshot","createdAt" DESC)
  WHERE "commercialModeSnapshot" IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_items_supplier_route_snapshot_idx
  ON public.order_items("supplierOfferIdSnapshot","supplierCanonicalProductIdSnapshot")
  WHERE "commercialModeSnapshot"='loadify_supplier_fulfilled';

CREATE OR REPLACE FUNCTION private.protect_order_commercial_mode_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW."commercialModeSnapshot" IS NOT NULL
       AND COALESCE(auth.jwt()->>'role','') IN ('anon','authenticated') THEN
      RAISE EXCEPTION 'order commercial mode snapshot may only be captured by the canonical server boundary';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."commercialModeSnapshot" IS NULL
     AND NEW."commercialModeSnapshot" IS NOT NULL THEN
    IF OLD."stripePaymentIntentId" IS NOT NULL THEN
      RAISE EXCEPTION 'historical paid order commercial mode may not be reconstructed after the fact';
    END IF;
    IF COALESCE(auth.jwt()->>'role','') IN ('anon','authenticated') THEN
      RAISE EXCEPTION 'order commercial mode snapshot may only be captured by the canonical server boundary';
    END IF;
  END IF;

  IF OLD."commercialModeSnapshot" IS NOT NULL THEN
    IF NEW."commercialModeSnapshot" IS DISTINCT FROM OLD."commercialModeSnapshot"
       OR NEW."commercialModeSnapshotVersion" IS DISTINCT FROM OLD."commercialModeSnapshotVersion"
       OR NEW."legalSellerRefSnapshot" IS DISTINCT FROM OLD."legalSellerRefSnapshot"
       OR NEW."legalSellerNameSnapshot" IS DISTINCT FROM OLD."legalSellerNameSnapshot"
       OR NEW."merchantOfRecordRefSnapshot" IS DISTINCT FROM OLD."merchantOfRecordRefSnapshot"
       OR NEW."merchantOfRecordNameSnapshot" IS DISTINCT FROM OLD."merchantOfRecordNameSnapshot"
       OR NEW."invoiceIssuerRefSnapshot" IS DISTINCT FROM OLD."invoiceIssuerRefSnapshot"
       OR NEW."invoiceIssuerNameSnapshot" IS DISTINCT FROM OLD."invoiceIssuerNameSnapshot"
       OR NEW."paymentRecipientRefSnapshot" IS DISTINCT FROM OLD."paymentRecipientRefSnapshot"
       OR NEW."paymentRecipientNameSnapshot" IS DISTINCT FROM OLD."paymentRecipientNameSnapshot"
       OR NEW."returnResponsibilitySnapshot" IS DISTINCT FROM OLD."returnResponsibilitySnapshot"
       OR NEW."sellerId" IS DISTINCT FROM OLD."sellerId"
    THEN
      RAISE EXCEPTION 'order commercial mode snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_order_commercial_mode_snapshot_v1()
  FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS trg_protect_order_commercial_mode_snapshot_v1 ON public.orders;
CREATE TRIGGER trg_protect_order_commercial_mode_snapshot_v1
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.protect_order_commercial_mode_snapshot_v1();

CREATE OR REPLACE FUNCTION private.protect_order_item_commercial_mode_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_parent_mode text;
  v_offer private.supplier_offers%ROWTYPE;
  v_link private.supplier_product_listing_links%ROWTYPE;
BEGIN
  SELECT o."commercialModeSnapshot" INTO v_parent_mode
    FROM public.orders o WHERE o.id=NEW."orderId";
  IF NOT FOUND THEN RAISE EXCEPTION 'canonical order required for commercial mode snapshot'; END IF;

  IF NEW."commercialModeSnapshot" IS DISTINCT FROM v_parent_mode THEN
    RAISE EXCEPTION 'order item commercial mode must match canonical order commercial mode';
  END IF;

  IF TG_OP='INSERT' AND NEW."commercialModeSnapshot" IS NOT NULL
     AND COALESCE(auth.jwt()->>'role','') IN ('anon','authenticated') THEN
    RAISE EXCEPTION 'order item commercial mode snapshot may only be captured by the canonical server boundary';
  END IF;

  IF NEW."commercialModeSnapshot"='loadify_supplier_fulfilled' THEN
    SELECT * INTO v_offer FROM private.supplier_offers WHERE id=NEW."supplierOfferIdSnapshot";
    IF NOT FOUND OR v_offer.canonical_product_id IS DISTINCT FROM NEW."supplierCanonicalProductIdSnapshot" THEN
      RAISE EXCEPTION 'order item supplier offer snapshot must match canonical supplier product snapshot';
    END IF;

    SELECT * INTO v_link
      FROM private.supplier_product_listing_links
     WHERE public_product_id=NEW."productId";
    IF NOT FOUND OR v_link.canonical_product_id IS DISTINCT FROM NEW."supplierCanonicalProductIdSnapshot" THEN
      RAISE EXCEPTION 'order item public product must map to supplier canonical product snapshot';
    END IF;
  END IF;

  IF TG_OP='UPDATE' AND OLD."commercialModeSnapshot" IS NULL
     AND NEW."commercialModeSnapshot" IS NOT NULL THEN
    RAISE EXCEPTION 'historical order item commercial mode may not be reconstructed after the fact';
  END IF;

  IF TG_OP='UPDATE' AND OLD."commercialModeSnapshot" IS NOT NULL THEN
    IF NEW."commercialModeSnapshot" IS DISTINCT FROM OLD."commercialModeSnapshot"
       OR NEW."supplierCanonicalProductIdSnapshot" IS DISTINCT FROM OLD."supplierCanonicalProductIdSnapshot"
       OR NEW."supplierOfferIdSnapshot" IS DISTINCT FROM OLD."supplierOfferIdSnapshot"
       OR NEW."supplierVariantRefSnapshot" IS DISTINCT FROM OLD."supplierVariantRefSnapshot"
       OR NEW."fulfillerTypeSnapshot" IS DISTINCT FROM OLD."fulfillerTypeSnapshot"
       OR NEW."productId" IS DISTINCT FROM OLD."productId"
    THEN
      RAISE EXCEPTION 'order item commercial mode/route snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_order_item_commercial_mode_snapshot_v1()
  FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS trg_protect_order_item_commercial_mode_snapshot_v1 ON public.order_items;
CREATE TRIGGER trg_protect_order_item_commercial_mode_snapshot_v1
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION private.protect_order_item_commercial_mode_snapshot_v1();

CREATE OR REPLACE FUNCTION public.server_order_commercial_mode_decision_v1(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ready',false,'reason','order_not_found','interfaceVersion',1);
  END IF;
  IF v_order."commercialModeSnapshot" IS NULL THEN
    RETURN jsonb_build_object('ready',false,'reason','commercial_mode_snapshot_missing','orderId',v_order.id,'interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'ready',true,'reason','commercial_mode_snapshot_ready','orderId',v_order.id,
    'commercialMode',v_order."commercialModeSnapshot",
    'snapshotVersion',v_order."commercialModeSnapshotVersion",
    'legalSellerRef',v_order."legalSellerRefSnapshot",'legalSellerName',v_order."legalSellerNameSnapshot",
    'merchantOfRecordRef',v_order."merchantOfRecordRefSnapshot",'merchantOfRecordName',v_order."merchantOfRecordNameSnapshot",
    'invoiceIssuerRef',v_order."invoiceIssuerRefSnapshot",'invoiceIssuerName',v_order."invoiceIssuerNameSnapshot",
    'paymentRecipientRef',v_order."paymentRecipientRefSnapshot",'paymentRecipientName',v_order."paymentRecipientNameSnapshot",
    'returnResponsibility',v_order."returnResponsibilitySnapshot",
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_order_commercial_mode_decision_v1(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_order_commercial_mode_decision_v1(uuid)
  TO service_role;

COMMENT ON COLUMN public.orders."commercialModeSnapshot" IS
  'Immutable Gate B order-time commercial mode. NULL means legacy/pre-remediation order; new Supplier Commerce checkout must persist one of the three canonical modes.';
COMMENT ON COLUMN public.order_items."supplierOfferIdSnapshot" IS
  'Immutable selected supplier offer identity for loadify_supplier_fulfilled order items; customer order truth remains public.orders/order_items.';
