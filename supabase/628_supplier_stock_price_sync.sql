-- 628_supplier_stock_price_sync.sql
-- Phase H — Stock + Price Sync foundations.
-- Raw supplier observations are not sellable stock and do not directly become buyer-visible truth.
-- Supplier Commerce remains fail-closed; stock_sync and price_sync controls are added OFF by default.

CREATE SCHEMA IF NOT EXISTS private;

ALTER TABLE private.supplier_commerce_controls
  DROP CONSTRAINT IF EXISTS supplier_commerce_controls_operation_check;
ALTER TABLE private.supplier_commerce_controls
  ADD CONSTRAINT supplier_commerce_controls_operation_check
  CHECK (operation IN (
    '*', 'import', 'publish', 'checkout', 'reservation', 'supplier_order',
    'tracking_ingest', 'return_recovery', 'stock_sync', 'price_sync'
  ));

INSERT INTO private.supplier_commerce_controls(operation, scope_type, scope_ref, enabled, reason)
VALUES
  ('stock_sync', 'global', NULL, false, 'Phase H safe default'),
  ('price_sync', 'global', NULL, false, 'Phase H safe default')
ON CONFLICT (operation, scope_type, scope_ref_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.supplier_offer_sync_policies (
  supplier_offer_id uuid PRIMARY KEY REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  stock_max_age_seconds integer NOT NULL CHECK (stock_max_age_seconds BETWEEN 30 AND 86400),
  price_max_age_seconds integer NOT NULL CHECK (price_max_age_seconds BETWEEN 30 AND 86400),
  safety_stock_quantity integer NOT NULL DEFAULT 0 CHECK (safety_stock_quantity >= 0),
  allow_unknown_quantity boolean NOT NULL DEFAULT false,
  policy_version integer NOT NULL DEFAULT 1 CHECK (policy_version > 0),
  status text NOT NULL DEFAULT 'draft',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_offer_sync_policy_status_check CHECK (status IN ('draft','approved','stale','retired')),
  CONSTRAINT supplier_offer_sync_policy_evidence_check CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT supplier_offer_sync_policy_approval_check CHECK (
    status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND evidence <> '{}'::jsonb)
  )
);

