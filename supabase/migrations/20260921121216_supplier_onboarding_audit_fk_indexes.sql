CREATE INDEX IF NOT EXISTS supplier_onboarding_profiles_created_by_idx
  ON private.supplier_onboarding_profiles(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_onboarding_profiles_updated_by_idx
  ON private.supplier_onboarding_profiles(updated_by)
  WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_onboarding_capability_verified_by_idx
  ON private.supplier_onboarding_capability_evidence(verified_by)
  WHERE verified_by IS NOT NULL;
