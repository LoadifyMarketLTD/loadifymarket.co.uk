-- 630_supplier_sync_policy_versioning_closure.sql
-- Close the Phase H policy-versioning invariant: approved history remains retained while a new policy version can be created.

ALTER TABLE private.supplier_offer_sync_policies
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

ALTER TABLE private.supplier_offer_sync_policies
  DROP CONSTRAINT IF EXISTS supplier_offer_sync_policies_pkey;

ALTER TABLE private.supplier_offer_sync_policies
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE private.supplier_offer_sync_policies
  ADD CONSTRAINT supplier_offer_sync_policies_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_offer_sync_policy_version_unique
  ON private.supplier_offer_sync_policies(supplier_offer_id, policy_version);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_offer_sync_policy_one_current_approved_unique
  ON private.supplier_offer_sync_policies(supplier_offer_id)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS supplier_offer_sync_policy_offer_idx
  ON private.supplier_offer_sync_policies(supplier_offer_id, status, policy_version DESC);

COMMENT ON TABLE private.supplier_offer_sync_policies IS 'Versioned Phase H freshness/safety policy. Historical approved policies are retained; at most one approved policy exists per supplier offer.';
;
