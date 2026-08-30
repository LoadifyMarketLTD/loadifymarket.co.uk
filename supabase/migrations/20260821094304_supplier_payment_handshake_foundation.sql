-- 640_supplier_payment_handshake_foundation.sql
-- Phase J — payment evidence → supplier submission → acknowledgement foundation.
-- PAYMENT SUCCESS != SUPPLIER ORDER SUCCESS. No Supplier Commerce control is enabled here.

ALTER TABLE private.supplier_fulfilment_legs
  DROP CONSTRAINT IF EXISTS supplier_fulfilment_leg_status_check;
ALTER TABLE private.supplier_fulfilment_legs
  ADD CONSTRAINT supplier_fulfilment_leg_status_check CHECK (
    status IN (
      'planned','review','hold','reserved','ready_for_payment','released','cancelled',
      'supplier_submitting','supplier_pending','supplier_accepted','supplier_rejected','reconciliation_required'
    )
  );

ALTER TABLE private.supplier_order_orchestrations
  DROP CONSTRAINT IF EXISTS supplier_order_orchestration_state_check;
ALTER TABLE private.supplier_order_orchestrations
  ADD CONSTRAINT supplier_order_orchestration_state_check CHECK (
    state IN (
      'planning','review','hold','reserved','ready_for_payment','released','cancelled',
      'supplier_submitting','supplier_pending','supplier_accepted','supplier_exception','reconciliation_required'
    )
  );

CREATE TABLE IF NOT EXISTS private.supplier_payment_evidence_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  payment_session_id uuid NOT NULL UNIQUE REFERENCES public.payment_sessions(id) ON DELETE RESTRICT,
  payment_intent_ref text NOT NULL UNIQUE,
  payment_status text NOT NULL,
  order_status text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL,
  evidence_source text NOT NULL DEFAULT 'canonical_payment_session',
  captured_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_payment_evidence_intent_check CHECK (NULLIF(BTRIM(payment_intent_ref),'') IS NOT NULL),
  CONSTRAINT supplier_payment_evidence_status_check CHECK (payment_status='completed'),
  CONSTRAINT supplier_payment_evidence_currency_check CHECK (currency=upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_payment_evidence_source_check CHECK (evidence_source='canonical_payment_session')
);

CREATE TABLE IF NOT EXISTS private.supplier_order_handshakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid NOT NULL UNIQUE REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  reservation_id uuid NOT NULL UNIQUE REFERENCES private.supplier_stock_reservations(id) ON DELETE RESTRICT,
  payment_evidence_id uuid NOT NULL REFERENCES private.supplier_payment_evidence_snapshots(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  adapter_version text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  correlation_id uuid NOT NULL,
  request_fingerprint text NOT NULL,
  state text NOT NULL DEFAULT 'prepared',
  acknowledgement_state text NOT NULL DEFAULT 'not_received',
  recovery_state text NOT NULL DEFAULT 'none',
  external_supplier_order_ref text,
  submission_attempts integer NOT NULL DEFAULT 0 CHECK (submission_attempts >= 0),
  last_error_class text,
  last_error_message text,
  submitted_at timestamptz,
  acknowledged_at timestamptz,
  last_checked_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_handshake_provider_check CHECK (NULLIF(BTRIM(provider_key),'') IS NOT NULL),
  CONSTRAINT supplier_order_handshake_adapter_check CHECK (NULLIF(BTRIM(adapter_version),'') IS NOT NULL),
  CONSTRAINT supplier_order_handshake_idem_check CHECK (NULLIF(BTRIM(idempotency_key),'') IS NOT NULL),
  CONSTRAINT supplier_order_handshake_fingerprint_check CHECK (NULLIF(BTRIM(request_fingerprint),'') IS NOT NULL),
  CONSTRAINT supplier_order_handshake_state_check CHECK (state IN (
    'prepared','submitting','pending','accepted','rejected','unknown','retryable_failure','reconciliation_required','reconciled'
  )),
  CONSTRAINT supplier_order_handshake_ack_check CHECK (acknowledgement_state IN ('not_received','pending','accepted','rejected','unknown')),
  CONSTRAINT supplier_order_handshake_recovery_check CHECK (recovery_state IN ('none','retry_pending','query_before_retry','reconcile','manual_review','resolved'))
);
CREATE INDEX IF NOT EXISTS supplier_order_handshake_order_idx
  ON private.supplier_order_handshakes(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS supplier_order_handshake_recovery_idx
  ON private.supplier_order_handshakes(recovery_state, state, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_order_handshake_external_ref_unique
  ON private.supplier_order_handshakes(provider_key, supplier_id, external_supplier_order_ref)
  WHERE external_supplier_order_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS private.supplier_order_handshake_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handshake_id uuid NOT NULL REFERENCES private.supplier_order_handshakes(id) ON DELETE RESTRICT,
  event_key text NOT NULL UNIQUE,
  event text NOT NULL,
  previous_state text,
  new_state text,
  result_class text,
  error_class text,
  external_supplier_order_ref text,
  recovery_state text,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_handshake_event_key_check CHECK (NULLIF(BTRIM(event_key),'') IS NOT NULL),
  CONSTRAINT supplier_order_handshake_event_check CHECK (event IN (
    'prepared','submission_started','submission_result','acknowledgement','timeout','reconciliation','manual_review'
  )),
  CONSTRAINT supplier_order_handshake_event_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_order_handshake_event_metadata_check CHECK (jsonb_typeof(metadata)='object')
);
CREATE INDEX IF NOT EXISTS supplier_order_handshake_event_idx
  ON private.supplier_order_handshake_events(handshake_id, created_at);

REVOKE ALL ON TABLE private.supplier_payment_evidence_snapshots FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_order_handshakes FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_order_handshake_events FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE private.supplier_payment_evidence_snapshots IS 'Immutable Phase J evidence that canonical customer payment completed; it does not imply supplier-order success.';
COMMENT ON TABLE private.supplier_order_handshakes IS 'Provider-neutral Phase J supplier submission/acknowledgement state. One handshake per internal supplier fulfilment leg.';
COMMENT ON TABLE private.supplier_order_handshake_events IS 'Append-only Phase J submission, acknowledgement and recovery evidence.';;
