import type { SupplierAdapterCapability } from './supplierAdapter';
import {
  getSupplierProviderDefinition,
  type SupplierProviderKey,
} from './supplierProviderRegistry';
import { getSupplierProviderReadiness } from './supplierProviderReadiness';

export const SUPPLIER_PROVIDER_ACTIVATION_INTERFACE_VERSION = 1 as const;

export type SupplierProviderActivationStage =
  | 'unconfigured'
  | 'configured'
  | 'validated'
  | 'production_enabled';

export interface SupplierProviderActivationEvidenceV1 {
  /** Secrets are never accepted here; this is trusted runtime evidence only. */
  credentialsConfigured: boolean;
  credentialsValidated: boolean;
  contractConfirmed: boolean;
  capabilityTests: Partial<Record<SupplierAdapterCapability, boolean>>;
  securityChecksPassed: boolean;
  evidenceRefs: readonly string[];
  ownerApprovalRecorded: boolean;
  productionEnableRequested: boolean;
  killSwitchActive: boolean;
}

export interface SupplierProviderActivationAssessmentV1 {
  interfaceVersion: typeof SUPPLIER_PROVIDER_ACTIVATION_INTERFACE_VERSION;
  provider: SupplierProviderKey;
  stage: SupplierProviderActivationStage;
  configured: boolean;
  validated: boolean;
  productionEnabled: boolean;
  requiredCapabilities: readonly SupplierAdapterCapability[];
  verifiedCapabilities: readonly SupplierAdapterCapability[];
  configurationBlockers: readonly string[];
  validationBlockers: readonly string[];
  productionBlockers: readonly string[];
  providerActivationBlocked: boolean;
  hostedActivation: 'off';
  externalMutationPerformed: false;
  customerPiiDisclosurePerformed: false;
  financialMutationPerformed: false;
}

function uniqueCapabilities(
  capabilities: readonly SupplierAdapterCapability[],
): SupplierAdapterCapability[] {
  return [...new Set(capabilities)];
}

function normalizedEvidenceRefs(refs: readonly string[]): string[] {
  return [...new Set(refs.map(ref => ref.trim()).filter(Boolean))];
}

/**
 * Provider-level activation policy.
 *
 * This evaluator deliberately does not inspect raw credentials and cannot
 * activate a provider. Trusted callers supply evidence facts; the evaluator
 * then cross-checks those facts against the canonical provider registry.
 * A caller cannot make an unverified capability valid simply by setting a
 * boolean: every required capability must already exist in
 * `verifiedCapabilities` and must have an explicit validation test PASS.
 *
 * `configured`, `validated` and `production_enabled` are intentionally distinct.
 * Production additionally requires the provider readiness gate to be open, the
 * canonical hosted activation state to be enabled by a separate reviewed code
 * change, owner approval, an explicit enable request and a clear kill switch.
 * The current provider registry exposes hosted activation as `off` only, so this
 * policy can assess up to `validated` but cannot silently invent an ON state.
 */
export function assessSupplierProviderActivation(input: {
  provider: SupplierProviderKey;
  requiredCapabilities: readonly SupplierAdapterCapability[];
  evidence: SupplierProviderActivationEvidenceV1;
}): SupplierProviderActivationAssessmentV1 {
  const definition = getSupplierProviderDefinition(input.provider);
  const readiness = getSupplierProviderReadiness(input.provider);
  const requiredCapabilities = uniqueCapabilities(input.requiredCapabilities);
  const evidenceRefs = normalizedEvidenceRefs(input.evidence.evidenceRefs);

  const configurationBlockers: string[] = [];
  if (!input.evidence.credentialsConfigured) {
    configurationBlockers.push('provider_credentials_not_configured');
  }

  const validationBlockers = [...configurationBlockers];
  if (!input.evidence.credentialsValidated) {
    validationBlockers.push('provider_credentials_not_validated');
  }
  if (!input.evidence.contractConfirmed) {
    validationBlockers.push('provider_contract_not_confirmed');
  }
  if (!input.evidence.securityChecksPassed) {
    validationBlockers.push('provider_security_checks_not_passed');
  }
  if (evidenceRefs.length === 0) {
    validationBlockers.push('provider_validation_evidence_missing');
  }

  for (const capability of requiredCapabilities) {
    if (!definition.verifiedCapabilities.includes(capability)) {
      validationBlockers.push(`provider_capability_not_verified:${capability}`);
      continue;
    }
    if (input.evidence.capabilityTests[capability] !== true) {
      validationBlockers.push(`provider_capability_test_not_passed:${capability}`);
    }
  }

  const productionBlockers = [...validationBlockers];
  if (readiness.providerActivationBlocked) {
    productionBlockers.push('provider_readiness_gate_blocked');
  }
  // Registry truth is deliberately OFF-only today. A future ON state requires
  // an explicit schema/type/code review rather than a caller-provided boolean.
  productionBlockers.push('provider_hosted_activation_not_enabled');
  if (!input.evidence.ownerApprovalRecorded) {
    productionBlockers.push('provider_owner_approval_not_recorded');
  }
  if (!input.evidence.productionEnableRequested) {
    productionBlockers.push('provider_production_enable_not_requested');
  }
  if (input.evidence.killSwitchActive) {
    productionBlockers.push('provider_kill_switch_active');
  }

  const configured = configurationBlockers.length === 0;
  const validated = validationBlockers.length === 0;
  const productionEnabled = productionBlockers.length === 0;
  const stage: SupplierProviderActivationStage = !configured
    ? 'unconfigured'
    : !validated
      ? 'configured'
      : !productionEnabled
        ? 'validated'
        : 'production_enabled';

  return Object.freeze({
    interfaceVersion: SUPPLIER_PROVIDER_ACTIVATION_INTERFACE_VERSION,
    provider: input.provider,
    stage,
    configured,
    validated,
    productionEnabled,
    requiredCapabilities,
    verifiedCapabilities: [...definition.verifiedCapabilities],
    configurationBlockers: [...new Set(configurationBlockers)],
    validationBlockers: [...new Set(validationBlockers)],
    productionBlockers: [...new Set(productionBlockers)],
    providerActivationBlocked: readiness.providerActivationBlocked,
    hostedActivation: definition.hostedActivation,
    externalMutationPerformed: false,
    customerPiiDisclosurePerformed: false,
    financialMutationPerformed: false,
  });
}
