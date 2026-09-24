-- Multi-country market-native pricing and tax boundary.
-- This migration does not activate Romania checkout. It introduces explicit
-- evidence-backed pricing truth and extends Supplier Commerce economics to RO
-- while remaining fail-closed unless verified RON pricing/tax evidence exists.

CREATE TABLE IF NOT EXISTS private.product_market_price_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  market_code text NOT NULL,
  currency text NOT NULL,
  amount numeric(18,4) NOT NULL CHECK (amount >= 0),
  tax_inclusion text NOT NULL DEFAULT 'unknown',
  tax_rule_ref text,
  source_type text NOT NULL DEFAULT 'seller_declared',
  source_ref text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_market_price_market_check CHECK (market_code IN ('GB','RO')),
  CONSTRAINT product_market_price_currency_check CHECK (currency IN ('GBP','RON')),
  CONSTRAINT product_market_price_market_currency_check CHECK (
    (market_code='GB' AND currency='GBP')
    OR (market_code='RO' AND currency='RON')
  ),
  CONSTRAINT product_market_price_tax_inclusion_check CHECK (
    tax_inclusion IN ('included','excluded','unknown')
  ),
  CONSTRAINT product_market_price_source_type_check CHECK (
    source_type IN ('seller_declared','admin_verified','supplier_pricing_snapshot','contract')
  ),
  CONSTRAINT product_market_price_status_check CHECK (
    status IN ('draft','approved','stale','retired')
  ),
  CONSTRAINT product_market_price_dates_check CHECK (
    valid_to IS NULL OR valid_to > valid_from
  ),
  CONSTRAINT product_market_price_evidence_check CHECK (
    jsonb_typeof(evidence)='object'
  ),
  CONSTRAINT product_market_price_source_ref_check CHECK (
    NULLIF(BTRIM(source_ref),'') IS NOT NULL
  ),
  CONSTRAINT product_market_price_evidence_hash_check CHECK (
    NULLIF(BTRIM(evidence_hash),'') IS NOT NULL
  ),
  CONSTRAINT product_market_price_approval_check CHECK (
    status <> 'approved'
    OR (
      approved_by IS NOT NULL
      AND approved_at IS NOT NULL
      AND evidence <> '{}'::jsonb
      AND tax_inclusion <> 'unknown'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS product_market_price_version_unique
  ON private.product_market_price_versions(product_id,market_code,version);

CREATE UNIQUE INDEX IF NOT EXISTS product_market_price_one_current_approved_unique
  ON private.product_market_price_versions(product_id,market_code)
  WHERE status='approved' AND valid_to IS NULL;

CREATE INDEX IF NOT EXISTS product_market_price_lookup_idx
  ON private.product_market_price_versions(product_id,market_code,status,valid_from DESC);

REVOKE ALL ON TABLE private.product_market_price_versions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_product_market_price_decision_v1(
  p_product_id uuid,
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text := upper(BTRIM(COALESCE(p_market_code,'')));
  v_expected_currency text;
  v_product public.products%ROWTYPE;
  v_price private.product_market_price_versions%ROWTYPE;
BEGIN
  IF v_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','unsupported_market',
      'interfaceVersion',1
    );
  END IF;

  v_expected_currency := CASE WHEN v_market='GB' THEN 'GBP' ELSE 'RON' END;

  SELECT * INTO v_product
  FROM public.products
  WHERE id=p_product_id
    AND "isActive"=true
    AND "isApproved"=true
    AND "listingStatus"='active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','product_not_active',
      'interfaceVersion',1
    );
  END IF;

  IF NOT (v_market = ANY(COALESCE(v_product."marketCodes", ARRAY['GB']::text[]))) THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','product_market_not_enabled',
      'productId',v_product.id,
      'market',v_market,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_price
  FROM private.product_market_price_versions p
  WHERE p.product_id=p_product_id
    AND p.market_code=v_market
    AND p.currency=v_expected_currency
    AND p.status='approved'
    AND p.valid_from<=now()
    AND (p.valid_to IS NULL OR p.valid_to>now())
  ORDER BY p.valid_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','approved_market_price_missing',
      'productId',v_product.id,
      'market',v_market,
      'expectedCurrency',v_expected_currency,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','market_price_ready',
    'productId',v_product.id,
    'market',v_market,
    'currency',v_price.currency,
    'amount',v_price.amount,
    'priceVersionId',v_price.id,
    'priceVersion',v_price.version,
    'taxInclusion',v_price.tax_inclusion,
    'taxRuleRef',v_price.tax_rule_ref,
    'validFrom',v_price.valid_from,
    'validTo',v_price.valid_to,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_product_market_price_decision_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_product_market_price_decision_v1(uuid,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_commercial_decision_v1(
  p_supplier_offer_id uuid,
  p_canonical_product_id uuid,
  p_commercial_mode text,
  p_territory text DEFAULT 'GB'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_mode text := lower(BTRIM(COALESCE(p_commercial_mode, '')));
  v_territory text := upper(BTRIM(COALESCE(p_territory, 'GB')));
  v_expected_currency text;
  v_offer private.supplier_offers%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_landed private.supplier_landed_cost_snapshots%ROWTYPE;
  v_tax private.supplier_tax_rule_versions%ROWTYPE;
  v_catalog jsonb;
  v_import jsonb;
BEGIN
  IF v_mode NOT IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'invalid_commercial_mode', 'interfaceVersion', 1);
  END IF;

  IF v_territory NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'territory_not_enabled', 'territory', v_territory, 'interfaceVersion', 1);
  END IF;

  v_expected_currency := CASE WHEN v_territory='GB' THEN 'GBP' ELSE 'RON' END;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id
    AND canonical_product_id=p_canonical_product_id
    AND territory=v_territory;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_offer_not_linked', 'interfaceVersion', 1);
  END IF;

  v_catalog := public.server_supplier_catalog_decision_v1(
    p_canonical_product_id,
    p_supplier_offer_id,
    v_territory
  );

  IF COALESCE((v_catalog->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'catalog_not_ready', 'catalog', v_catalog, 'interfaceVersion', 1);
  END IF;

  v_import := public.server_supplier_import_decision_v1(
    v_offer.supplier_catalog_item_id,
    p_canonical_product_id
  );

  IF COALESCE((v_import->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'import_not_ready', 'import', v_import, 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_price
  FROM private.supplier_pricing_snapshots p
  WHERE p.supplier_offer_id=p_supplier_offer_id
    AND p.canonical_product_id=p_canonical_product_id
    AND p.commercial_mode=v_mode
    AND p.currency=v_expected_currency
    AND p.status='approved'
    AND p.valid_from<=now()
    AND (p.valid_to IS NULL OR p.valid_to>now())
  ORDER BY p.valid_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','approved_pricing_missing',
      'territory',v_territory,
      'expectedCurrency',v_expected_currency,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_landed
  FROM private.supplier_landed_cost_snapshots l
  WHERE l.id=v_price.landed_cost_snapshot_id;

  IF NOT FOUND
     OR v_landed.status<>'verified'
     OR v_landed.destination_territory<>v_territory
     OR v_landed.valid_from>now()
     OR (v_landed.valid_to IS NOT NULL AND v_landed.valid_to<=now()) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'landed_cost_not_current', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_tax
  FROM private.supplier_tax_rule_versions t
  WHERE t.id=v_price.tax_rule_version_id;

  IF NOT FOUND
     OR v_tax.status<>'verified'
     OR v_tax.territory<>v_territory
     OR v_tax.commercial_mode<>v_mode
     OR v_tax.effective_from>now()
     OR (v_tax.effective_to IS NOT NULL AND v_tax.effective_to<=now()) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'tax_rule_not_current', 'interfaceVersion', 1);
  END IF;

  IF v_price.expected_contribution < v_price.minimum_contribution THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'margin_guard_failed', 'interfaceVersion', 1);
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'commercial_economics_ready',
    'supplierOfferId', p_supplier_offer_id,
    'canonicalProductId', p_canonical_product_id,
    'territory', v_territory,
    'pricingSnapshotId', v_price.id,
    'landedCostSnapshotId', v_landed.id,
    'taxRuleVersionId', v_tax.id,
    'currency', v_price.currency,
    'grossCustomerPrice', v_price.gross_customer_price,
    'pricingPolicyVersion', v_price.pricing_policy_version,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_commercial_decision_v1(uuid,uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commercial_decision_v1(uuid,uuid,text,text)
  TO service_role;

COMMENT ON TABLE private.product_market_price_versions IS
  'Evidence-backed market-native seller listing prices. RO requires an approved RON price version; GBP values are never re-labelled as RON.';
COMMENT ON FUNCTION public.server_product_market_price_decision_v1(uuid,text) IS
  'Fail-closed market-native product price decision for GB/RO. It does not activate checkout.';
COMMENT ON FUNCTION public.server_supplier_commercial_decision_v1(uuid,uuid,text,text) IS
  'Fail-closed Supplier Commerce economics decision for GB/RO. RO requires approved RON pricing, verified RO tax rule and current RO landed-cost evidence.';


-- Explicit money semantics for customer orders and payment sessions.
-- Existing rows remain GB/GBP until migrated through a verified market flow.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "displayCurrency" text NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS "settlementCurrency" text NOT NULL DEFAULT 'GBP';

ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS "displayCurrency" text NOT NULL DEFAULT 'GBP';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_display_currency_check,
  ADD CONSTRAINT orders_display_currency_check
    CHECK ("displayCurrency" IN ('GBP','RON','EUR','USD')),
  DROP CONSTRAINT IF EXISTS orders_settlement_currency_check,
  ADD CONSTRAINT orders_settlement_currency_check
    CHECK ("settlementCurrency" IN ('GBP','RON','EUR','USD'));

ALTER TABLE public.payment_sessions
  DROP CONSTRAINT IF EXISTS payment_sessions_display_currency_check,
  ADD CONSTRAINT payment_sessions_display_currency_check
    CHECK ("displayCurrency" IN ('GBP','RON','EUR','USD'));

COMMENT ON COLUMN public.orders.currency IS
  'Transaction currency: the currency contractually charged to the buyer for this order.';
COMMENT ON COLUMN public.orders."displayCurrency" IS
  'Display currency shown to the buyer. It must never be used to reinterpret the transaction amount.';
COMMENT ON COLUMN public.orders."settlementCurrency" IS
  'Settlement/accounting currency expected for downstream seller/supplier settlement. Conversion requires explicit FX evidence.';
COMMENT ON COLUMN public.payment_sessions.currency IS
  'Processor transaction currency. Must match the canonical order transaction currency.';
COMMENT ON COLUMN public.payment_sessions."displayCurrency" IS
  'Buyer display currency snapshot. It does not change the PaymentIntent amount/currency.';
COMMENT ON COLUMN public.payouts.currency IS
  'Settlement currency of the payout record.';
COMMENT ON COLUMN public.order_items.currency IS
  'Transaction currency snapshot for the individual order item.';
COMMENT ON COLUMN private.supplier_pricing_snapshots.currency IS
  'Buyer transaction currency for this approved supplier pricing snapshot.';
COMMENT ON COLUMN private.commerce_financial_ledger_entries.currency IS
  'Native currency of this ledger event. Cross-currency movements require separate evidenced FX/adjustment entries.';
