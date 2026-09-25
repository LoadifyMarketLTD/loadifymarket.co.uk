-- Supplier marketplace intermediary commercial-model control.
--
-- Canonical business model:
-- - Loadify is a marketplace/platform intermediary.
-- - Loadify does not own, warehouse, pre-purchase, or take title to supplier goods.
-- - The independent supplier is the seller of record for supplier marketplace goods.
-- - Checkout/payment remains fail-closed until a reviewed marketplace settlement
--   and legal identity model is evidenced for the market.
--
-- This migration is additive and does not rewrite historical paid orders.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_marketplace_commercial_controls (
  market_code text PRIMARY KEY,
  status text NOT NULL DEFAULT 'blocked',
  checkout_enabled boolean NOT NULL DEFAULT false,
  supplier_is_seller_of_record boolean NOT NULL DEFAULT true,
  loadify_owns_inventory boolean NOT NULL DEFAULT false,
  loadify_prepurchases_inventory boolean NOT NULL DEFAULT false,
  settlement_model text NOT NULL DEFAULT 'unconfigured',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_marketplace_control_market_check
    CHECK (market_code ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_marketplace_control_status_check
    CHECK (status IN ('blocked','verified','suspended')),
  CONSTRAINT supplier_marketplace_control_seller_check
    CHECK (supplier_is_seller_of_record = true),
  CONSTRAINT supplier_marketplace_control_inventory_owner_check
    CHECK (loadify_owns_inventory = false),
  CONSTRAINT supplier_marketplace_control_prepurchase_check
    CHECK (loadify_prepurchases_inventory = false),
  CONSTRAINT supplier_marketplace_control_settlement_check
    CHECK (settlement_model IN (
      'unconfigured',
      'stripe_connect_supplier',
      'platform_collection_as_agent'
    )),
  CONSTRAINT supplier_marketplace_control_reason_check
    CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_marketplace_control_verified_check
    CHECK (
      status <> 'verified'
      OR (
        checkout_enabled = true
        AND settlement_model <> 'unconfigured'
        AND evidence <> '{}'::jsonb
        AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
      )
    ),
  CONSTRAINT supplier_marketplace_control_checkout_check
    CHECK (NOT checkout_enabled OR status='verified')
);

INSERT INTO private.supplier_marketplace_commercial_controls(
  market_code,
  status,
  checkout_enabled,
  supplier_is_seller_of_record,
  loadify_owns_inventory,
  loadify_prepurchases_inventory,
  settlement_model,
  reason
) VALUES
  (
    'GB',
    'blocked',
    false,
    true,
    false,
    false,
    'unconfigured',
    'Supplier marketplace checkout blocked until independent-supplier seller-of-record and settlement evidence is reviewed'
  ),
  (
    'RO',
    'blocked',
    false,
    true,
    false,
    false,
    'unconfigured',
    'Romania supplier marketplace checkout remains prelaunch and requires reviewed intermediary settlement/legal evidence'
  )
ON CONFLICT (market_code) DO NOTHING;

REVOKE ALL ON TABLE private.supplier_marketplace_commercial_controls
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_marketplace_commercial_readiness_v1(
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'')));
  v_control private.supplier_marketplace_commercial_controls%ROWTYPE;
BEGIN
  IF v_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','invalid_market',
      'marketCode',v_market,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_control
  FROM private.supplier_marketplace_commercial_controls
  WHERE market_code=v_market;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_marketplace_commercial_control_missing',
      'marketCode',v_market,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',
      v_control.status='verified'
      AND v_control.checkout_enabled=true
      AND v_control.supplier_is_seller_of_record=true
      AND v_control.loadify_owns_inventory=false
      AND v_control.loadify_prepurchases_inventory=false
      AND v_control.settlement_model<>'unconfigured',
    'reason',v_control.reason,
    'marketCode',v_control.market_code,
    'status',v_control.status,
    'checkoutEnabled',v_control.checkout_enabled,
    'supplierIsSellerOfRecord',v_control.supplier_is_seller_of_record,
    'loadifyOwnsInventory',v_control.loadify_owns_inventory,
    'loadifyPrepurchasesInventory',v_control.loadify_prepurchases_inventory,
    'settlementModel',v_control.settlement_model,
    'reviewedAt',v_control.reviewed_at,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_marketplace_commercial_readiness_v1(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_marketplace_commercial_readiness_v1(text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_marketplace_identity_v1(
  p_supplier_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
BEGIN
  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=p_supplier_id
    AND lifecycle_status='approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','approved_supplier_identity_not_found',
      'supplierId',p_supplier_id,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','approved_supplier_identity',
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'displayName',v_supplier.display_name,
    'legalName',COALESCE(NULLIF(BTRIM(v_supplier.legal_name),''),v_supplier.display_name),
    'businessCountry',v_supplier.business_country,
    'sellerOfRecord',true,
    'inventoryOwner','supplier',
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_marketplace_identity_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_marketplace_identity_v1(uuid)
  TO service_role;

COMMENT ON TABLE private.supplier_marketplace_commercial_controls IS
  'Fail-closed supplier marketplace commercial-model gate. Loadify is a platform intermediary and may not own or pre-purchase supplier inventory.';

COMMENT ON FUNCTION public.server_supplier_marketplace_commercial_readiness_v1(text) IS
  'Service-role readiness gate for independent-supplier marketplace checkout. Defaults blocked until reviewed settlement/legal evidence exists.';

COMMENT ON FUNCTION public.server_supplier_marketplace_identity_v1(uuid) IS
  'Service-role approved supplier identity projection for buyer-facing seller-of-record disclosure.';
