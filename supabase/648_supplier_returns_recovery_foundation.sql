-- 648_supplier_returns_recovery_foundation.sql
-- Phase L — returns + customer refunds + supplier recovery + financial reconciliation foundation.
-- Customer refund truth and supplier recovery truth are deliberately separate.
-- Supplier Commerce remains fail-closed; no control is enabled here.

CREATE SCHEMA IF NOT EXISTS private;

INSERT INTO private.supplier_commerce_controls(operation, scope_type, scope_ref, enabled, reason)
VALUES ('return_recovery','global',NULL,false,'Phase L safe default')
ON CONFLICT (operation, scope_type, scope_ref_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.supplier_return_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_key text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid NOT NULL REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  handshake_id uuid NOT NULL REFERENCES private.supplier_order_handshakes(id) ON DELETE RESTRICT,
  shipment_id uuid REFERENCES private.supplier_leg_shipments(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  commercial_mode text NOT NULL DEFAULT 'loadify_supplier_fulfilled',
  external_supplier_order_ref text NOT NULL,
  external_return_ref text,
  reason_code text NOT NULL,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  state text NOT NULL DEFAULT 'requested',
  customer_refund_state text NOT NULL DEFAULT 'none',
  supplier_recovery_state text NOT NULL DEFAULT 'none',
  idempotency_key text NOT NULL UNIQUE,
  correlation_id uuid NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  authorised_at timestamptz,
  returned_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_return_case_key_check CHECK (NULLIF(BTRIM(return_key),'') IS NOT NULL),
  CONSTRAINT supplier_return_case_mode_check CHECK (commercial_mode='loadify_supplier_fulfilled'),
  CONSTRAINT supplier_return_case_order_ref_check CHECK (NULLIF(BTRIM(external_supplier_order_ref),'') IS NOT NULL),
  CONSTRAINT supplier_return_case_reason_check CHECK (NULLIF(BTRIM(reason_code),'') IS NOT NULL),
  CONSTRAINT supplier_return_case_state_check CHECK (state IN ('requested','authorised','in_transit','received','closed','cancelled')),
  CONSTRAINT supplier_return_case_refund_state_check CHECK (customer_refund_state IN ('none','pending','partial','succeeded','failed')),
  CONSTRAINT supplier_return_case_recovery_state_check CHECK (supplier_recovery_state IN ('none','requested','pending','partial','recovered','failed','unrecoverable')),
  CONSTRAINT supplier_return_case_idempotency_check CHECK (NULLIF(BTRIM(idempotency_key),'') IS NOT NULL),
  CONSTRAINT supplier_return_case_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_return_case_external_ref_unique
  ON private.supplier_return_cases(supplier_id, external_return_ref)
  WHERE external_return_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS supplier_return_case_order_idx ON private.supplier_return_cases(order_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_customer_refund_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  return_case_id uuid NOT NULL REFERENCES private.supplier_return_cases(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  external_refund_ref text NOT NULL,
  payment_ref text,
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  state text NOT NULL,
  occurred_at timestamptz NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_customer_refund_provider_check CHECK (NULLIF(BTRIM(provider),'') IS NOT NULL),
  CONSTRAINT supplier_customer_refund_ref_check CHECK (NULLIF(BTRIM(external_refund_ref),'') IS NOT NULL),
  CONSTRAINT supplier_customer_refund_currency_check CHECK (currency=upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_customer_refund_state_check CHECK (state IN ('pending','partial','succeeded','failed')),
  CONSTRAINT supplier_customer_refund_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  UNIQUE(provider, external_refund_ref)
);

CREATE TABLE IF NOT EXISTS private.supplier_recovery_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  return_case_id uuid NOT NULL REFERENCES private.supplier_return_cases(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  external_recovery_ref text,
  amount numeric(18,4) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency text NOT NULL,
  state text NOT NULL,
  occurred_at timestamptz NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_recovery_currency_check CHECK (currency=upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_recovery_state_check CHECK (state IN ('requested','pending','partial','recovered','failed','unrecoverable')),
  CONSTRAINT supplier_recovery_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_recovery_external_ref_unique
  ON private.supplier_recovery_evidence(supplier_id, external_recovery_ref)
  WHERE external_recovery_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS private.supplier_financial_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'EXCEPTION',
  currency text NOT NULL,
  customer_payment numeric(18,4) NOT NULL DEFAULT 0,
  ledger_customer_payment numeric(18,4) NOT NULL DEFAULT 0,
  customer_refunds numeric(18,4) NOT NULL DEFAULT 0,
  ledger_customer_refunds numeric(18,4) NOT NULL DEFAULT 0,
  supplier_payable numeric(18,4) NOT NULL DEFAULT 0,
  supplier_paid numeric(18,4) NOT NULL DEFAULT 0,
  supplier_recoveries numeric(18,4) NOT NULL DEFAULT 0,
  ledger_supplier_recoveries numeric(18,4) NOT NULL DEFAULT 0,
  chargebacks numeric(18,4) NOT NULL DEFAULT 0,
  unrecovered_loss numeric(18,4) NOT NULL DEFAULT 0,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_financial_reconciliation_state_check CHECK (state IN ('RECONCILED','PARTIALLY_RECONCILED','EXCEPTION','UNRECOVERED')),
  CONSTRAINT supplier_financial_reconciliation_currency_check CHECK (currency=upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_financial_reconciliation_evidence_check CHECK (jsonb_typeof(evidence)='object')
);

CREATE TABLE IF NOT EXISTS private.supplier_return_recovery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_case_id uuid NOT NULL REFERENCES private.supplier_return_cases(id) ON DELETE RESTRICT,
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  state text NOT NULL,
  external_ref text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_return_recovery_event_type_check CHECK (event_type IN ('return_requested','return_authorised','refund_recorded','recovery_recorded','reconciliation_evaluated','case_closed')),
  CONSTRAINT supplier_return_recovery_event_evidence_check CHECK (jsonb_typeof(evidence)='object')
);

REVOKE ALL ON TABLE private.supplier_return_cases FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_customer_refund_evidence FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_recovery_evidence FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_financial_reconciliations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_return_recovery_events FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE private.supplier_customer_refund_evidence IS 'Customer refund evidence. A buyer refund never implies supplier recovery.';
COMMENT ON TABLE private.supplier_recovery_evidence IS 'Supplier reimbursement/recovery evidence tracked independently from customer refunds.';
COMMENT ON TABLE private.supplier_financial_reconciliations IS 'Phase L canonical order-level reconciliation across payment, ledger, supplier payable/payment, refunds, recoveries and chargebacks.';
