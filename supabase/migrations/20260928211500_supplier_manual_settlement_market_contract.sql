-- Align marketplace commercial control with the universal supplier commercial profile.
-- Adds manual_supplier_settlement as a reviewed, fail-closed settlement contract option.
-- This migration does not verify any market, enable checkout, or execute supplier payouts.

ALTER TABLE private.supplier_marketplace_commercial_controls
  DROP CONSTRAINT IF EXISTS supplier_marketplace_control_settlement_check;

ALTER TABLE private.supplier_marketplace_commercial_controls
  ADD CONSTRAINT supplier_marketplace_control_settlement_check
  CHECK (settlement_model IN (
    'unconfigured',
    'stripe_connect_supplier',
    'platform_collection_as_agent',
    'manual_supplier_settlement'
  ));

COMMENT ON CONSTRAINT supplier_marketplace_control_settlement_check
  ON private.supplier_marketplace_commercial_controls IS
  'Reviewed settlement model contract. manual_supplier_settlement permits a controlled manual pilot settlement workflow but does not itself enable checkout or payout execution.';
