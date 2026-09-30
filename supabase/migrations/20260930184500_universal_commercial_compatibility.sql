-- Universal commercial compatibility contract.
-- Adds a provider-neutral role matrix so each supplier/market can use the
-- commercial model actually agreed, without supplier-specific code forks.
-- This migration is additive and does not enable checkout or mutate historical orders.

ALTER TABLE private.supplier_commercial_profiles
  ADD COLUMN IF NOT EXISTS seller_of_record_party text NOT NULL DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS invoice_issuer_party text NOT NULL DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS merchant_of_record_party text NOT NULL DEFAULT 'loadify',
  ADD COLUMN IF NOT EXISTS inventory_owner_party text NOT NULL DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS fulfilment_party text NOT NULL DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS customer_service_party text NOT NULL DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS role_bindings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE private.supplier_commercial_profiles
  DROP CONSTRAINT IF EXISTS supplier_commercial_profile_party_roles_check;
ALTER TABLE private.supplier_commercial_profiles
  ADD CONSTRAINT supplier_commercial_profile_party_roles_check CHECK (
    seller_of_record_party IN ('supplier','loadify','marketplace_seller','third_party')
    AND invoice_issuer_party IN ('supplier','loadify','marketplace_seller','third_party')
    AND merchant_of_record_party IN ('supplier','loadify','marketplace_seller','payment_platform','third_party')
    AND inventory_owner_party IN ('supplier','loadify','marketplace_seller','third_party')
    AND fulfilment_party IN ('supplier','loadify','marketplace_seller','third_party')
    AND customer_service_party IN ('supplier','loadify','marketplace_seller','shared','third_party')
    AND jsonb_typeof(role_bindings)='object'
  );

ALTER TABLE private.supplier_marketplace_commercial_controls
  ADD COLUMN IF NOT EXISTS adaptive_model_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_seller_of_record_parties text[] NOT NULL DEFAULT ARRAY['supplier']::text[],
  ADD COLUMN IF NOT EXISTS allowed_merchant_of_record_parties text[] NOT NULL DEFAULT ARRAY['loadify']::text[],
  ADD COLUMN IF NOT EXISTS allowed_settlement_models text[] NOT NULL DEFAULT ARRAY['stripe_connect_supplier','platform_collection_as_agent','manual_supplier_settlement']::text[];

-- Legacy market-wide ownership booleans remain meaningful only when the adaptive
-- compatibility engine is disabled. In adaptive mode, the reviewed per-supplier
-- commercial profile is the source of truth.
ALTER TABLE private.supplier_marketplace_commercial_controls
  DROP CONSTRAINT IF EXISTS supplier_marketplace_control_seller_check,
  DROP CONSTRAINT IF EXISTS supplier_marketplace_control_inventory_owner_check,
  DROP CONSTRAINT IF EXISTS supplier_marketplace_control_prepurchase_check;

ALTER TABLE private.supplier_marketplace_commercial_controls
  DROP CONSTRAINT IF EXISTS supplier_marketplace_control_legacy_model_check;
ALTER TABLE private.supplier_marketplace_commercial_controls
  ADD CONSTRAINT supplier_marketplace_control_legacy_model_check CHECK (
    adaptive_model_enabled
    OR (
      supplier_is_seller_of_record = true
      AND loadify_owns_inventory = false
      AND loadify_prepurchases_inventory = false
    )
  );
ALTER TABLE private.supplier_marketplace_commercial_controls
  DROP CONSTRAINT IF EXISTS supplier_marketplace_control_compatibility_roles_check;
ALTER TABLE private.supplier_marketplace_commercial_controls
  ADD CONSTRAINT supplier_marketplace_control_compatibility_roles_check CHECK (
    cardinality(allowed_seller_of_record_parties) BETWEEN 1 AND 8
    AND allowed_seller_of_record_parties <@ ARRAY['supplier','loadify','marketplace_seller','third_party']::text[]
    AND cardinality(allowed_merchant_of_record_parties) BETWEEN 1 AND 8
    AND allowed_merchant_of_record_parties <@ ARRAY['supplier','loadify','marketplace_seller','payment_platform','third_party']::text[]
    AND cardinality(allowed_settlement_models) BETWEEN 1 AND 8
    AND allowed_settlement_models <@ ARRAY['stripe_connect_supplier','platform_collection_as_agent','manual_supplier_settlement']::text[]
  );

-- Complete role matrix: payment, returns and cancellation authority are independent
-- from seller/invoice/merchant identity and are contract-configurable.
ALTER TABLE private.supplier_commercial_profiles
  ADD COLUMN IF NOT EXISTS payment_recipient_party text NOT NULL DEFAULT 'loadify',
  ADD COLUMN IF NOT EXISTS returns_authority_party text NOT NULL DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS cancellation_authority_party text NOT NULL DEFAULT 'shared';

ALTER TABLE private.supplier_commercial_profiles
  DROP CONSTRAINT IF EXISTS supplier_commercial_profile_extended_party_roles_check;
ALTER TABLE private.supplier_commercial_profiles
  ADD CONSTRAINT supplier_commercial_profile_extended_party_roles_check CHECK (
    payment_recipient_party IN ('supplier','loadify','marketplace_seller','payment_platform','third_party')
    AND returns_authority_party IN ('supplier','loadify','marketplace_seller','shared','third_party')
    AND cancellation_authority_party IN ('supplier','loadify','marketplace_seller','shared','third_party')
  );

ALTER TABLE private.supplier_marketplace_commercial_controls
  ADD COLUMN IF NOT EXISTS allowed_invoice_issuer_parties text[] NOT NULL DEFAULT ARRAY['supplier']::text[],
  ADD COLUMN IF NOT EXISTS allowed_payment_recipient_parties text[] NOT NULL DEFAULT ARRAY['loadify']::text[],
  ADD COLUMN IF NOT EXISTS allowed_inventory_owner_parties text[] NOT NULL DEFAULT ARRAY['supplier']::text[],
  ADD COLUMN IF NOT EXISTS allowed_fulfilment_parties text[] NOT NULL DEFAULT ARRAY['supplier']::text[],
  ADD COLUMN IF NOT EXISTS allowed_customer_service_parties text[] NOT NULL DEFAULT ARRAY['shared']::text[],
  ADD COLUMN IF NOT EXISTS allowed_returns_authority_parties text[] NOT NULL DEFAULT ARRAY['supplier']::text[],
  ADD COLUMN IF NOT EXISTS allowed_cancellation_authority_parties text[] NOT NULL DEFAULT ARRAY['shared']::text[];

