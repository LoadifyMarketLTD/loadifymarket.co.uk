import {
  listSupplierProviderDefinitions,
  type SupplierProviderCodeState,
  type SupplierProviderDefinition,
  type SupplierProviderKey,
} from './supplierProviderRegistry';
import type { SupplierAdapterCapability } from './supplierAdapter';

export const SUPPLIER_PROVIDER_READINESS_INTERFACE_VERSION = 1 as const;

export type SupplierProviderReadinessState =
  | 'read_only_verified'
  | 'sandbox_evidence_required'
  | 'authentic_supplier_required'
  | 'partner_access_required'
  | 'directory_api_approval_required'
  | 'contract_blocked'
  | 'compliance_blocked';

export interface SupplierProviderReadinessV1 {
  interfaceVersion: typeof SUPPLIER_PROVIDER_READINESS_INTERFACE_VERSION;
  provider: SupplierProviderKey;
  label: string;
  role: SupplierProviderDefinition['role'];
  codeState: SupplierProviderCodeState;
  readinessState: SupplierProviderReadinessState;
  hostedActivation: 'off';
  verifiedCapabilities: readonly SupplierAdapterCapability[];
  potentialCapabilities: readonly SupplierAdapterCapability[];
  providerActivationBlocked: boolean;
  externalDependency: boolean;
  platformEngineeringBlocked: false;
  nextAction: string;
  capabilityPromotionPerformed: false;
  providerWriteActivationPerformed: false;
}

function readinessFor(definition: SupplierProviderDefinition): Pick<
  SupplierProviderReadinessV1,
  'readinessState' | 'providerActivationBlocked' | 'externalDependency' | 'nextAction'
> {
  switch (definition.key) {
    case 'avasam':
      return {
        readinessState: 'read_only_verified',
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Keep verified read-only capabilities available while awaiting authoritative transactional Gate B evidence; do not block unrelated platform engineering.',
      };
    case 'bigbuy':
      return {
        readinessState: 'sandbox_evidence_required',
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Configure an authorised BigBuy sandbox API key plus controlled taxonomy/product/variation identifiers, then run the admin-only sandbox verification gate.',
      };
    case 'direct_supplier':
      return {
        readinessState: 'authentic_supplier_required',
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Onboard and approve one authentic UK/EU supplier in Supplier Foundation, then execute the existing Phase E identity capture and Phase F import-review workflow under admin control.',
      };
    case 'syncee':
    case 'appscenic':
      return {
        readinessState: 'partner_access_required',
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: `Obtain explicit retailer/custom-platform partner API access from ${definition.label}; keep the provider inactive until contract and runtime evidence exist.`,
      };
    case 'salehoo':
      return {
        readinessState: 'directory_api_approval_required',
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Use SaleHoo primarily for supplier discovery/due diligence unless Developer API access is explicitly approved; do not treat directory access as commerce capability.',
      };
    case 'spocket':
      return {
        readinessState: 'contract_blocked',
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Do not integrate until written marketplace-resale permission and compatible commercial terms are confirmed.',
      };
    case 'aliexpress_dsers':
      return {
        readinessState: 'compliance_blocked',
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Defer until UK import VAT, customs, product-safety, landed-cost and returns controls are complete and reviewed.',
      };
  }
}

export function getSupplierProviderReadiness(
  provider: SupplierProviderKey,
): SupplierProviderReadinessV1 {
  const definition = listSupplierProviderDefinitions().find(item => item.key === provider);
  if (!definition) throw new Error(`Unknown supplier provider '${provider}'`);
  const readiness = readinessFor(definition);

  return {
    interfaceVersion: SUPPLIER_PROVIDER_READINESS_INTERFACE_VERSION,
    provider: definition.key,
    label: definition.label,
    role: definition.role,
    codeState: definition.codeState,
    readinessState: readiness.readinessState,
    hostedActivation: definition.hostedActivation,
    verifiedCapabilities: definition.verifiedCapabilities,
    potentialCapabilities: definition.potentialCapabilities,
    providerActivationBlocked: readiness.providerActivationBlocked,
    externalDependency: readiness.externalDependency,
    platformEngineeringBlocked: false,
    nextAction: readiness.nextAction,
    capabilityPromotionPerformed: false,
    providerWriteActivationPerformed: false,
  };
}

export function listSupplierProviderReadiness(): SupplierProviderReadinessV1[] {
  return listSupplierProviderDefinitions().map(definition => getSupplierProviderReadiness(definition.key));
}
