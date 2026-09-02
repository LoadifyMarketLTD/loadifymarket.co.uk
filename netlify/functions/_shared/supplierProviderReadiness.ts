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
  | 'developer_review_underway'
  | 'compliance_blocked';

export type SupplierProviderBlockingDependency =
  | 'provider_transactional_evidence'
  | 'sandbox_credentials'
  | 'controlled_sandbox_identifiers'
  | 'authentic_supplier'
  | 'partner_retailer_api_access'
  | 'directory_api_approval'
  | 'marketplace_resale_permission'
  | 'developer_review_result'
  | 'developer_api_approval'
  | 'uk_import_compliance_controls';

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
  blockingDependencies: readonly SupplierProviderBlockingDependency[];
  providerActivationBlocked: boolean;
  externalDependency: boolean;
  platformEngineeringBlocked: false;
  nextAction: string;
  capabilityPromotionPerformed: false;
  providerWriteActivationPerformed: false;
}

function readinessFor(definition: SupplierProviderDefinition): Pick<
  SupplierProviderReadinessV1,
  'readinessState' | 'blockingDependencies' | 'providerActivationBlocked' | 'externalDependency' | 'nextAction'
> {
  switch (definition.key) {
    case 'avasam':
      return {
        readinessState: 'read_only_verified',
        blockingDependencies: ['provider_transactional_evidence'],
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Keep verified read-only capabilities available while awaiting authoritative transactional Gate B evidence; do not block unrelated platform engineering.',
      };
    case 'bigbuy':
      return {
        readinessState: 'sandbox_evidence_required',
        blockingDependencies: ['sandbox_credentials', 'controlled_sandbox_identifiers'],
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Configure an authorised BigBuy sandbox API key plus controlled taxonomy/product/variation identifiers, then run the admin-only sandbox verification gate.',
      };
    case 'direct_supplier':
      return {
        readinessState: 'authentic_supplier_required',
        blockingDependencies: ['authentic_supplier'],
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Onboard and approve one authentic UK/EU supplier in Supplier Foundation, then execute the existing Phase E identity capture and Phase F import-review workflow under admin control.',
      };
    case 'appscenic':
      return {
        readinessState: 'partner_access_required',
        blockingDependencies: ['partner_retailer_api_access'],
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Obtain explicit AppScenic retailer-side Public API access and compatible commercial terms. Supplier Public API availability is not retailer API evidence; keep the provider inactive until runtime evidence exists.',
      };
    case 'salehoo':
      return {
        readinessState: 'directory_api_approval_required',
        blockingDependencies: ['directory_api_approval'],
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Use SaleHoo primarily for supplier discovery/due diligence unless Developer API access is explicitly approved; do not treat directory or API access as commerce execution capability.',
      };
    case 'spocket':
      return {
        readinessState: 'contract_blocked',
        blockingDependencies: ['marketplace_resale_permission'],
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Do not integrate Spocket into the Loadify Market marketplace model until written marketplace-resale permission and compatible commercial terms are confirmed.',
      };
    case 'aliexpress_dsers':
      return {
        readinessState: 'developer_review_underway',
        blockingDependencies: ['developer_review_result', 'uk_import_compliance_controls'],
        providerActivationBlocked: true,
        externalDependency: true,
        nextAction: 'Wait for the DSers Sales Channel Application review result. Do not treat the generic welcome/onboarding email as API approval. If approved, keep the provider inactive until the authorised development/sandbox contract is verified and UK import VAT, customs, product-safety, landed-cost and returns controls are complete and reviewed.',
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
    blockingDependencies: readiness.blockingDependencies,
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
