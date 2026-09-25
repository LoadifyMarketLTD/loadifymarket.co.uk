-- Future supplier marketplace order identity contract.
--
-- Defense in depth: even if an application endpoint or service-role caller
-- bypasses the HTTP commercial-readiness gate, a new supplier marketplace
-- order cannot be inserted under the legacy Loadify-as-seller snapshots.
--
-- Historical orders are not modified. This is an INSERT-only guard.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "supplierSellerIdSnapshot" uuid,
  ADD COLUMN IF NOT EXISTS "supplierSellerNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "supplierSettlementModelSnapshot" text,
  ADD COLUMN IF NOT EXISTS "marketplaceOperatorSnapshot" text,
  ADD COLUMN IF NOT EXISTS "supplierCommercialContractVersion" integer;

COMMENT ON COLUMN public.orders."supplierSellerIdSnapshot" IS
  'Independent supplier foundation identity snapshotted as seller of record for future supplier marketplace orders.';
COMMENT ON COLUMN public.orders."supplierSellerNameSnapshot" IS
  'Independent supplier legal/display name snapshotted as seller of record.';
COMMENT ON COLUMN public.orders."supplierSettlementModelSnapshot" IS
  'Reviewed supplier marketplace settlement model in force when the order was created.';
COMMENT ON COLUMN public.orders."marketplaceOperatorSnapshot" IS
  'Marketplace operator identity; this does not imply ownership of goods or seller-of-record status.';
COMMENT ON COLUMN public.orders."supplierCommercialContractVersion" IS
  'Supplier marketplace commercial contract version. Version 1 = independent supplier seller of record / Loadify intermediary.';

CREATE OR REPLACE FUNCTION private.guard_future_supplier_marketplace_order_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_projection private.supplier_marketplace_projections%ROWTYPE;
  v_control private.supplier_marketplace_commercial_controls%ROWTYPE;
  v_supplier_name text;
BEGIN
  IF NEW."commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled' THEN
    RETURN NEW;
  END IF;

  IF NEW."supplierOfferId" IS NULL OR NEW."supplierProjectionId" IS NULL THEN
    RAISE EXCEPTION 'supplier marketplace order requires supplier offer and projection identity';
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=NEW."supplierOfferId"
    AND status='approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approved supplier offer is required';
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=v_offer.supplier_id
    AND lifecycle_status='approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approved supplier seller identity is required';
  END IF;

  SELECT * INTO v_projection
  FROM private.supplier_marketplace_projections
  WHERE id=NEW."supplierProjectionId"
    AND supplier_offer_id=NEW."supplierOfferId"
    AND status='published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'published supplier marketplace projection is required';
  END IF;

  SELECT * INTO v_control
  FROM private.supplier_marketplace_commercial_controls
  WHERE market_code=v_projection.territory;

  IF NOT FOUND
     OR v_control.status<>'verified'
     OR v_control.checkout_enabled IS DISTINCT FROM true
     OR v_control.supplier_is_seller_of_record IS DISTINCT FROM true
     OR v_control.loadify_owns_inventory IS DISTINCT FROM false
     OR v_control.loadify_prepurchases_inventory IS DISTINCT FROM false
     OR v_control.settlement_model='unconfigured'
     OR v_control.reviewed_by IS NULL
     OR v_control.reviewed_at IS NULL
     OR v_control.evidence='{}'::jsonb THEN
    RAISE EXCEPTION 'supplier marketplace commercial model is not verified for market %',v_projection.territory;
  END IF;

  v_supplier_name:=COALESCE(
    NULLIF(BTRIM(v_supplier.legal_name),''),
    NULLIF(BTRIM(v_supplier.display_name),'')
  );

  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'supplier seller-of-record legal identity is missing';
  END IF;

  IF NEW."supplierSellerIdSnapshot" IS DISTINCT FROM v_supplier.id THEN
    RAISE EXCEPTION 'supplier seller identity snapshot does not match selected supplier';
  END IF;

  IF NULLIF(BTRIM(COALESCE(NEW."supplierSellerNameSnapshot",'')),'') IS DISTINCT FROM v_supplier_name THEN
    RAISE EXCEPTION 'supplier seller name snapshot does not match selected supplier';
  END IF;

  IF NULLIF(BTRIM(COALESCE(NEW."legalSellerIdentitySnapshot",'')),'') IS DISTINCT FROM v_supplier_name THEN
    RAISE EXCEPTION 'legal seller identity must be the independent supplier';
  END IF;

  IF NULLIF(BTRIM(COALESCE(NEW."invoiceIssuerSnapshot",'')),'') IS DISTINCT FROM v_supplier_name THEN
    RAISE EXCEPTION 'invoice issuer must be the independent supplier under marketplace contract v1';
  END IF;

  IF NEW."supplierSettlementModelSnapshot" IS DISTINCT FROM v_control.settlement_model THEN
    RAISE EXCEPTION 'supplier settlement model snapshot does not match reviewed control';
  END IF;

  IF NEW."marketplaceOperatorSnapshot" IS DISTINCT FROM 'Loadify Market' THEN
    RAISE EXCEPTION 'marketplace operator snapshot is required';
  END IF;

  IF NEW."supplierCommercialContractVersion" IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'supplier marketplace commercial contract version 1 is required';
  END IF;

  IF lower(COALESCE(NEW."legalSellerIdentitySnapshot",'')) LIKE '%loadify%'
     OR lower(COALESCE(NEW."legalSellerIdentitySnapshot",'')) LIKE '%xdrive logistics%' THEN
    RAISE EXCEPTION 'Loadify/XDrive cannot be snapshotted as seller of supplier marketplace goods';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_future_supplier_marketplace_order_v1
  ON public.orders;
CREATE TRIGGER trg_guard_future_supplier_marketplace_order_v1
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.guard_future_supplier_marketplace_order_v1();

REVOKE ALL ON FUNCTION private.guard_future_supplier_marketplace_order_v1()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.guard_future_supplier_marketplace_order_v1() IS
  'INSERT-only defense for future supplier marketplace orders. Independent supplier must be seller/invoice issuer and the reviewed intermediary settlement contract must be active. Historical orders are untouched.';
