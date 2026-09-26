-- Supplier Stripe connected-account identity foundation.
--
-- This is NOT payment activation. It creates a reviewed binding between an
-- approved independent supplier and its own Stripe connected account.
-- Loadify remains marketplace/intermediary and does not own supplier goods.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_stripe_account_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL UNIQUE REFERENCES private.supplier_foundation_suppliers(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  account_country text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  card_payments_status text NOT NULL DEFAULT 'unknown',
  transfers_status text NOT NULL DEFAULT 'unknown',
  dashboard_type text NOT NULL DEFAULT 'unknown',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_stripe_account_id_check CHECK (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  CONSTRAINT supplier_stripe_country_check CHECK (account_country ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_stripe_status_check CHECK (status IN ('draft','verification','verified','suspended','retired')),
  CONSTRAINT supplier_stripe_card_status_check CHECK (card_payments_status IN ('unknown','unrequested','pending','active','inactive')),
  CONSTRAINT supplier_stripe_transfer_status_check CHECK (transfers_status IN ('unknown','unrequested','pending','active','inactive')),
  CONSTRAINT supplier_stripe_dashboard_check CHECK (dashboard_type IN ('unknown','express','full','none')),
  CONSTRAINT supplier_stripe_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_stripe_verified_check CHECK (
    status <> 'verified'
    OR (
      verified_at IS NOT NULL
      AND verified_by IS NOT NULL
      AND evidence <> '{}'::jsonb
    )
  )
);

CREATE INDEX IF NOT EXISTS supplier_stripe_binding_status_idx
  ON private.supplier_stripe_account_bindings(status, account_country, updated_at DESC);

REVOKE ALL ON TABLE private.supplier_stripe_account_bindings
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_stripe_account_readiness_v1(
  p_supplier_id uuid,
  p_expected_country text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_binding private.supplier_stripe_account_bindings%ROWTYPE;
  v_expected_country text:=upper(BTRIM(COALESCE(p_expected_country,'')));
  v_country_match boolean:=true;
  v_direct_charge_ready boolean:=false;
  v_transfer_recipient_ready boolean:=false;
BEGIN
  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=p_supplier_id
    AND lifecycle_status='approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','approved_supplier_not_found',
      'supplierId',p_supplier_id,
      'directChargeReady',false,
      'transferRecipientReady',false,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_binding
  FROM private.supplier_stripe_account_bindings
  WHERE supplier_id=p_supplier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_stripe_account_binding_missing',
      'supplierId',p_supplier_id,
      'supplierName',COALESCE(NULLIF(BTRIM(v_supplier.legal_name),''),v_supplier.display_name),
      'directChargeReady',false,
      'transferRecipientReady',false,
      'interfaceVersion',1
    );
  END IF;

  IF v_expected_country<>'' THEN
    v_country_match:=v_binding.account_country=v_expected_country;
  END IF;

  v_direct_charge_ready :=
    v_binding.status='verified'
    AND v_country_match
    AND v_binding.charges_enabled=true
    AND v_binding.payouts_enabled=true
    AND v_binding.card_payments_status='active'
    AND v_binding.verified_at IS NOT NULL
    AND v_binding.verified_by IS NOT NULL
    AND v_binding.evidence<>'{}'::jsonb;

  v_transfer_recipient_ready :=
    v_binding.status='verified'
    AND v_country_match
    AND v_binding.payouts_enabled=true
    AND v_binding.transfers_status='active'
    AND v_binding.verified_at IS NOT NULL
    AND v_binding.verified_by IS NOT NULL
    AND v_binding.evidence<>'{}'::jsonb;

  RETURN jsonb_build_object(
    'eligible',v_direct_charge_ready OR v_transfer_recipient_ready,
    'reason',CASE
      WHEN v_binding.status<>'verified' THEN 'supplier_stripe_binding_not_verified'
      WHEN NOT v_country_match THEN 'supplier_stripe_country_mismatch'
      WHEN v_direct_charge_ready OR v_transfer_recipient_ready THEN 'supplier_stripe_account_capability_ready'
      ELSE 'supplier_stripe_capability_incomplete'
    END,
    'supplierId',v_supplier.id,
    'supplierName',COALESCE(NULLIF(BTRIM(v_supplier.legal_name),''),v_supplier.display_name),
    'stripeAccountId',v_binding.stripe_account_id,
    'accountCountry',v_binding.account_country,
    'bindingStatus',v_binding.status,
    'chargesEnabled',v_binding.charges_enabled,
    'payoutsEnabled',v_binding.payouts_enabled,
    'cardPaymentsStatus',v_binding.card_payments_status,
    'transfersStatus',v_binding.transfers_status,
    'dashboardType',v_binding.dashboard_type,
    'directChargeReady',v_direct_charge_ready,
    'transferRecipientReady',v_transfer_recipient_ready,
    'verifiedAt',v_binding.verified_at,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_stripe_account_readiness_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_stripe_account_readiness_v1(uuid,text)
  TO service_role;

COMMENT ON TABLE private.supplier_stripe_account_bindings IS
  'Reviewed mapping from an independent supplier to its own Stripe connected account. This does not activate checkout or define merchant/payment-recipient semantics.';
COMMENT ON FUNCTION public.server_supplier_stripe_account_readiness_v1(uuid,text) IS
  'Service-role supplier Stripe capability evidence. Reports direct-charge and transfer-recipient readiness separately; does not select or activate a commercial settlement model.';
