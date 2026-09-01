import { describe, expect, it } from 'vitest';
import {
  assessSupplierProviderActivation,
  type SupplierProviderActivationEvidenceV1,
} from '../_shared/supplierProviderActivation';

const BASE_EVIDENCE: SupplierProviderActivationEvidenceV1 = {
  credentialsConfigured: true,
  credentialsValidated: true,
  contractConfirmed: true,
  capabilityTests: {},
  securityChecksPassed: true,
  evidenceRefs: ['provider-validation:evidence-1'],
  ownerApprovalRecorded: false,
  productionEnableRequested: false,
  killSwitchActive: false,
};

describe('Supplier provider activation lifecycle', () => {
  it('keeps configuration distinct from validation and production enablement', () => {
    const assessment = assessSupplierProviderActivation({
      provider: 'bigbuy',
      requiredCapabilities: ['catalog'],
      evidence: {
        ...BASE_EVIDENCE,
        credentialsConfigured: false,
        credentialsValidated: false,
      },
    });

    expect(assessment.stage).toBe('unconfigured');
    expect(assessment.configured).toBe(false);
    expect(assessment.validated).toBe(false);
    expect(assessment.productionEnabled).toBe(false);
    expect(assessment.configurationBlockers).toContain('provider_credentials_not_configured');
  });

  it('does not let caller booleans promote an unverified BigBuy capability', () => {
    const assessment = assessSupplierProviderActivation({
      provider: 'bigbuy',
      requiredCapabilities: ['catalog', 'stock'],
      evidence: {
        ...BASE_EVIDENCE,
        capabilityTests: { catalog: true, stock: true },
        ownerApprovalRecorded: true,
        productionEnableRequested: true,
      },
    });

    expect(assessment.stage).toBe('configured');
    expect(assessment.validated).toBe(false);
    expect(assessment.productionEnabled).toBe(false);
    expect(assessment.validationBlockers).toContain('provider_capability_not_verified:catalog');
    expect(assessment.validationBlockers).toContain('provider_capability_not_verified:stock');
  });

  it('can classify currently verified Avasam read capabilities as validated but never production enabled', () => {
    const assessment = assessSupplierProviderActivation({
      provider: 'avasam',
      requiredCapabilities: ['catalog', 'stock', 'price'],
      evidence: {
        ...BASE_EVIDENCE,
        capabilityTests: { catalog: true, stock: true, price: true },
        ownerApprovalRecorded: true,
        productionEnableRequested: true,
      },
    });

    expect(assessment.stage).toBe('validated');
    expect(assessment.configured).toBe(true);
    expect(assessment.validated).toBe(true);
    expect(assessment.productionEnabled).toBe(false);
    expect(assessment.productionBlockers).toContain('provider_readiness_gate_blocked');
    expect(assessment.productionBlockers).toContain('provider_hosted_activation_not_enabled');
    expect(assessment.externalMutationPerformed).toBe(false);
    expect(assessment.customerPiiDisclosurePerformed).toBe(false);
    expect(assessment.financialMutationPerformed).toBe(false);
  });

  it('keeps Avasam order submission unvalidated until the canonical registry verifies it', () => {
    const assessment = assessSupplierProviderActivation({
      provider: 'avasam',
      requiredCapabilities: ['order_submission'],
      evidence: {
        ...BASE_EVIDENCE,
        capabilityTests: { order_submission: true },
      },
    });

    expect(assessment.stage).toBe('configured');
    expect(assessment.validationBlockers).toContain('provider_capability_not_verified:order_submission');
  });

  it('requires evidence refs and explicit capability test PASS', () => {
    const assessment = assessSupplierProviderActivation({
      provider: 'avasam',
      requiredCapabilities: ['catalog'],
      evidence: {
        ...BASE_EVIDENCE,
        evidenceRefs: ['  '],
        capabilityTests: {},
      },
    });

    expect(assessment.validated).toBe(false);
    expect(assessment.validationBlockers).toContain('provider_validation_evidence_missing');
    expect(assessment.validationBlockers).toContain('provider_capability_test_not_passed:catalog');
  });

  it('treats an active kill switch as an independent production blocker', () => {
    const assessment = assessSupplierProviderActivation({
      provider: 'avasam',
      requiredCapabilities: ['catalog'],
      evidence: {
        ...BASE_EVIDENCE,
        capabilityTests: { catalog: true },
        ownerApprovalRecorded: true,
        productionEnableRequested: true,
        killSwitchActive: true,
      },
    });

    expect(assessment.validated).toBe(true);
    expect(assessment.productionEnabled).toBe(false);
    expect(assessment.productionBlockers).toContain('provider_kill_switch_active');
  });
});
