-- 626_supplier_commercial_economics.sql
-- Phase G — Commercial Economics: landed cost, tax rule versioning, pricing and append-only financial ledger.
-- Supplier Commerce remains fail-closed under Phase C controls. This migration does not enable any runtime operation.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_tax_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  territory text NOT NULL,
  commercial_mode text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  rule_payload jsonb NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_hash text,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_tax_rule_key_check CHECK (rule_key = lower(BTRIM(rule_key)) AND rule_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'),
  CONSTRAINT supplier_tax_rule_territory_check CHECK (territory = upper(BTRIM(territory)) AND territory ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_tax_rule_mode_check CHECK (commercial_mode IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')),
  CONSTRAINT supplier_tax_rule_status_check CHECK (status IN ('draft','verified','stale','retired')),
  CONSTRAINT supplier_tax_rule_dates_check CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT supplier_tax_rule_payload_check CHECK (jsonb_typeof(rule_payload) = 'object'),
  CONSTRAINT supplier_tax_rule_evidence_refs_check CHECK (jsonb_typeof(evidence_refs) = 'array'),
  CONSTRAINT supplier_tax_rule_verified_check CHECK (
    status <> 'verified' OR (
      verified_by IS NOT NULL AND verified_at IS NOT NULL
      AND jsonb_array_length(evidence_refs) > 0
      AND NULLIF(BTRIM(evidence_hash), '') IS NOT NULL
    )
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_tax_rule_version_unique
  ON private.supplier_tax_rule_versions(rule_key, version);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_tax_rule_one_verified_current_unique
  ON private.supplier_tax_rule_versions(rule_key, territory, commercial_mode)
  WHERE status = 'verified' AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS private.supplier_landed_cost_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  import_item_id uuid NOT NULL REFERENCES private.supplier_import_items(id) ON DELETE RESTRICT,
  currency text NOT NULL,
  supplier_product_cost numeric(18,4) NOT NULL CHECK (supplier_product_cost >= 0),
  supplier_shipping_cost numeric(18,4) NOT NULL DEFAULT 0 CHECK (supplier_shipping_cost >= 0),
  carrier_cost numeric(18,4) NOT NULL DEFAULT 0 CHECK (carrier_cost >= 0),
  customs_duty numeric(18,4) NOT NULL DEFAULT 0 CHECK (customs_duty >= 0),
  import_vat numeric(18,4) NOT NULL DEFAULT 0 CHECK (import_vat >= 0),
  fx_cost numeric(18,4) NOT NULL DEFAULT 0 CHECK (fx_cost >= 0),
  other_cost numeric(18,4) NOT NULL DEFAULT 0 CHECK (other_cost >= 0),
  total_landed_cost numeric(18,4) GENERATED ALWAYS AS (
    supplier_product_cost + supplier_shipping_cost + carrier_cost + customs_duty + import_vat + fx_cost + other_cost
  ) STORED,
  ship_from_country text,
  destination_territory text NOT NULL DEFAULT 'GB',
  importer_of_record text,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_landed_cost_currency_check CHECK (currency = upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_landed_cost_destination_check CHECK (destination_territory = upper(BTRIM(destination_territory)) AND destination_territory ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_landed_cost_source_refs_check CHECK (jsonb_typeof(source_refs) = 'array'),
  CONSTRAINT supplier_landed_cost_status_check CHECK (status IN ('draft','verified','stale','retired')),
  CONSTRAINT supplier_landed_cost_dates_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT supplier_landed_cost_verified_check CHECK (
    status <> 'verified' OR (
      reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND jsonb_array_length(source_refs) > 0
      AND NULLIF(BTRIM(evidence_hash), '') IS NOT NULL
    )
  )
);
CREATE INDEX IF NOT EXISTS supplier_landed_cost_offer_idx
  ON private.supplier_landed_cost_snapshots(supplier_offer_id, status, valid_from DESC);

CREATE TABLE IF NOT EXISTS private.supplier_pricing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  landed_cost_snapshot_id uuid NOT NULL REFERENCES private.supplier_landed_cost_snapshots(id) ON DELETE RESTRICT,
  tax_rule_version_id uuid NOT NULL REFERENCES private.supplier_tax_rule_versions(id) ON DELETE RESTRICT,
  commercial_mode text NOT NULL,
  currency text NOT NULL,
  merchandise_amount numeric(18,4) NOT NULL CHECK (merchandise_amount >= 0),
  mandatory_fee_amount numeric(18,4) NOT NULL DEFAULT 0 CHECK (mandatory_fee_amount >= 0),
  customer_shipping_charge numeric(18,4) NOT NULL DEFAULT 0 CHECK (customer_shipping_charge >= 0),
  tax_amount numeric(18,4) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  gross_customer_price numeric(18,4) NOT NULL CHECK (gross_customer_price >= 0),
  expected_contribution numeric(18,4) NOT NULL,
  minimum_contribution numeric(18,4) NOT NULL DEFAULT 0,
  pricing_policy_version integer NOT NULL CHECK (pricing_policy_version > 0),
  status text NOT NULL DEFAULT 'candidate',
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pricing_mode_check CHECK (commercial_mode IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')),
  CONSTRAINT supplier_pricing_currency_check CHECK (currency = upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_pricing_status_check CHECK (status IN ('candidate','approved','stale','withdrawn')),
  CONSTRAINT supplier_pricing_dates_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT supplier_pricing_evidence_check CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT supplier_pricing_total_check CHECK (
    gross_customer_price = merchandise_amount + mandatory_fee_amount + customer_shipping_charge + tax_amount
  ),
  CONSTRAINT supplier_pricing_margin_check CHECK (
    status <> 'approved' OR expected_contribution >= minimum_contribution
  ),
  CONSTRAINT supplier_pricing_approval_check CHECK (
    status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND evidence <> '{}'::jsonb)
  )
);
CREATE INDEX IF NOT EXISTS supplier_pricing_offer_idx
  ON private.supplier_pricing_snapshots(supplier_offer_id, status, valid_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_pricing_one_current_approved_unique
  ON private.supplier_pricing_snapshots(supplier_offer_id, commercial_mode)
  WHERE status = 'approved' AND valid_to IS NULL;

CREATE TABLE IF NOT EXISTS private.commerce_financial_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  correlation_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  supplier_offer_id uuid REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  commercial_mode text NOT NULL,
  event_type text NOT NULL,
  account_code text NOT NULL,
  currency text NOT NULL,
  signed_amount numeric(18,4) NOT NULL,
  reversal_of uuid REFERENCES private.commerce_financial_ledger_entries(id) ON DELETE RESTRICT,
  external_ref text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_financial_ledger_mode_check CHECK (commercial_mode IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')),
  CONSTRAINT commerce_financial_ledger_event_check CHECK (event_type IN (
    'customer_payment','processor_fee','platform_commission','retail_margin','supplier_product_cost',
    'supplier_shipping_cost','carrier_cost','tax_vat','customs_duty','import_vat','fx',
    'seller_payable','supplier_payable','payout','customer_refund','supplier_recovery',
    'chargeback','unrecovered_loss','adjustment','reversal'
  )),
  CONSTRAINT commerce_financial_ledger_currency_check CHECK (currency = upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT commerce_financial_ledger_account_check CHECK (NULLIF(BTRIM(account_code), '') IS NOT NULL),
  CONSTRAINT commerce_financial_ledger_event_key_check CHECK (NULLIF(BTRIM(event_key), '') IS NOT NULL),
  CONSTRAINT commerce_financial_ledger_evidence_check CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT commerce_financial_ledger_reversal_check CHECK ((event_type = 'reversal' AND reversal_of IS NOT NULL) OR event_type <> 'reversal')
);
CREATE INDEX IF NOT EXISTS commerce_financial_ledger_order_idx
  ON private.commerce_financial_ledger_entries(order_id, occurred_at, recorded_at);
CREATE INDEX IF NOT EXISTS commerce_financial_ledger_correlation_idx
  ON private.commerce_financial_ledger_entries(correlation_id, occurred_at, recorded_at);

REVOKE ALL ON TABLE private.supplier_tax_rule_versions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_landed_cost_snapshots FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_pricing_snapshots FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.commerce_financial_ledger_entries FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_commerce_financial_ledger_immutable_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  RAISE EXCEPTION 'financial ledger entries are append-only; record an adjustment or reversal event';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_commerce_financial_ledger_update_v1 ON private.commerce_financial_ledger_entries;
CREATE TRIGGER trg_guard_commerce_financial_ledger_update_v1
BEFORE UPDATE OR DELETE ON private.commerce_financial_ledger_entries
FOR EACH ROW EXECUTE FUNCTION private.guard_commerce_financial_ledger_immutable_v1();

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
  IF v_territory <> 'GB' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'territory_not_enabled', 'territory', v_territory, 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id = p_supplier_offer_id AND canonical_product_id = p_canonical_product_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_offer_not_linked', 'interfaceVersion', 1);
  END IF;

  v_catalog := public.server_supplier_catalog_decision_v1(p_canonical_product_id, p_supplier_offer_id, v_territory);
  IF COALESCE((v_catalog->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'catalog_not_ready', 'catalog', v_catalog, 'interfaceVersion', 1);
  END IF;

  v_import := public.server_supplier_import_decision_v1(v_offer.supplier_catalog_item_id, p_canonical_product_id);
  IF COALESCE((v_import->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'import_not_ready', 'import', v_import, 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_price FROM private.supplier_pricing_snapshots p
   WHERE p.supplier_offer_id = p_supplier_offer_id
     AND p.canonical_product_id = p_canonical_product_id
     AND p.commercial_mode = v_mode
     AND p.status = 'approved'
     AND p.valid_from <= now()
     AND (p.valid_to IS NULL OR p.valid_to > now())
   ORDER BY p.valid_from DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'approved_pricing_missing', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_landed FROM private.supplier_landed_cost_snapshots l WHERE l.id = v_price.landed_cost_snapshot_id;
  IF NOT FOUND OR v_landed.status <> 'verified' OR v_landed.valid_from > now() OR (v_landed.valid_to IS NOT NULL AND v_landed.valid_to <= now()) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'landed_cost_not_current', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_tax FROM private.supplier_tax_rule_versions t WHERE t.id = v_price.tax_rule_version_id;
  IF NOT FOUND OR v_tax.status <> 'verified' OR v_tax.territory <> v_territory OR v_tax.commercial_mode <> v_mode
     OR v_tax.effective_from > now() OR (v_tax.effective_to IS NOT NULL AND v_tax.effective_to <= now()) THEN
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
REVOKE ALL ON FUNCTION public.server_supplier_commercial_decision_v1(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commercial_decision_v1(uuid, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_append_financial_ledger_v1(
  p_event_key text,
  p_correlation_id uuid,
  p_order_id uuid,
  p_supplier_offer_id uuid,
  p_commercial_mode text,
  p_event_type text,
  p_account_code text,
  p_currency text,
  p_signed_amount numeric,
  p_reversal_of uuid,
  p_external_ref text,
  p_evidence jsonb,
  p_occurred_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF NULLIF(BTRIM(p_event_key), '') IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'event key and correlation id are required';
  END IF;
  INSERT INTO private.commerce_financial_ledger_entries(
    event_key, correlation_id, order_id, supplier_offer_id, commercial_mode,
    event_type, account_code, currency, signed_amount, reversal_of, external_ref, evidence, occurred_at
  ) VALUES (
    BTRIM(p_event_key), p_correlation_id, p_order_id, p_supplier_offer_id,
    lower(BTRIM(p_commercial_mode)), lower(BTRIM(p_event_type)), BTRIM(p_account_code),
    upper(BTRIM(p_currency)), p_signed_amount, p_reversal_of, NULLIF(BTRIM(p_external_ref), ''),
    COALESCE(p_evidence, '{}'::jsonb), COALESCE(p_occurred_at, now())
  ) ON CONFLICT (event_key) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM private.commerce_financial_ledger_entries WHERE event_key = BTRIM(p_event_key); END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_append_financial_ledger_v1(text, uuid, uuid, uuid, text, text, text, text, numeric, uuid, text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_append_financial_ledger_v1(text, uuid, uuid, uuid, text, text, text, text, numeric, uuid, text, jsonb, timestamptz) TO service_role;

COMMENT ON TABLE private.commerce_financial_ledger_entries IS 'Append-only canonical financial truth. Corrections use explicit adjustment/reversal events; historical entries are never rewritten.';
COMMENT ON FUNCTION public.server_supplier_commercial_decision_v1(uuid, uuid, text, text) IS 'Phase G fail-closed commercial economics readiness decision. Does not enable Supplier Commerce controls.';
