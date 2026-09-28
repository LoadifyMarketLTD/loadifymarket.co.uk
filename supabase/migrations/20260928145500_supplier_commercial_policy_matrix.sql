-- Universal supplier commercial policy matrix.
--
-- Purpose:
-- - support heterogeneous supplier contracts without per-supplier code forks;
-- - keep commercial rules data-driven, versioned, auditable and fail-closed;
-- - preserve Loadify as marketplace/intermediary for supplier marketplace goods;
-- - never activate checkout/settlement merely because a profile exists.
--
-- This migration is additive. It does not mutate historical orders or enable
-- any supplier, market, payment or checkout capability.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_commercial_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE CASCADE,
  market_code text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft',

  -- Price authority / publication contract.
  pricing_model text NOT NULL,
  supplier_price_basis text NOT NULL DEFAULT 'trade_price',
  supplier_price_floor numeric(18,4),
  supplier_recommended_retail numeric(18,4),
  supplier_fixed_retail numeric(18,4),
  loadify_may_set_retail boolean NOT NULL DEFAULT false,
  supplier_approval_required_for_retail boolean NOT NULL DEFAULT true,

  -- Platform economics.
  platform_commission_type text NOT NULL DEFAULT 'percentage',
  platform_commission_value numeric(18,4) NOT NULL DEFAULT 0,
  platform_commission_effective_until timestamptz,

  -- Processor / Connect / payout cost allocation.
  processor_fee_payer text NOT NULL DEFAULT 'supplier',
  connect_fee_payer text NOT NULL DEFAULT 'supplier',
  payout_fee_payer text NOT NULL DEFAULT 'supplier',

  -- Settlement contract.
  settlement_model text NOT NULL,
  settlement_trigger text NOT NULL,
  settlement_minimum_amount numeric(18,4) NOT NULL DEFAULT 0,
  settlement_currency text NOT NULL DEFAULT 'GBP',
  supplier_payable_basis text NOT NULL,
  settlement_schedule text,

  -- Returns / cancellation / dispute cost allocation.
  change_of_mind_return_postage_payer text NOT NULL DEFAULT 'buyer_when_lawful',
  faulty_item_return_postage_payer text NOT NULL DEFAULT 'supplier',
  wrong_item_return_postage_payer text NOT NULL DEFAULT 'supplier',
  damaged_in_fulfilment_postage_payer text NOT NULL DEFAULT 'supplier',
  pre_dispatch_cancellation_cost_payer text NOT NULL DEFAULT 'supplier_if_cost_incurred',
  post_dispatch_cancellation_cost_payer text NOT NULL DEFAULT 'buyer_when_lawful',
  chargeback_allocation_model text NOT NULL DEFAULT 'evidence_attribution',
  platform_error_cost_payer text NOT NULL DEFAULT 'loadify',

  -- Operational contract knobs.
  manual_ordering_allowed boolean NOT NULL DEFAULT true,
  electronic_ordering_allowed boolean NOT NULL DEFAULT false,
  tracking_required boolean NOT NULL DEFAULT true,
  returns_supported boolean NOT NULL DEFAULT true,

  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT supplier_commercial_profile_market_check
    CHECK (market_code ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_commercial_profile_status_check
    CHECK (status IN ('draft','verified','suspended','retired')),
  CONSTRAINT supplier_commercial_profile_pricing_model_check
    CHECK (pricing_model IN (
      'supplier_fixed_retail',
      'supplier_rrp',
      'supplier_minimum_price',
      'jointly_agreed_retail',
      'loadify_managed_with_supplier_constraints'
    )),
  CONSTRAINT supplier_commercial_profile_price_basis_check
    CHECK (supplier_price_basis IN ('trade_price','wholesale_price','net_supplier_price','retail_price')),
  CONSTRAINT supplier_commercial_profile_commission_type_check
    CHECK (platform_commission_type IN ('percentage','fixed_per_order','fixed_per_item','none')),
  CONSTRAINT supplier_commercial_profile_fee_payer_check
    CHECK (
      processor_fee_payer IN ('supplier','loadify','shared','buyer_if_lawful')
      AND connect_fee_payer IN ('supplier','loadify','shared')
      AND payout_fee_payer IN ('supplier','loadify','shared')
    ),
  CONSTRAINT supplier_commercial_profile_settlement_model_check
    CHECK (settlement_model IN (
      'stripe_connect_supplier',
      'platform_collection_as_agent',
      'manual_supplier_settlement'
    )),
  CONSTRAINT supplier_commercial_profile_settlement_trigger_check
    CHECK (settlement_trigger IN (
      'payment_confirmed',
      'supplier_acknowledged',
      'dispatched',
      'delivered',
      'protection_window_elapsed',
      'manual_review'
    )),
  CONSTRAINT supplier_commercial_profile_payable_basis_check
    CHECK (supplier_payable_basis IN (
      'retail_less_attributable_costs',
      'supplier_trade_price_plus_agreed_shipping',
      'fixed_contract_amount',
      'order_level_formula'
    )),
  CONSTRAINT supplier_commercial_profile_postage_payer_check
    CHECK (
      change_of_mind_return_postage_payer IN ('buyer_when_lawful','supplier','loadify','case_by_case')
      AND faulty_item_return_postage_payer IN ('supplier','loadify','case_by_case')
      AND wrong_item_return_postage_payer IN ('supplier','loadify','case_by_case')
      AND damaged_in_fulfilment_postage_payer IN ('supplier','loadify','carrier_recovery','case_by_case')
      AND pre_dispatch_cancellation_cost_payer IN ('supplier_if_cost_incurred','loadify','none','case_by_case')
      AND post_dispatch_cancellation_cost_payer IN ('buyer_when_lawful','supplier','loadify','case_by_case')
      AND platform_error_cost_payer IN ('loadify')
    ),
  CONSTRAINT supplier_commercial_profile_chargeback_model_check
    CHECK (chargeback_allocation_model IN (
      'evidence_attribution',
      'supplier_bears_all',
      'loadify_bears_all',
      'shared_contractual'
    )),
  CONSTRAINT supplier_commercial_profile_currency_check
    CHECK (settlement_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_commercial_profile_amounts_check
    CHECK (
      platform_commission_value >= 0
      AND settlement_minimum_amount >= 0
      AND (supplier_price_floor IS NULL OR supplier_price_floor >= 0)
      AND (supplier_recommended_retail IS NULL OR supplier_recommended_retail >= 0)
      AND (supplier_fixed_retail IS NULL OR supplier_fixed_retail >= 0)
    ),
  CONSTRAINT supplier_commercial_profile_dates_check
    CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT supplier_commercial_profile_evidence_check
    CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_commercial_profile_reason_check
    CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_commercial_profile_verified_check
    CHECK (
      status <> 'verified'
      OR (
        evidence <> '{}'::jsonb
        AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_commercial_profile_version_unique
  ON private.supplier_commercial_profiles(supplier_id, market_code, version);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_commercial_profile_one_current_verified_unique
  ON private.supplier_commercial_profiles(supplier_id, market_code)
  WHERE status='verified' AND effective_to IS NULL;

CREATE INDEX IF NOT EXISTS supplier_commercial_profile_lookup_idx
  ON private.supplier_commercial_profiles(supplier_id, market_code, status, effective_from DESC);

REVOKE ALL ON TABLE private.supplier_commercial_profiles
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_commercial_profile_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.status='verified' THEN
    RAISE EXCEPTION 'verified supplier commercial profile is historical contract evidence and cannot be deleted';
  END IF;

  IF TG_OP='UPDATE' AND OLD.status='verified' THEN
    IF (
      to_jsonb(NEW) - ARRAY['status','effective_to']::text[]
    ) IS DISTINCT FROM (
      to_jsonb(OLD) - ARRAY['status','effective_to']::text[]
    ) THEN
      RAISE EXCEPTION 'verified supplier commercial profile is immutable; create a new version';
    END IF;
  END IF;

  IF NEW.pricing_model='supplier_fixed_retail' AND NEW.supplier_fixed_retail IS NULL THEN
    RAISE EXCEPTION 'supplier_fixed_retail requires supplier_fixed_retail amount';
  END IF;

  IF NEW.pricing_model='supplier_minimum_price' AND NEW.supplier_price_floor IS NULL THEN
    RAISE EXCEPTION 'supplier_minimum_price requires supplier_price_floor';
  END IF;

  IF NEW.pricing_model='supplier_rrp' AND NEW.supplier_recommended_retail IS NULL THEN
    RAISE EXCEPTION 'supplier_rrp requires supplier_recommended_retail';
  END IF;

  IF NEW.pricing_model='loadify_managed_with_supplier_constraints' AND NEW.loadify_may_set_retail IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'loadify-managed pricing requires loadify_may_set_retail=true';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_commercial_profile_v1
  ON private.supplier_commercial_profiles;
CREATE TRIGGER trg_guard_supplier_commercial_profile_v1
BEFORE INSERT OR UPDATE OR DELETE ON private.supplier_commercial_profiles
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_commercial_profile_v1();

CREATE OR REPLACE FUNCTION public.server_supplier_commercial_profile_readiness_v1(
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
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_profile private.supplier_commercial_profiles%ROWTYPE;
BEGIN
  IF v_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_market','interfaceVersion',1);
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=p_supplier_id
    AND lifecycle_status='approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','approved_supplier_not_found',
      'supplierId',p_supplier_id,
      'marketCode',v_market,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_commercial_profiles
  WHERE supplier_id=p_supplier_id
    AND market_code=v_market
    AND status='verified'
    AND effective_from <= now()
    AND (effective_to IS NULL OR effective_to > now())
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','verified_supplier_commercial_profile_missing',
      'supplierId',p_supplier_id,
      'marketCode',v_market,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','verified_supplier_commercial_profile',
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'marketCode',v_profile.market_code,
    'profileId',v_profile.id,
    'version',v_profile.version,
    'pricingModel',v_profile.pricing_model,
    'supplierPriceBasis',v_profile.supplier_price_basis,
    'loadifyMaySetRetail',v_profile.loadify_may_set_retail,
    'supplierApprovalRequiredForRetail',v_profile.supplier_approval_required_for_retail,
    'platformCommissionType',v_profile.platform_commission_type,
    'platformCommissionValue',v_profile.platform_commission_value,
    'platformCommissionEffectiveUntil',v_profile.platform_commission_effective_until,
    'processorFeePayer',v_profile.processor_fee_payer,
    'connectFeePayer',v_profile.connect_fee_payer,
    'payoutFeePayer',v_profile.payout_fee_payer,
    'settlementModel',v_profile.settlement_model,
    'settlementTrigger',v_profile.settlement_trigger,
    'settlementMinimumAmount',v_profile.settlement_minimum_amount,
    'settlementCurrency',v_profile.settlement_currency,
    'supplierPayableBasis',v_profile.supplier_payable_basis,
    'settlementSchedule',v_profile.settlement_schedule,
    'changeOfMindReturnPostagePayer',v_profile.change_of_mind_return_postage_payer,
    'faultyItemReturnPostagePayer',v_profile.faulty_item_return_postage_payer,
    'wrongItemReturnPostagePayer',v_profile.wrong_item_return_postage_payer,
    'damagedInFulfilmentPostagePayer',v_profile.damaged_in_fulfilment_postage_payer,
    'preDispatchCancellationCostPayer',v_profile.pre_dispatch_cancellation_cost_payer,
    'postDispatchCancellationCostPayer',v_profile.post_dispatch_cancellation_cost_payer,
    'chargebackAllocationModel',v_profile.chargeback_allocation_model,
    'platformErrorCostPayer',v_profile.platform_error_cost_payer,
    'manualOrderingAllowed',v_profile.manual_ordering_allowed,
    'electronicOrderingAllowed',v_profile.electronic_ordering_allowed,
    'trackingRequired',v_profile.tracking_required,
    'returnsSupported',v_profile.returns_supported,
    'reviewedAt',v_profile.reviewed_at,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_commercial_profile_readiness_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commercial_profile_readiness_v1(uuid,text)
  TO service_role;

COMMENT ON TABLE private.supplier_commercial_profiles IS
  'Versioned, per-supplier commercial contract matrix. Data-driven configuration prevents supplier-specific code forks. Creation alone never activates checkout or settlement.';

COMMENT ON FUNCTION public.server_supplier_commercial_profile_readiness_v1(uuid,text) IS
  'Service-role, fail-closed projection of the current verified supplier commercial profile. This function does not activate commerce.';
