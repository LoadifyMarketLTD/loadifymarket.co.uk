-- 644_supplier_tracking_exception_foundation.sql
-- Phase K — provider-neutral tracking normalisation + operational exception foundation.
-- Buyer remains on ONE public customer order. Internal shipment legs are not a parallel order system.
-- Supplier Commerce remains fail-closed; this migration enables no control.

CREATE TABLE IF NOT EXISTS private.supplier_tracking_status_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_key text NOT NULL, provider_status text NOT NULL, canonical_status text NOT NULL,
  version integer NOT NULL CHECK (version > 0), status text NOT NULL DEFAULT 'draft', evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL, approved_at timestamptz, effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_tracking_mapping_identity_unique UNIQUE(provider_key, provider_status, version),
  CONSTRAINT supplier_tracking_mapping_provider_check CHECK (NULLIF(BTRIM(provider_key),'') IS NOT NULL),
  CONSTRAINT supplier_tracking_mapping_source_status_check CHECK (NULLIF(BTRIM(provider_status),'') IS NOT NULL),
  CONSTRAINT supplier_tracking_mapping_status_check CHECK (canonical_status IN ('pending','accepted','dispatched','in_transit','exception','out_for_delivery','delivered','failed_delivery','returned')),
  CONSTRAINT supplier_tracking_mapping_lifecycle_check CHECK (status IN ('draft','approved','retired')),
  CONSTRAINT supplier_tracking_mapping_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_tracking_mapping_approval_check CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND evidence <> '{}'::jsonb)),
  CONSTRAINT supplier_tracking_mapping_effective_check CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_tracking_mapping_one_active_idx ON private.supplier_tracking_status_mappings(provider_key, lower(provider_status)) WHERE status='approved' AND effective_to IS NULL;