ALTER TABLE private.supplier_marketplace_commercial_controls
  DROP CONSTRAINT IF EXISTS supplier_marketplace_control_extended_roles_check;
ALTER TABLE private.supplier_marketplace_commercial_controls
  ADD CONSTRAINT supplier_marketplace_control_extended_roles_check CHECK (
    cardinality(allowed_invoice_issuer_parties) BETWEEN 1 AND 8
    AND allowed_invoice_issuer_parties <@ ARRAY['supplier','loadify','marketplace_seller','third_party']::text[]
    AND cardinality(allowed_payment_recipient_parties) BETWEEN 1 AND 8
    AND allowed_payment_recipient_parties <@ ARRAY['supplier','loadify','marketplace_seller','payment_platform','third_party']::text[]
    AND cardinality(allowed_inventory_owner_parties) BETWEEN 1 AND 8
    AND allowed_inventory_owner_parties <@ ARRAY['supplier','loadify','marketplace_seller','third_party']::text[]
    AND cardinality(allowed_fulfilment_parties) BETWEEN 1 AND 8
    AND allowed_fulfilment_parties <@ ARRAY['supplier','loadify','marketplace_seller','third_party']::text[]
    AND cardinality(allowed_customer_service_parties) BETWEEN 1 AND 8
    AND allowed_customer_service_parties <@ ARRAY['supplier','loadify','marketplace_seller','shared','third_party']::text[]
    AND cardinality(allowed_returns_authority_parties) BETWEEN 1 AND 8
    AND allowed_returns_authority_parties <@ ARRAY['supplier','loadify','marketplace_seller','shared','third_party']::text[]
    AND cardinality(allowed_cancellation_authority_parties) BETWEEN 1 AND 8
    AND allowed_cancellation_authority_parties <@ ARRAY['supplier','loadify','marketplace_seller','shared','third_party']::text[]
  );

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "sellerOfRecordPartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "invoiceIssuerPartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "merchantOfRecordPartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "paymentRecipientPartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "inventoryOwnerPartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "fulfilmentPartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "customerServicePartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "returnsAuthorityPartySnapshot" text,
  ADD COLUMN IF NOT EXISTS "cancellationAuthorityPartySnapshot" text;

