import {
  createProviderCapabilityRegistry,
  type ProviderCapabilityRegistry,
} from './autonomousCapabilityRegistry';
import type { ProviderCapabilityRecord } from './autonomousOperationsFoundation';
import {
  getAvasamCommercialCapabilityDecision,
  type AvasamCommercialCapabilityClassification,
} from './avasamCommercialCapabilityPolicy';
import {
  getSupplierProviderDefinition,
  type SupplierProviderKey,
} from './supplierProviderRegistry';
import type { SupplierAdapterCapability } from './supplierAdapter';

export const PROVIDER_EXECUTION_CONTRACT_INTERFACE_VERSION = 1 as const;

export const PROVIDER_EXECUTION_CAPABILITIES = [
  'supplier_identity',
  'catalog',
  'variants',
  'stock',
  'price',
  'shipping',
  'order_submission',
  'acknowledgement',
  'tracking',
  'cancellation',
  'returns',
  'reimbursement',
] as const satisfies readonly SupplierAdapterCapability[];

export type ProviderExecutionContractProvider = Extract<
  SupplierProviderKey,
  'avasam' | 'bigbuy' | 'direct_supplier'
>;

export type ProviderExecutionContractStatus =
  | 'verified_read'
  | 'manual_only'
  | 'unverified'
  | 'blocked'
  | 'unavailable';

export type ProviderExecutionImpact = 'read' | 'write' | 'pii' | 'financial';

export interface ProviderExecutionContractV1 {
  interfaceVersion: typeof PROVIDER_EXECUTION_CONTRACT_INTERFACE_VERSION;
  provider: ProviderExecutionContractProvider;
  capability: SupplierAdapterCapability;
  status: ProviderExecutionContractStatus;
  impacts: ProviderExecutionImpact[];
  blockers: string[];
  evidenceRefs: string[];
  record: ProviderCapabilityRecord;
}

function impactsFor(capability: SupplierAdapterCapability): ProviderExecutionImpact[] {
  switch (capability) {
    case 'order_submission': return ['write', 'pii'];
    case 'tracking': return ['read', 'pii'];
    case 'cancellation': return ['write'];
    case 'returns': return ['write', 'pii'];
    case 'reimbursement': return ['read', 'financial'];
    default: return ['read'];
  }
}

function baseRecord(input: {
  provider: ProviderExecutionContractProvider;
  capability: SupplierAdapterCapability;
  verified: boolean;
  verificationStatus: ProviderCapabilityRecord['verificationStatus'];
  evidenceSource: string | null;
  evidenceVersion: string | null;
  lastVerifiedAt: string | null;
  readAllowed: boolean;
  autonomyLevel: ProviderCapabilityRecord['autonomyLevel'];
}): ProviderCapabilityRecord {
  return {
    provider: input.provider,
    capability: input.capability,
    verified: input.verified,
    verificationStatus: input.verificationStatus,
    evidenceSource: input.evidenceSource,
    evidenceVersion: input.evidenceVersion,
    lastVerifiedAt: input.lastVerifiedAt,
    verificationTtlHours: null,
    readAllowed: input.readAllowed,
    writeAllowed: false,
    piiAllowed: false,
    idempotencyKnown: false,
    lostResponseRecoveryKnown: false,
    rateLimitKnown: false,
    autonomyLevel: input.autonomyLevel,
    killSwitchActive: false,
  };
}

function avasamStatus(classification: AvasamCommercialCapabilityClassification): ProviderExecutionContractStatus {
  if (classification === 'VERIFIED_IMPLEMENTABLE') return 'verified_read';
  if (classification === 'VERIFIED_MANUAL_ONLY') return 'manual_only';
  if (classification === 'NOT_SUPPORTED') return 'unavailable';
  return 'blocked';
}

function avasamContract(capability: SupplierAdapterCapability): ProviderExecutionContractV1 {
  const decision = getAvasamCommercialCapabilityDecision(capability);
  const status = avasamStatus(decision.classification);
  const verifiedRead = status === 'verified_read';
  const manualOnly = status === 'manual_only';
  const evidenceRef = `avasam-gate-b:${capability}:2026-08-30`;

  return {
    interfaceVersion: PROVIDER_EXECUTION_CONTRACT_INTERFACE_VERSION,
    provider: 'avasam',
    capability,
    status,
    impacts: impactsFor(capability),
    blockers: [...decision.blockers],
    evidenceRefs: decision.evidence.trim() ? [evidenceRef] : [],
    record: baseRecord({
      provider: 'avasam',
      capability,
      verified: verifiedRead || manualOnly,
      verificationStatus: verifiedRead ? 'runtime_verified' : manualOnly ? 'contract_verified' : 'unverified',
      evidenceSource: verifiedRead || manualOnly ? 'avasam-gate-b' : null,
      evidenceVersion: verifiedRead || manualOnly ? '2026-08-30' : null,
      lastVerifiedAt: verifiedRead || manualOnly ? '2026-08-30T00:00:00.000Z' : null,
      readAllowed: verifiedRead,
      autonomyLevel: verifiedRead ? 'observe' : manualOnly ? 'human_approval' : 'disabled',
    }),
  };
}

function unverifiedProviderContract(
  provider: Exclude<ProviderExecutionContractProvider, 'avasam'>,
  capability: SupplierAdapterCapability,
): ProviderExecutionContractV1 {
  const definition = getSupplierProviderDefinition(provider);
  const targeted = definition.potentialCapabilities.includes(capability);
  const status: ProviderExecutionContractStatus = targeted ? 'unverified' : 'unavailable';

  return {
    interfaceVersion: PROVIDER_EXECUTION_CONTRACT_INTERFACE_VERSION,
    provider,
    capability,
    status,
    impacts: impactsFor(capability),
    blockers: targeted
      ? [`${provider}_runtime_or_contract_evidence_missing`]
      : [`${provider}_capability_not_in_current_research_target`],
    evidenceRefs: [],
    record: baseRecord({
      provider,
      capability,
      verified: false,
      verificationStatus: 'unverified',
      evidenceSource: null,
      evidenceVersion: null,
      lastVerifiedAt: null,
      readAllowed: false,
      autonomyLevel: 'disabled',
    }),
  };
}

export function listProviderExecutionContracts(): ProviderExecutionContractV1[] {
  return PROVIDER_EXECUTION_CAPABILITIES.flatMap(capability => [
    avasamContract(capability),
    unverifiedProviderContract('bigbuy', capability),
    unverifiedProviderContract('direct_supplier', capability),
  ]);
}

export function getProviderExecutionContract(
  provider: ProviderExecutionContractProvider,
  capability: SupplierAdapterCapability,
): ProviderExecutionContractV1 {
  return provider === 'avasam'
    ? avasamContract(capability)
    : unverifiedProviderContract(provider, capability);
}

/**
 * Capability Registry bridge for Lane G. The registry receives only the
 * explicit evidence state above; no provider capability is inferred from the
 * existence of an adapter method or public documentation.
 */
export function createProviderExecutionCapabilityRegistry(): ProviderCapabilityRegistry {
  return createProviderCapabilityRegistry(
    listProviderExecutionContracts().map(contract => contract.record),
  );
}