CREATE TABLE IF NOT EXISTS private.supplier_leg_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid NOT NULL UNIQUE REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  handshake_id uuid NOT NULL UNIQUE REFERENCES private.supplier_order_handshakes(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  provider_key text NOT NULL, external_supplier_order_ref text NOT NULL, carrier_ref text, tracking_ref text,
  canonical_status text NOT NULL DEFAULT 'accepted', dispatch_due_at timestamptz, dispatched_at timestamptz, delivered_at timestamptz,
  last_event_at timestamptz, last_ingested_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_leg_shipment_provider_check CHECK (NULLIF(BTRIM(provider_key),'') IS NOT NULL),
  CONSTRAINT supplier_leg_shipment_order_ref_check CHECK (NULLIF(BTRIM(external_supplier_order_ref),'') IS NOT NULL),
  CONSTRAINT supplier_leg_shipment_status_check CHECK (canonical_status IN ('pending','accepted','dispatched','in_transit','exception','out_for_delivery','delivered','failed_delivery','returned'))
);
CREATE INDEX IF NOT EXISTS supplier_leg_shipment_order_idx ON private.supplier_leg_shipments(order_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_leg_shipment_provider_tracking_unique ON private.supplier_leg_shipments(provider_key, tracking_ref) WHERE tracking_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS private.supplier_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shipment_id uuid NOT NULL REFERENCES private.supplier_leg_shipments(id) ON DELETE RESTRICT,
  provider_key text NOT NULL, provider_status text NOT NULL, canonical_status text NOT NULL,
  mapping_id uuid NOT NULL REFERENCES private.supplier_tracking_status_mappings(id) ON DELETE RESTRICT,
  carrier_ref text, tracking_ref text, provider_event_ref text, event_fingerprint text NOT NULL UNIQUE, occurred_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(), raw_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT supplier_tracking_event_provider_check CHECK (NULLIF(BTRIM(provider_key),'') IS NOT NULL),
  CONSTRAINT supplier_tracking_event_provider_status_check CHECK (NULLIF(BTRIM(provider_status),'') IS NOT NULL),
  CONSTRAINT supplier_tracking_event_status_check CHECK (canonical_status IN ('pending','accepted','dispatched','in_transit','exception','out_for_delivery','delivered','failed_delivery','returned')),
  CONSTRAINT supplier_tracking_event_fingerprint_check CHECK (NULLIF(BTRIM(event_fingerprint),'') IS NOT NULL), CONSTRAINT supplier_tracking_event_evidence_check CHECK (jsonb_typeof(raw_evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_tracking_event_timeline_idx ON private.supplier_tracking_events(shipment_id, occurred_at, ingested_at);
CREATE TABLE IF NOT EXISTS private.supplier_order_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  handshake_id uuid REFERENCES private.supplier_order_handshakes(id) ON DELETE RESTRICT, shipment_id uuid REFERENCES private.supplier_leg_shipments(id) ON DELETE RESTRICT,
  exception_key text NOT NULL UNIQUE, exception_type text NOT NULL, state text NOT NULL DEFAULT 'open', owner_type text NOT NULL,
  next_action text NOT NULL, customer_impact text NOT NULL, financial_impact text NOT NULL, resolution text,
  source_event_id uuid REFERENCES private.supplier_tracking_events(id) ON DELETE RESTRICT, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_exception_key_check CHECK (NULLIF(BTRIM(exception_key),'') IS NOT NULL),
  CONSTRAINT supplier_order_exception_type_check CHECK (exception_type IN ('supplier_timeout','accepted_response_lost','duplicate_submit','duplicate_acknowledgement','stock_disappeared','price_changed','api_unavailable','partial_fulfilment','partial_shipment','delayed_dispatch','no_tracking','lost_shipment','supplier_cancellation','buyer_cancellation','supplier_suspended_mid_order','tracking_exception','failed_delivery')),
  CONSTRAINT supplier_order_exception_state_check CHECK (state IN ('open','investigating','waiting_supplier','waiting_carrier','waiting_customer','resolved','closed')),
  CONSTRAINT supplier_order_exception_owner_check CHECK (owner_type IN ('loadify_ops','supplier','carrier','customer','finance','risk')),
  CONSTRAINT supplier_order_exception_action_check CHECK (NULLIF(BTRIM(next_action),'') IS NOT NULL),
  CONSTRAINT supplier_order_exception_customer_impact_check CHECK (NULLIF(BTRIM(customer_impact),'') IS NOT NULL),
  CONSTRAINT supplier_order_exception_financial_impact_check CHECK (NULLIF(BTRIM(financial_impact),'') IS NOT NULL),
  CONSTRAINT supplier_order_exception_metadata_check CHECK (jsonb_typeof(metadata)='object'),
  CONSTRAINT supplier_order_exception_resolution_check CHECK ((state IN ('resolved','closed') AND resolution IS NOT NULL AND resolved_at IS NOT NULL) OR (state NOT IN ('resolved','closed') AND resolved_at IS NULL))
);
CREATE INDEX IF NOT EXISTS supplier_order_exception_open_idx ON private.supplier_order_exceptions(state, exception_type, updated_at);
CREATE INDEX IF NOT EXISTS supplier_order_exception_order_idx ON private.supplier_order_exceptions(order_id, opened_at DESC);
CREATE TABLE IF NOT EXISTS private.supplier_order_exception_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exception_id uuid NOT NULL REFERENCES private.supplier_order_exceptions(id) ON DELETE RESTRICT,
  event_key text NOT NULL UNIQUE, previous_state text, new_state text NOT NULL, owner_type text NOT NULL, next_action text NOT NULL, reason text NOT NULL,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_exception_event_key_check CHECK (NULLIF(BTRIM(event_key),'') IS NOT NULL),
  CONSTRAINT supplier_order_exception_event_state_check CHECK (new_state IN ('open','investigating','waiting_supplier','waiting_carrier','waiting_customer','resolved','closed')),
  CONSTRAINT supplier_order_exception_event_owner_check CHECK (owner_type IN ('loadify_ops','supplier','carrier','customer','finance','risk')),
  CONSTRAINT supplier_order_exception_event_action_check CHECK (NULLIF(BTRIM(next_action),'') IS NOT NULL), CONSTRAINT supplier_order_exception_event_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_order_exception_event_metadata_check CHECK (jsonb_typeof(metadata)='object')
);
REVOKE ALL ON TABLE private.supplier_tracking_status_mappings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_leg_shipments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_tracking_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_order_exceptions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_order_exception_events FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE private.supplier_leg_shipments IS 'Phase K internal shipment truth per fulfilment leg. Buyer still sees one canonical customer order.';
COMMENT ON TABLE private.supplier_tracking_events IS 'Append-only provider/carrier tracking evidence normalised into canonical Loadify shipment states.';
COMMENT ON TABLE private.supplier_order_exceptions IS 'Phase K operational exceptions: every record carries state, owner, next action, customer impact, financial impact and resolution.';;