CREATE OR REPLACE FUNCTION private.resolve_supplier_commercial_party_identity_v2(
  p_party text,
  p_supplier private.supplier_foundation_suppliers,
  p_role_bindings jsonb,
  p_role text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_party text:=lower(BTRIM(COALESCE(p_party,'')));
  v_bindings jsonb:=COALESCE(p_role_bindings,'{}'::jsonb);
  v_role text:=BTRIM(COALESCE(p_role,''));
  v_name text;
BEGIN
  v_name:=CASE v_party
    WHEN 'supplier' THEN COALESCE(NULLIF(BTRIM(p_supplier.legal_name),''),NULLIF(BTRIM(p_supplier.display_name),''))
    WHEN 'loadify' THEN 'XDrive Logistics Ltd trading as Loadify Market'
    WHEN 'payment_platform' THEN COALESCE(NULLIF(BTRIM(v_bindings->>'paymentPlatformName'),''),'Stripe')
    WHEN 'marketplace_seller' THEN NULLIF(BTRIM(v_bindings->>'marketplaceSellerName'),'')
    WHEN 'third_party' THEN NULLIF(BTRIM(v_bindings->>(v_role || 'Name')),'')
    WHEN 'shared' THEN 'Shared responsibility under reviewed commercial contract'
    ELSE NULL
  END;
  RETURN v_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.server_supplier_commercial_compatibility_readiness_v2(
  p_supplier_id uuid,
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
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_seller_name text;
  v_invoice_name text;
  v_merchant_name text;
  v_payment_name text;
BEGIN
  IF p_supplier_id IS NULL OR v_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_commercial_compatibility_input','interfaceVersion',2);
  END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers
  WHERE id=p_supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','approved_supplier_not_found','supplierId',p_supplier_id,'marketCode',v_market,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_control FROM private.supplier_marketplace_commercial_controls WHERE market_code=v_market;
  IF NOT FOUND OR v_control.status<>'verified' OR v_control.checkout_enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','market_commercial_control_not_ready','supplierId',p_supplier_id,'marketCode',v_market,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_profile FROM private.supplier_commercial_profiles
  WHERE supplier_id=p_supplier_id AND market_code=v_market AND status='verified'
    AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now())
  ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','verified_supplier_commercial_profile_missing','supplierId',p_supplier_id,'marketCode',v_market,'interfaceVersion',2);
  END IF;

  IF NOT (v_profile.seller_of_record_party=ANY(v_control.allowed_seller_of_record_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','seller_of_record_model_not_allowed','sellerOfRecordParty',v_profile.seller_of_record_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.invoice_issuer_party=ANY(v_control.allowed_invoice_issuer_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','invoice_issuer_model_not_allowed','invoiceIssuerParty',v_profile.invoice_issuer_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.merchant_of_record_party=ANY(v_control.allowed_merchant_of_record_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','merchant_of_record_model_not_allowed','merchantOfRecordParty',v_profile.merchant_of_record_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.payment_recipient_party=ANY(v_control.allowed_payment_recipient_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','payment_recipient_model_not_allowed','paymentRecipientParty',v_profile.payment_recipient_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.inventory_owner_party=ANY(v_control.allowed_inventory_owner_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','inventory_owner_model_not_allowed','inventoryOwnerParty',v_profile.inventory_owner_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.fulfilment_party=ANY(v_control.allowed_fulfilment_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','fulfilment_model_not_allowed','fulfilmentParty',v_profile.fulfilment_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.customer_service_party=ANY(v_control.allowed_customer_service_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','customer_service_model_not_allowed','customerServiceParty',v_profile.customer_service_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.returns_authority_party=ANY(v_control.allowed_returns_authority_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','returns_authority_model_not_allowed','returnsAuthorityParty',v_profile.returns_authority_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.cancellation_authority_party=ANY(v_control.allowed_cancellation_authority_parties)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','cancellation_authority_model_not_allowed','cancellationAuthorityParty',v_profile.cancellation_authority_party,'interfaceVersion',2);
  END IF;
  IF NOT (v_profile.settlement_model=ANY(v_control.allowed_settlement_models)) THEN
    RETURN jsonb_build_object('eligible',false,'reason','settlement_model_not_allowed','settlementModel',v_profile.settlement_model,'interfaceVersion',2);
  END IF;

  v_seller_name:=private.resolve_supplier_commercial_party_identity_v2(v_profile.seller_of_record_party,v_supplier,v_profile.role_bindings,'sellerOfRecord');
  v_invoice_name:=private.resolve_supplier_commercial_party_identity_v2(v_profile.invoice_issuer_party,v_supplier,v_profile.role_bindings,'invoiceIssuer');
  v_merchant_name:=private.resolve_supplier_commercial_party_identity_v2(v_profile.merchant_of_record_party,v_supplier,v_profile.role_bindings,'merchantOfRecord');
  v_payment_name:=private.resolve_supplier_commercial_party_identity_v2(v_profile.payment_recipient_party,v_supplier,v_profile.role_bindings,'paymentRecipient');
  IF v_seller_name IS NULL OR v_invoice_name IS NULL OR v_merchant_name IS NULL OR v_payment_name IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','commercial_role_identity_binding_missing','interfaceVersion',2);
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_commercial_compatibility_ready',
    'supplierId',v_supplier.id,'supplierKey',v_supplier.supplier_key,'marketCode',v_market,
    'profileId',v_profile.id,'profileVersion',v_profile.version,
    'sellerOfRecordParty',v_profile.seller_of_record_party,'sellerOfRecordName',v_seller_name,
    'invoiceIssuerParty',v_profile.invoice_issuer_party,'invoiceIssuerName',v_invoice_name,
    'merchantOfRecordParty',v_profile.merchant_of_record_party,'merchantOfRecordName',v_merchant_name,
    'paymentRecipientParty',v_profile.payment_recipient_party,'paymentRecipientName',v_payment_name,
    'inventoryOwnerParty',v_profile.inventory_owner_party,
    'fulfilmentParty',v_profile.fulfilment_party,
    'customerServiceParty',v_profile.customer_service_party,
    'returnsAuthorityParty',v_profile.returns_authority_party,
    'cancellationAuthorityParty',v_profile.cancellation_authority_party,
    'settlementModel',v_profile.settlement_model,'pricingModel',v_profile.pricing_model,
    'roleBindings',v_profile.role_bindings,'interfaceVersion',2
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.server_supplier_marketplace_commercial_readiness_v1(p_market_code text)
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
    RETURN jsonb_build_object('eligible',false,'reason','invalid_market','marketCode',v_market,'interfaceVersion',2);
  END IF;
  SELECT * INTO v_control FROM private.supplier_marketplace_commercial_controls WHERE market_code=v_market;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_marketplace_commercial_control_missing','marketCode',v_market,'interfaceVersion',2);
  END IF;
  RETURN jsonb_build_object(
    'eligible',v_control.status='verified' AND v_control.checkout_enabled=true
      AND CASE WHEN v_control.adaptive_model_enabled THEN true ELSE
        v_control.supplier_is_seller_of_record=true AND v_control.loadify_owns_inventory=false
        AND v_control.loadify_prepurchases_inventory=false AND v_control.settlement_model<>'unconfigured' END,
    'reason',v_control.reason,'marketCode',v_control.market_code,'status',v_control.status,
    'checkoutEnabled',v_control.checkout_enabled,'adaptiveModelEnabled',v_control.adaptive_model_enabled,
    'settlementModel',v_control.settlement_model,
    'allowedSellerOfRecordParties',v_control.allowed_seller_of_record_parties,
    'allowedInvoiceIssuerParties',v_control.allowed_invoice_issuer_parties,
    'allowedMerchantOfRecordParties',v_control.allowed_merchant_of_record_parties,
    'allowedPaymentRecipientParties',v_control.allowed_payment_recipient_parties,
    'allowedInventoryOwnerParties',v_control.allowed_inventory_owner_parties,
    'allowedFulfilmentParties',v_control.allowed_fulfilment_parties,
    'allowedCustomerServiceParties',v_control.allowed_customer_service_parties,
    'allowedReturnsAuthorityParties',v_control.allowed_returns_authority_parties,
    'allowedCancellationAuthorityParties',v_control.allowed_cancellation_authority_parties,
    'allowedSettlementModels',v_control.allowed_settlement_models,
    'reviewedAt',v_control.reviewed_at,'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION private.resolve_supplier_commercial_party_identity_v2(text,private.supplier_foundation_suppliers,jsonb,text)
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.server_supplier_commercial_compatibility_readiness_v2(uuid,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commercial_compatibility_readiness_v2(uuid,text) TO service_role;

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
  v_compat jsonb;
BEGIN
  IF NEW."commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled' THEN RETURN NEW; END IF;
  IF NEW."supplierOfferId" IS NULL OR NEW."supplierProjectionId" IS NULL THEN
    RAISE EXCEPTION 'supplier marketplace order requires supplier offer and projection identity';
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers
  WHERE id=NEW."supplierOfferId" AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved supplier offer is required'; END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers
  WHERE id=v_offer.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved supplier commercial counterparty identity is required'; END IF;

  SELECT * INTO v_projection FROM private.supplier_marketplace_projections
  WHERE id=NEW."supplierProjectionId" AND supplier_offer_id=NEW."supplierOfferId" AND status='published';
  IF NOT FOUND THEN RAISE EXCEPTION 'published supplier marketplace projection is required'; END IF;

  SELECT * INTO v_control FROM private.supplier_marketplace_commercial_controls
  WHERE market_code=v_projection.territory;
  IF NOT FOUND OR v_control.status<>'verified' OR v_control.checkout_enabled IS DISTINCT FROM true
     OR v_control.reviewed_by IS NULL OR v_control.reviewed_at IS NULL OR v_control.evidence='{}'::jsonb THEN
    RAISE EXCEPTION 'supplier marketplace commercial model is not verified for market %',v_projection.territory;
  END IF;

  v_supplier_name:=COALESCE(NULLIF(BTRIM(v_supplier.legal_name),''),NULLIF(BTRIM(v_supplier.display_name),''));
  IF v_supplier_name IS NULL THEN RAISE EXCEPTION 'supplier commercial counterparty legal identity is missing'; END IF;
  IF NEW."supplierSellerIdSnapshot" IS DISTINCT FROM v_supplier.id THEN
    RAISE EXCEPTION 'supplier counterparty identity snapshot does not match selected supplier';
  END IF;
  IF NULLIF(BTRIM(COALESCE(NEW."supplierSellerNameSnapshot",'')),'') IS DISTINCT FROM v_supplier_name THEN
    RAISE EXCEPTION 'supplier counterparty name snapshot does not match selected supplier';
  END IF;

  IF NEW."supplierCommercialContractVersion"=1 THEN
    IF v_control.adaptive_model_enabled THEN
      RAISE EXCEPTION 'legacy commercial contract version cannot be used when adaptive commercial compatibility is enabled';
    END IF;
    IF NULLIF(BTRIM(COALESCE(NEW."legalSellerIdentitySnapshot",'')),'') IS DISTINCT FROM v_supplier_name
       OR NULLIF(BTRIM(COALESCE(NEW."invoiceIssuerSnapshot",'')),'') IS DISTINCT FROM v_supplier_name THEN
      RAISE EXCEPTION 'legacy supplier marketplace contract requires independent supplier seller and invoice issuer';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."supplierCommercialContractVersion" IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'supplier marketplace commercial contract version 2 is required for adaptable commercial roles';
  END IF;

  v_compat:=public.server_supplier_commercial_compatibility_readiness_v2(v_supplier.id,v_projection.territory);
  IF COALESCE((v_compat->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier commercial compatibility is not ready: %',COALESCE(v_compat->>'reason','unknown');
  END IF;

  IF NULLIF(BTRIM(COALESCE(NEW."legalSellerIdentitySnapshot",'')),'') IS DISTINCT FROM NULLIF(BTRIM(v_compat->>'sellerOfRecordName'),'') THEN
    RAISE EXCEPTION 'legal seller identity snapshot does not match reviewed commercial role contract';
  END IF;
  IF NULLIF(BTRIM(COALESCE(NEW."invoiceIssuerSnapshot",'')),'') IS DISTINCT FROM NULLIF(BTRIM(v_compat->>'invoiceIssuerName'),'') THEN
    RAISE EXCEPTION 'invoice issuer snapshot does not match reviewed commercial role contract';
  END IF;
  IF NULLIF(BTRIM(COALESCE(NEW."merchantOfRecordSnapshot",'')),'') IS DISTINCT FROM NULLIF(BTRIM(v_compat->>'merchantOfRecordName'),'') THEN
    RAISE EXCEPTION 'merchant of record snapshot does not match reviewed commercial role contract';
  END IF;
  IF NULLIF(BTRIM(COALESCE(NEW."paymentRecipientSnapshot",'')),'') IS DISTINCT FROM NULLIF(BTRIM(v_compat->>'paymentRecipientName'),'') THEN
    RAISE EXCEPTION 'payment recipient snapshot does not match reviewed commercial role contract';
  END IF;
  IF NEW."supplierSettlementModelSnapshot" IS DISTINCT FROM v_compat->>'settlementModel' THEN
    RAISE EXCEPTION 'supplier settlement model snapshot does not match reviewed commercial role contract';
  END IF;
  IF NEW."sellerOfRecordPartySnapshot" IS DISTINCT FROM v_compat->>'sellerOfRecordParty'
     OR NEW."invoiceIssuerPartySnapshot" IS DISTINCT FROM v_compat->>'invoiceIssuerParty'
     OR NEW."merchantOfRecordPartySnapshot" IS DISTINCT FROM v_compat->>'merchantOfRecordParty'
     OR NEW."paymentRecipientPartySnapshot" IS DISTINCT FROM v_compat->>'paymentRecipientParty'
     OR NEW."inventoryOwnerPartySnapshot" IS DISTINCT FROM v_compat->>'inventoryOwnerParty'
     OR NEW."fulfilmentPartySnapshot" IS DISTINCT FROM v_compat->>'fulfilmentParty'
     OR NEW."customerServicePartySnapshot" IS DISTINCT FROM v_compat->>'customerServiceParty'
     OR NEW."returnsAuthorityPartySnapshot" IS DISTINCT FROM v_compat->>'returnsAuthorityParty'
     OR NEW."cancellationAuthorityPartySnapshot" IS DISTINCT FROM v_compat->>'cancellationAuthorityParty' THEN
    RAISE EXCEPTION 'commercial role snapshots do not match reviewed commercial compatibility profile';
  END IF;
  IF NEW."marketplaceOperatorSnapshot" IS DISTINCT FROM 'Loadify Market' THEN
    RAISE EXCEPTION 'marketplace operator snapshot is required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_checkout_selected_offer_v2(
  p_buyer_id uuid,
  p_projection_id uuid,
  p_supplier_offer_id uuid,
  p_quantity integer,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_reservation_key text,
  p_orchestration_idempotency_key text,
  p_correlation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_projection private.supplier_marketplace_projections%ROWTYPE;
  v_binding private.supplier_projection_offer_bindings%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_catalog_item private.supplier_catalog_items%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_buyer public.users%ROWTYPE;
  v_order_id uuid;
  v_order_item_id uuid;
  v_reservation jsonb;
  v_compat jsonb;
  v_supplier_name text;
  v_subtotal numeric(12,2);
  v_tax numeric(12,2);
  v_shipping numeric(12,2);
  v_total numeric(12,2);
BEGIN
  IF p_buyer_id IS NULL OR p_projection_id IS NULL OR p_supplier_offer_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'buyer, projection, selected offer and correlation identity are required';
  END IF;
  IF p_quantity IS NULL OR p_quantity<1 OR p_quantity>100 THEN
    RAISE EXCEPTION 'supplier checkout quantity must be between 1 and 100';
  END IF;
  IF COALESCE(BTRIM(p_reservation_key),'')='' OR COALESCE(BTRIM(p_orchestration_idempotency_key),'')='' THEN
    RAISE EXCEPTION 'checkout idempotency keys are required';
  END IF;
  IF jsonb_typeof(COALESCE(p_shipping_address,'{}'::jsonb))<>'object'
     OR jsonb_typeof(COALESCE(p_billing_address,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'checkout addresses must be JSON objects';
  END IF;

  SELECT * INTO v_buyer FROM public.users
  WHERE id=p_buyer_id AND role='buyer' AND "isActive"=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'active buyer identity is required'; END IF;

  SELECT * INTO v_projection FROM private.supplier_marketplace_projections
  WHERE id=p_projection_id AND status='published' AND commercial_mode='loadify_supplier_fulfilled' AND territory='GB'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'published supplier projection is required'; END IF;

  SELECT * INTO v_binding FROM private.supplier_projection_offer_bindings
  WHERE projection_id=v_projection.id AND supplier_offer_id=p_supplier_offer_id AND status='approved'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'selected supplier offer is not approved for this projection'; END IF;

  SELECT * INTO v_offer FROM private.supplier_offers
  WHERE id=p_supplier_offer_id AND canonical_product_id=v_projection.canonical_product_id
    AND territory=v_projection.territory AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'selected supplier offer is not interchangeable for this projection'; END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers
  WHERE id=v_offer.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved supplier commercial counterparty is required'; END IF;
  v_supplier_name:=COALESCE(NULLIF(BTRIM(v_supplier.legal_name),''),NULLIF(BTRIM(v_supplier.display_name),''));
  IF v_supplier_name IS NULL THEN RAISE EXCEPTION 'supplier legal/display name is required'; END IF;

  v_compat:=public.server_supplier_commercial_compatibility_readiness_v2(v_supplier.id,v_projection.territory);
  IF COALESCE((v_compat->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier commercial compatibility is not ready: %',COALESCE(v_compat->>'reason','unknown');
  END IF;

  SELECT * INTO v_profile FROM private.supplier_commercial_profiles
  WHERE id=(v_compat->>'profileId')::uuid AND supplier_id=v_supplier.id
    AND market_code=v_projection.territory AND version=(v_compat->>'profileVersion')::integer
    AND status='verified' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now());
  IF NOT FOUND THEN RAISE EXCEPTION 'verified supplier commercial profile is required'; END IF;

  SELECT * INTO v_catalog_item FROM private.supplier_catalog_items
  WHERE id=v_offer.supplier_catalog_item_id AND supplier_id=v_offer.supplier_id;
  IF NOT FOUND OR NULLIF(BTRIM(COALESCE(v_catalog_item.external_variant_ref,'')),'') IS NULL THEN
    RAISE EXCEPTION 'selected supplier offer variant identity is unavailable';
  END IF;

  SELECT * INTO v_price FROM private.supplier_pricing_snapshots
  WHERE id=(SELECT NULLIF(public.server_supplier_commercial_decision_v1(
      v_offer.id,v_projection.canonical_product_id,'loadify_supplier_fulfilled',v_projection.territory
    )->>'pricingSnapshotId','')::uuid)
    AND supplier_offer_id=v_offer.id AND canonical_product_id=v_projection.canonical_product_id
    AND status='approved' AND commercial_mode='loadify_supplier_fulfilled';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved selected-offer pricing snapshot is required'; END IF;
  IF v_profile.settlement_currency<>v_price.currency THEN
    RAISE EXCEPTION 'supplier settlement currency does not match checkout pricing currency';
  END IF;

  v_subtotal:=ROUND(((v_price.merchandise_amount+v_price.mandatory_fee_amount)*p_quantity)::numeric,2);
  v_tax:=ROUND((v_price.tax_amount*p_quantity)::numeric,2);
  v_shipping:=ROUND((v_price.customer_shipping_charge*p_quantity)::numeric,2);
  v_total:=ROUND((v_price.gross_customer_price*p_quantity)::numeric,2);

  INSERT INTO public.orders(
    "buyerId","sellerId","productId",quantity,subtotal,"vatAmount","shippingAmount",total,
    commission,status,"escrowStatus","shippingAddress","billingAddress",
    "commercialMode","canonicalProductId","supplierOfferId","supplierCatalogItemId",
    "supplierProjectionId","pricingSnapshotId","supplierExternalVariantRefSnapshot",
    "legalSellerIdentitySnapshot","merchantOfRecordSnapshot","invoiceIssuerSnapshot","paymentRecipientSnapshot",
    "supplierSellerIdSnapshot","supplierSellerNameSnapshot","supplierSettlementModelSnapshot",
    "marketplaceOperatorSnapshot","supplierCommercialContractVersion",
    "supplierCommercialProfileIdSnapshot","supplierCommercialProfileVersionSnapshot",
    "sellerOfRecordPartySnapshot","invoiceIssuerPartySnapshot","merchantOfRecordPartySnapshot",
    "paymentRecipientPartySnapshot","inventoryOwnerPartySnapshot","fulfilmentPartySnapshot",
    "customerServicePartySnapshot","returnsAuthorityPartySnapshot","cancellationAuthorityPartySnapshot"
  ) VALUES(
    p_buyer_id,NULL,NULL,p_quantity,v_subtotal,v_tax,v_shipping,v_total,
    0,'awaiting_payment','held',COALESCE(p_shipping_address,'{}'::jsonb),COALESCE(p_billing_address,'{}'::jsonb),
    'loadify_supplier_fulfilled',v_projection.canonical_product_id,v_offer.id,v_offer.supplier_catalog_item_id,
    v_projection.id,v_price.id,v_catalog_item.external_variant_ref,
    v_compat->>'sellerOfRecordName',v_compat->>'merchantOfRecordName',v_compat->>'invoiceIssuerName',v_compat->>'paymentRecipientName',
    v_supplier.id,v_supplier_name,v_compat->>'settlementModel',
    'Loadify Market',2,v_profile.id,v_profile.version,
    v_compat->>'sellerOfRecordParty',v_compat->>'invoiceIssuerParty',v_compat->>'merchantOfRecordParty',
    v_compat->>'paymentRecipientParty',v_compat->>'inventoryOwnerParty',v_compat->>'fulfilmentParty',
    v_compat->>'customerServiceParty',v_compat->>'returnsAuthorityParty',v_compat->>'cancellationAuthorityParty'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items(
    "orderId","productId",quantity,"pricePerUnit","vatRate",subtotal,
    "canonicalProductId","supplierOfferId","pricingSnapshotId",
    "productTitleSnapshot","listingContextSnapshot","productSnapshotSource","productSnapshotCapturedAt"
  ) VALUES(
    v_order_id,NULL,p_quantity,ROUND((v_subtotal/p_quantity)::numeric,2),0,v_subtotal,
    v_projection.canonical_product_id,v_offer.id,v_price.id,
    COALESCE(NULLIF(BTRIM(v_projection.projection_payload->>'title'),''),'Loadify supplier product'),
    'product','checkout_verified',now()
  ) RETURNING id INTO v_order_item_id;

  v_reservation:=public.server_reserve_supplier_offer_v1(
    v_order_id,v_order_item_id,v_offer.id,'loadify_supplier_fulfilled',p_quantity,v_projection.territory,
    v_catalog_item.external_variant_ref,BTRIM(p_reservation_key),BTRIM(p_orchestration_idempotency_key),
    p_correlation_id,'{}'::jsonb,'supplier_commerce_default',30
  );
  IF COALESCE((v_reservation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'selected supplier reservation failed: %',COALESCE(v_reservation->>'reason','unknown');
  END IF;

  RETURN jsonb_build_object(
    'ok',true,'orderId',v_order_id,'orderItemId',v_order_item_id,
    'projectionId',v_projection.id,'supplierOfferId',v_offer.id,
    'supplierCatalogItemId',v_offer.supplier_catalog_item_id,
    'supplierExternalVariantRef',v_catalog_item.external_variant_ref,
    'pricingSnapshotId',v_price.id,'amount',v_total,'currency',v_price.currency,
    'reservation',v_reservation,'marketplaceOperator','Loadify Market',
    'sellerOfRecordParty',v_compat->>'sellerOfRecordParty','sellerOfRecord',v_compat->>'sellerOfRecordName',
    'invoiceIssuerParty',v_compat->>'invoiceIssuerParty','invoiceIssuer',v_compat->>'invoiceIssuerName',
    'merchantOfRecordParty',v_compat->>'merchantOfRecordParty','merchantOfRecord',v_compat->>'merchantOfRecordName',
    'paymentRecipientParty',v_compat->>'paymentRecipientParty','paymentRecipient',v_compat->>'paymentRecipientName',
    'inventoryOwnerParty',v_compat->>'inventoryOwnerParty','fulfilmentParty',v_compat->>'fulfilmentParty',
    'customerServiceParty',v_compat->>'customerServiceParty','returnsAuthorityParty',v_compat->>'returnsAuthorityParty',
    'cancellationAuthorityParty',v_compat->>'cancellationAuthorityParty',
    'supplierCommercialProfileId',v_profile.id,'supplierCommercialProfileVersion',v_profile.version,
    'supplierSettlementModel',v_profile.settlement_model,'commercialContractVersion',2,
    'offerSelectedBy','provider_neutral_selection_v1','paymentSessionCreated',false,'interfaceVersion',3
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v2(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v2(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) TO service_role;

COMMENT ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v2(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) IS 'Creates supplier-commerce orders from a reviewed configurable commercial role contract. Seller, invoice issuer, merchant/payment recipient, inventory owner, fulfilment and service roles are snapshotted independently. No provider order or payment is created here.';

-- Admin governance: configure commercial compatibility without direct private-table writes.
-- Creating/verifying a profile does not enable market checkout or Supplier Commerce controls.
CREATE OR REPLACE FUNCTION public.server_admin_supplier_commercial_compatibility_v2(
  p_actor_id uuid,
  p_action text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action text:=lower(BTRIM(COALESCE(p_action,'')));
  v_payload jsonb:=COALESCE(p_payload,'{}'::jsonb);
  v_supplier_id uuid;
  v_profile_id uuid;
  v_market text;
  v_version integer;
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_control private.supplier_marketplace_commercial_controls%ROWTYPE;
  v_evidence jsonb;
  v_arr text[];
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'payload must be an object'; END IF;

  IF v_action='create_profile_draft' THEN
    v_supplier_id:=NULLIF(v_payload->>'supplierId','')::uuid;
    v_market:=upper(BTRIM(COALESCE(v_payload->>'marketCode','')));
    IF v_supplier_id IS NULL OR v_market !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'supplierId and valid marketCode are required';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM private.supplier_foundation_suppliers WHERE id=v_supplier_id) THEN
      RAISE EXCEPTION 'supplier not found';
    END IF;
    IF NULLIF(BTRIM(v_payload->>'pricingModel'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'settlementModel'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'settlementTrigger'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'supplierPayableBasis'),'') IS NULL
       OR NULLIF(BTRIM(v_payload->>'reason'),'') IS NULL THEN
      RAISE EXCEPTION 'pricingModel, settlementModel, settlementTrigger, supplierPayableBasis and reason are required';
    END IF;

    SELECT COALESCE(MAX(version),0)+1 INTO v_version
    FROM private.supplier_commercial_profiles
    WHERE supplier_id=v_supplier_id AND market_code=v_market;

    INSERT INTO private.supplier_commercial_profiles(
      supplier_id,market_code,version,status,
      pricing_model,supplier_price_basis,supplier_price_floor,supplier_recommended_retail,supplier_fixed_retail,
      loadify_may_set_retail,supplier_approval_required_for_retail,
      platform_commission_type,platform_commission_value,platform_commission_effective_until,
      processor_fee_payer,connect_fee_payer,payout_fee_payer,
      settlement_model,settlement_trigger,settlement_minimum_amount,settlement_currency,
      supplier_payable_basis,supplier_payable_fixed_amount,supplier_payable_formula,settlement_schedule,
      change_of_mind_return_postage_payer,faulty_item_return_postage_payer,wrong_item_return_postage_payer,
      damaged_in_fulfilment_postage_payer,pre_dispatch_cancellation_cost_payer,post_dispatch_cancellation_cost_payer,
      chargeback_allocation_model,platform_error_cost_payer,
      manual_ordering_allowed,electronic_ordering_allowed,tracking_required,returns_supported,
      seller_of_record_party,invoice_issuer_party,merchant_of_record_party,payment_recipient_party,
      inventory_owner_party,fulfilment_party,customer_service_party,returns_authority_party,cancellation_authority_party,
      role_bindings,evidence,reason
    ) VALUES(
      v_supplier_id,v_market,v_version,'draft',
      BTRIM(v_payload->>'pricingModel'),COALESCE(NULLIF(BTRIM(v_payload->>'supplierPriceBasis'),''),'trade_price'),
      NULLIF(v_payload->>'supplierPriceFloor','')::numeric,NULLIF(v_payload->>'supplierRecommendedRetail','')::numeric,NULLIF(v_payload->>'supplierFixedRetail','')::numeric,
      COALESCE(NULLIF(v_payload->>'loadifyMaySetRetail','')::boolean,false),COALESCE(NULLIF(v_payload->>'supplierApprovalRequiredForRetail','')::boolean,true),
      COALESCE(NULLIF(BTRIM(v_payload->>'platformCommissionType'),''),'percentage'),COALESCE(NULLIF(v_payload->>'platformCommissionValue','')::numeric,0),
      NULLIF(v_payload->>'platformCommissionEffectiveUntil','')::timestamptz,
      COALESCE(NULLIF(BTRIM(v_payload->>'processorFeePayer'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'connectFeePayer'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'payoutFeePayer'),''),'supplier'),
      BTRIM(v_payload->>'settlementModel'),BTRIM(v_payload->>'settlementTrigger'),COALESCE(NULLIF(v_payload->>'settlementMinimumAmount','')::numeric,0),COALESCE(NULLIF(BTRIM(v_payload->>'settlementCurrency'),''),'GBP'),
      BTRIM(v_payload->>'supplierPayableBasis'),NULLIF(v_payload->>'supplierPayableFixedAmount','')::numeric,v_payload->'supplierPayableFormula',NULLIF(BTRIM(v_payload->>'settlementSchedule'),''),
      COALESCE(NULLIF(BTRIM(v_payload->>'changeOfMindReturnPostagePayer'),''),'buyer_when_lawful'),COALESCE(NULLIF(BTRIM(v_payload->>'faultyItemReturnPostagePayer'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'wrongItemReturnPostagePayer'),''),'supplier'),
      COALESCE(NULLIF(BTRIM(v_payload->>'damagedInFulfilmentPostagePayer'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'preDispatchCancellationCostPayer'),''),'supplier_if_cost_incurred'),COALESCE(NULLIF(BTRIM(v_payload->>'postDispatchCancellationCostPayer'),''),'buyer_when_lawful'),
      COALESCE(NULLIF(BTRIM(v_payload->>'chargebackAllocationModel'),''),'evidence_attribution'),'loadify',
      COALESCE(NULLIF(v_payload->>'manualOrderingAllowed','')::boolean,true),COALESCE(NULLIF(v_payload->>'electronicOrderingAllowed','')::boolean,false),COALESCE(NULLIF(v_payload->>'trackingRequired','')::boolean,true),COALESCE(NULLIF(v_payload->>'returnsSupported','')::boolean,true),
      COALESCE(NULLIF(BTRIM(v_payload->>'sellerOfRecordParty'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'invoiceIssuerParty'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'merchantOfRecordParty'),''),'loadify'),COALESCE(NULLIF(BTRIM(v_payload->>'paymentRecipientParty'),''),'loadify'),
      COALESCE(NULLIF(BTRIM(v_payload->>'inventoryOwnerParty'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'fulfilmentParty'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'customerServiceParty'),''),'shared'),COALESCE(NULLIF(BTRIM(v_payload->>'returnsAuthorityParty'),''),'supplier'),COALESCE(NULLIF(BTRIM(v_payload->>'cancellationAuthorityParty'),''),'shared'),
      COALESCE(v_payload->'roleBindings','{}'::jsonb),COALESCE(v_payload->'evidence','{}'::jsonb),BTRIM(v_payload->>'reason')
    ) RETURNING * INTO v_profile;

    RETURN jsonb_build_object('ok',true,'action',v_action,'profileId',v_profile.id,'version',v_profile.version,'status',v_profile.status,'checkoutEnabledByThisAction',false,'interfaceVersion',2);
  END IF;

  IF v_action='verify_profile' THEN
    v_profile_id:=NULLIF(v_payload->>'profileId','')::uuid;
    v_evidence:=COALESCE(v_payload->'evidence','{}'::jsonb);
    IF v_profile_id IS NULL OR v_evidence='{}'::jsonb OR NULLIF(BTRIM(v_payload->>'reason'),'') IS NULL THEN
      RAISE EXCEPTION 'profileId, non-empty evidence and reason are required';
    END IF;
    SELECT * INTO v_profile FROM private.supplier_commercial_profiles WHERE id=v_profile_id FOR UPDATE;
    IF NOT FOUND OR v_profile.status<>'draft' THEN RAISE EXCEPTION 'draft commercial profile is required'; END IF;

    UPDATE private.supplier_commercial_profiles
    SET status='retired',effective_to=now()
    WHERE supplier_id=v_profile.supplier_id AND market_code=v_profile.market_code
      AND status='verified' AND effective_to IS NULL;

    UPDATE private.supplier_commercial_profiles
    SET status='verified',evidence=v_evidence,reason=BTRIM(v_payload->>'reason'),reviewed_by=p_actor_id,reviewed_at=now()
    WHERE id=v_profile_id RETURNING * INTO v_profile;

    RETURN jsonb_build_object('ok',true,'action',v_action,'profileId',v_profile.id,'version',v_profile.version,'status',v_profile.status,'checkoutEnabledByThisAction',false,'interfaceVersion',2);
  END IF;

  IF v_action='retire_profile' THEN
    v_profile_id:=NULLIF(v_payload->>'profileId','')::uuid;
    IF v_profile_id IS NULL OR NULLIF(BTRIM(v_payload->>'reason'),'') IS NULL THEN
      RAISE EXCEPTION 'profileId and reason are required';
    END IF;
    UPDATE private.supplier_commercial_profiles
    SET status='retired',effective_to=COALESCE(effective_to,now()),reason=BTRIM(v_payload->>'reason')
    WHERE id=v_profile_id AND status IN ('draft','verified','suspended') RETURNING * INTO v_profile;
    IF NOT FOUND THEN RAISE EXCEPTION 'active commercial profile not found'; END IF;
    RETURN jsonb_build_object('ok',true,'action',v_action,'profileId',v_profile.id,'status',v_profile.status,'checkoutEnabledByThisAction',false,'interfaceVersion',2);
  END IF;

  IF v_action='configure_market_policy' THEN
    v_market:=upper(BTRIM(COALESCE(v_payload->>'marketCode','')));
    IF v_market !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'valid marketCode is required'; END IF;
    SELECT * INTO v_control FROM private.supplier_marketplace_commercial_controls WHERE market_code=v_market FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'market commercial control not found'; END IF;
    IF v_control.checkout_enabled THEN
      RAISE EXCEPTION 'market commercial policy cannot be changed while checkout is enabled';
    END IF;
    IF COALESCE(NULLIF(v_payload->>'adaptiveModelEnabled','')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'adaptiveModelEnabled=true is required for universal commercial compatibility policy';
    END IF;

    UPDATE private.supplier_marketplace_commercial_controls SET
      adaptive_model_enabled=true,
      allowed_seller_of_record_parties=CASE WHEN jsonb_typeof(v_payload->'allowedSellerOfRecordParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedSellerOfRecordParties')) ELSE allowed_seller_of_record_parties END,
      allowed_invoice_issuer_parties=CASE WHEN jsonb_typeof(v_payload->'allowedInvoiceIssuerParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedInvoiceIssuerParties')) ELSE allowed_invoice_issuer_parties END,
      allowed_merchant_of_record_parties=CASE WHEN jsonb_typeof(v_payload->'allowedMerchantOfRecordParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedMerchantOfRecordParties')) ELSE allowed_merchant_of_record_parties END,
      allowed_payment_recipient_parties=CASE WHEN jsonb_typeof(v_payload->'allowedPaymentRecipientParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedPaymentRecipientParties')) ELSE allowed_payment_recipient_parties END,
      allowed_inventory_owner_parties=CASE WHEN jsonb_typeof(v_payload->'allowedInventoryOwnerParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedInventoryOwnerParties')) ELSE allowed_inventory_owner_parties END,
      allowed_fulfilment_parties=CASE WHEN jsonb_typeof(v_payload->'allowedFulfilmentParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedFulfilmentParties')) ELSE allowed_fulfilment_parties END,
      allowed_customer_service_parties=CASE WHEN jsonb_typeof(v_payload->'allowedCustomerServiceParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedCustomerServiceParties')) ELSE allowed_customer_service_parties END,
      allowed_returns_authority_parties=CASE WHEN jsonb_typeof(v_payload->'allowedReturnsAuthorityParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedReturnsAuthorityParties')) ELSE allowed_returns_authority_parties END,
      allowed_cancellation_authority_parties=CASE WHEN jsonb_typeof(v_payload->'allowedCancellationAuthorityParties')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedCancellationAuthorityParties')) ELSE allowed_cancellation_authority_parties END,
      allowed_settlement_models=CASE WHEN jsonb_typeof(v_payload->'allowedSettlementModels')='array' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'allowedSettlementModels')) ELSE allowed_settlement_models END,
      reason=COALESCE(NULLIF(BTRIM(v_payload->>'reason'),''),reason),
      updated_at=now()
    WHERE market_code=v_market RETURNING * INTO v_control;

    RETURN jsonb_build_object('ok',true,'action',v_action,'marketCode',v_market,'adaptiveModelEnabled',v_control.adaptive_model_enabled,'checkoutEnabled',v_control.checkout_enabled,'checkoutEnabledByThisAction',false,'interfaceVersion',2);
  END IF;

  RAISE EXCEPTION 'unsupported commercial compatibility action';
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_commercial_compatibility_v2(uuid,text,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_commercial_compatibility_v2(uuid,text,jsonb)
TO service_role;

COMMENT ON FUNCTION public.server_admin_supplier_commercial_compatibility_v2(uuid,text,jsonb) IS
'Admin-only commercial compatibility configuration. Profiles and allowed-role policy can be reviewed/configured without enabling checkout or global Supplier Commerce. Market policy mutation is blocked while checkout is enabled.';