CREATE TABLE IF NOT EXISTS private.supplier_stock_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  external_variant_ref text NOT NULL DEFAULT '',
  provider_event_key text NOT NULL UNIQUE,
  availability text NOT NULL,
  quantity integer,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  adapter_version text NOT NULL,
  source_ref text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT supplier_stock_observation_variant_check CHECK (external_variant_ref = BTRIM(external_variant_ref)),
  CONSTRAINT supplier_stock_observation_event_key_check CHECK (NULLIF(BTRIM(provider_event_key), '') IS NOT NULL),
  CONSTRAINT supplier_stock_observation_availability_check CHECK (availability IN ('in_stock','out_of_stock','limited','unknown')),
  CONSTRAINT supplier_stock_observation_quantity_check CHECK (quantity IS NULL OR quantity >= 0),
  CONSTRAINT supplier_stock_observation_adapter_check CHECK (NULLIF(BTRIM(adapter_version), '') IS NOT NULL),
  CONSTRAINT supplier_stock_observation_evidence_check CHECK (jsonb_typeof(evidence) = 'object')
);
CREATE INDEX IF NOT EXISTS supplier_stock_observation_latest_idx
  ON private.supplier_stock_observations(supplier_offer_id, external_variant_ref, observed_at DESC, received_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_price_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  external_variant_ref text NOT NULL DEFAULT '',
  provider_event_key text NOT NULL UNIQUE,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  adapter_version text NOT NULL,
  source_ref text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT supplier_price_observation_variant_check CHECK (external_variant_ref = BTRIM(external_variant_ref)),
  CONSTRAINT supplier_price_observation_event_key_check CHECK (NULLIF(BTRIM(provider_event_key), '') IS NOT NULL),
  CONSTRAINT supplier_price_observation_currency_check CHECK (currency = upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_price_observation_adapter_check CHECK (NULLIF(BTRIM(adapter_version), '') IS NOT NULL),
  CONSTRAINT supplier_price_observation_evidence_check CHECK (jsonb_typeof(evidence) = 'object')
);
CREATE INDEX IF NOT EXISTS supplier_price_observation_latest_idx
  ON private.supplier_price_observations(supplier_offer_id, external_variant_ref, observed_at DESC, received_at DESC);

REVOKE ALL ON TABLE private.supplier_offer_sync_policies FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_stock_observations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_price_observations FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_stock_price_decision_v1(
  p_supplier_offer_id uuid,
  p_canonical_product_id uuid,
  p_commercial_mode text,
  p_territory text DEFAULT 'GB',
  p_external_variant_ref text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_policy private.supplier_offer_sync_policies%ROWTYPE;
  v_stock private.supplier_stock_observations%ROWTYPE;
  v_price private.supplier_price_observations%ROWTYPE;
  v_economics jsonb;
  v_stock_capability jsonb;
  v_price_capability jsonb;
  v_variant text := BTRIM(COALESCE(p_external_variant_ref, ''));
  v_sellable_quantity integer;
BEGIN
  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id = p_supplier_offer_id
     AND canonical_product_id = p_canonical_product_id
     AND territory = upper(BTRIM(COALESCE(p_territory, 'GB')))
     AND status = 'approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_offer_not_ready', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id = v_offer.supplier_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_not_found', 'interfaceVersion', 1);
  END IF;

  v_stock_capability := public.server_supplier_foundation_decision_v1(v_supplier.supplier_key, v_offer.territory, 'stock');
  IF COALESCE((v_stock_capability->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'stock_capability_not_ready', 'interfaceVersion', 1);
  END IF;
  v_price_capability := public.server_supplier_foundation_decision_v1(v_supplier.supplier_key, v_offer.territory, 'price');
  IF COALESCE((v_price_capability->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'price_capability_not_ready', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_policy FROM private.supplier_offer_sync_policies
   WHERE supplier_offer_id = p_supplier_offer_id AND status = 'approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'sync_policy_missing', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_stock FROM private.supplier_stock_observations
   WHERE supplier_offer_id = p_supplier_offer_id AND external_variant_ref = v_variant
   ORDER BY observed_at DESC, received_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'stock_observation_missing', 'interfaceVersion', 1);
  END IF;
  IF v_stock.observed_at + make_interval(secs => v_policy.stock_max_age_seconds) <= now() THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'stock_stale', 'stockObservedAt', v_stock.observed_at, 'interfaceVersion', 1);
  END IF;
  IF v_stock.availability IN ('out_of_stock','unknown') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'stock_unavailable', 'availability', v_stock.availability, 'interfaceVersion', 1);
  END IF;
  IF v_stock.quantity IS NULL AND NOT v_policy.allow_unknown_quantity THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'stock_quantity_unknown', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_price FROM private.supplier_price_observations
   WHERE supplier_offer_id = p_supplier_offer_id AND external_variant_ref = v_variant
   ORDER BY observed_at DESC, received_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'price_observation_missing', 'interfaceVersion', 1);
  END IF;
  IF v_price.observed_at + make_interval(secs => v_policy.price_max_age_seconds) <= now() THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'price_stale', 'priceObservedAt', v_price.observed_at, 'interfaceVersion', 1);
  END IF;

  v_economics := public.server_supplier_commercial_decision_v1(
    p_supplier_offer_id, p_canonical_product_id, p_commercial_mode, p_territory
  );
  IF COALESCE((v_economics->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'commercial_economics_not_ready', 'economics', v_economics, 'interfaceVersion', 1);
  END IF;

  IF upper(COALESCE(v_economics->>'currency','')) <> v_price.currency THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_price_currency_changed', 'interfaceVersion', 1);
  END IF;

  v_sellable_quantity := CASE
    WHEN v_stock.quantity IS NULL THEN NULL
    ELSE GREATEST(v_stock.quantity - v_policy.safety_stock_quantity, 0)
  END;
  IF v_sellable_quantity IS NOT NULL AND v_sellable_quantity <= 0 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'safety_stock_exhausted', 'sellableQuantity', 0, 'interfaceVersion', 1);
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'stock_price_ready',
    'supplierOfferId', p_supplier_offer_id,
    'canonicalProductId', p_canonical_product_id,
    'stockObservationId', v_stock.id,
    'priceObservationId', v_price.id,
    'pricingSnapshotId', v_economics->>'pricingSnapshotId',
    'availability', v_stock.availability,
    'sellableQuantity', v_sellable_quantity,
    'supplierPriceMinor', v_price.amount_minor,
    'currency', v_price.currency,
    'stockObservedAt', v_stock.observed_at,
    'priceObservedAt', v_price.observed_at,
    'policyVersion', v_policy.policy_version,
    'interfaceVersion', 1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_stock_price_decision_v1(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_stock_price_decision_v1(uuid,uuid,text,text,text) TO service_role;

COMMENT ON TABLE private.supplier_stock_observations IS 'Append-only raw supplier stock observations. Raw supplier stock is not Loadify sellable stock.';
COMMENT ON TABLE private.supplier_price_observations IS 'Append-only raw supplier price observations used to detect freshness/change; not buyer price truth.';
COMMENT ON FUNCTION public.server_supplier_stock_price_decision_v1(uuid,uuid,text,text,text) IS 'Phase H fail-closed stock/price readiness decision. It does not enable checkout or Supplier Commerce.';
