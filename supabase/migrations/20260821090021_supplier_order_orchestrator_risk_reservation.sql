-- 634_supplier_order_orchestrator_risk_reservation.sql
-- Phase I — canonical order orchestration + commerce risk + supplier reservation foundations.
-- Public orders remain the ONE CUSTOMER ORDER. Internal fulfilment legs do not create a parallel buyer order system.
-- Supplier Commerce remains fail-closed. This migration enables no control.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_order_orchestrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'planning',
  correlation_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  risk_state text NOT NULL DEFAULT 'not_assessed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_orchestration_state_check CHECK (
    state IN ('planning','review','hold','reserved','ready_for_payment','released','cancelled')
  ),
  CONSTRAINT supplier_order_orchestration_risk_state_check CHECK (
    risk_state IN ('not_assessed','allow','review','hold','restrict','block')
  ),
  CONSTRAINT supplier_order_orchestration_idempotency_check CHECK (NULLIF(BTRIM(idempotency_key),'') IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS private.supplier_fulfilment_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  leg_key text NOT NULL,
  fulfiller_type text NOT NULL,
  commercial_mode text NOT NULL,
  supplier_offer_id uuid REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  seller_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'planned',
  currency text,
  expected_cost numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_fulfilment_leg_key_unique UNIQUE(orchestration_id, leg_key),
  CONSTRAINT supplier_fulfilment_leg_key_check CHECK (NULLIF(BTRIM(leg_key),'') IS NOT NULL),
  CONSTRAINT supplier_fulfilment_leg_fulfiller_check CHECK (fulfiller_type IN ('marketplace_seller','loadify_direct','supplier')),
  CONSTRAINT supplier_fulfilment_leg_mode_check CHECK (commercial_mode IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')),
  CONSTRAINT supplier_fulfilment_leg_status_check CHECK (status IN ('planned','review','hold','reserved','ready_for_payment','released','cancelled')),
  CONSTRAINT supplier_fulfilment_leg_currency_check CHECK (currency IS NULL OR (currency = upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$')),
  CONSTRAINT supplier_fulfilment_leg_cost_check CHECK (expected_cost IS NULL OR expected_cost >= 0),
  CONSTRAINT supplier_fulfilment_leg_route_check CHECK (
    (fulfiller_type='supplier' AND supplier_offer_id IS NOT NULL AND commercial_mode='loadify_supplier_fulfilled')
    OR (fulfiller_type='loadify_direct' AND commercial_mode='loadify_direct')
    OR (fulfiller_type='marketplace_seller' AND seller_id IS NOT NULL AND commercial_mode='marketplace_seller')
  )
);

CREATE TABLE IF NOT EXISTS private.supplier_fulfilment_leg_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leg_id uuid NOT NULL REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL UNIQUE REFERENCES public.order_items(id) ON DELETE RESTRICT,
  canonical_product_id uuid,
  supplier_offer_id uuid REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  external_variant_ref text NOT NULL DEFAULT '',
  pricing_snapshot_id uuid REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_fulfilment_item_variant_check CHECK (external_variant_ref=BTRIM(external_variant_ref))
);

CREATE TABLE IF NOT EXISTS private.supplier_commerce_risk_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft',
  review_score integer NOT NULL CHECK (review_score BETWEEN 0 AND 100),
  hold_score integer NOT NULL CHECK (hold_score BETWEEN 0 AND 100),
  restrict_score integer NOT NULL CHECK (restrict_score BETWEEN 0 AND 100),
  block_score integer NOT NULL CHECK (block_score BETWEEN 0 AND 100),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_commerce_risk_policy_unique UNIQUE(policy_key,version),
  CONSTRAINT supplier_commerce_risk_policy_key_check CHECK (NULLIF(BTRIM(policy_key),'') IS NOT NULL),
  CONSTRAINT supplier_commerce_risk_policy_status_check CHECK (status IN ('draft','approved','retired')),
  CONSTRAINT supplier_commerce_risk_policy_threshold_check CHECK (
    review_score <= hold_score AND hold_score <= restrict_score AND restrict_score <= block_score
  ),
  CONSTRAINT supplier_commerce_risk_policy_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_commerce_risk_policy_approval_check CHECK (
    status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND evidence <> '{}'::jsonb)
  ),
  CONSTRAINT supplier_commerce_risk_policy_effective_check CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_commerce_risk_one_active_policy_idx
  ON private.supplier_commerce_risk_policy_versions(policy_key)
  WHERE status='approved' AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS private.supplier_commerce_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  orchestration_id uuid REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  subject_type text NOT NULL,
  subject_ref text NOT NULL,
  risk_score integer NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  action text NOT NULL,
  policy_id uuid NOT NULL REFERENCES private.supplier_commerce_risk_policy_versions(id) ON DELETE RESTRICT,
  signals jsonb NOT NULL,
  reason text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_commerce_risk_subject_check CHECK (subject_type IN ('buyer','supplier','order','platform')),
  CONSTRAINT supplier_commerce_risk_action_check CHECK (action IN ('ALLOW','REVIEW','HOLD','RESTRICT','BLOCK')),
  CONSTRAINT supplier_commerce_risk_subject_ref_check CHECK (NULLIF(BTRIM(subject_ref),'') IS NOT NULL),
  CONSTRAINT supplier_commerce_risk_signals_check CHECK (jsonb_typeof(signals)='object'),
  CONSTRAINT supplier_commerce_risk_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_commerce_risk_idempotency_check CHECK (NULLIF(BTRIM(idempotency_key),'') IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS supplier_commerce_risk_order_idx
  ON private.supplier_commerce_risk_assessments(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  leg_item_id uuid NOT NULL REFERENCES private.supplier_fulfilment_leg_items(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL,
  external_variant_ref text NOT NULL DEFAULT '',
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active',
  reservation_key text NOT NULL UNIQUE,
  stock_observation_id uuid NOT NULL REFERENCES private.supplier_stock_observations(id) ON DELETE RESTRICT,
  price_observation_id uuid NOT NULL REFERENCES private.supplier_price_observations(id) ON DELETE RESTRICT,
  pricing_snapshot_id uuid NOT NULL REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  sync_policy_version integer NOT NULL CHECK (sync_policy_version > 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  consumed_at timestamptz,
  CONSTRAINT supplier_stock_reservation_status_check CHECK (status IN ('active','released','expired','consumed')),
  CONSTRAINT supplier_stock_reservation_variant_check CHECK (external_variant_ref=BTRIM(external_variant_ref)),
  CONSTRAINT supplier_stock_reservation_key_check CHECK (NULLIF(BTRIM(reservation_key),'') IS NOT NULL),
  CONSTRAINT supplier_stock_reservation_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT supplier_stock_reservation_terminal_check CHECK (
    (status='active' AND released_at IS NULL AND consumed_at IS NULL)
    OR (status IN ('released','expired') AND released_at IS NOT NULL AND consumed_at IS NULL)
    OR (status='consumed' AND consumed_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS supplier_stock_reservation_active_offer_idx
  ON private.supplier_stock_reservations(supplier_offer_id, external_variant_ref, expires_at)
  WHERE status='active';
CREATE UNIQUE INDEX IF NOT EXISTS supplier_stock_reservation_one_active_item_idx
  ON private.supplier_stock_reservations(order_item_id)
  WHERE status='active';

REVOKE ALL ON TABLE private.supplier_order_orchestrations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_fulfilment_legs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_fulfilment_leg_items FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_risk_policy_versions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_commerce_risk_assessments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_stock_reservations FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE private.supplier_order_orchestrations IS 'Phase I internal orchestration attached to the existing public customer order. It is not a parallel buyer order.';
COMMENT ON TABLE private.supplier_fulfilment_legs IS 'Internal fulfilment legs for one canonical customer order; supports seller, Loadify direct and supplier-fulfilled routes.';
COMMENT ON TABLE private.supplier_commerce_risk_assessments IS 'Append-only commerce risk decisions. Risk action does not itself ban an account.';
COMMENT ON TABLE private.supplier_stock_reservations IS 'Canonical supplier-stock reservations backed by fresh Phase H stock/price evidence and scoped to one existing public order item.';;
