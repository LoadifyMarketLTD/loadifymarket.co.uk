import { AvasamAdapterV1 } from './avasamAdapter';
import {
  AVASAM_GATE_B_CAPABILITIES,
  AVASAM_VERIFIED_IMPLEMENTABLE_CAPABILITIES,
} from './avasamCommercialCapabilityPolicy';
import { InactiveSupplierAdapterV1 } from './inactiveSupplierAdapter';
import type { SupplierAdapterCapability, SupplierAdapterV1 } from './supplierAdapter';

export const SUPPLIER_PROVIDER_KEYS = [
  'avasam',
  'bigbuy',
  'direct_supplier',
  'syncee',
  'appscenic',
  'salehoo',
  'spocket',
  'aliexpress_dsers',
] as const;

export type SupplierProviderKey = (typeof SUPPLIER_PROVIDER_KEYS)[number];

export type SupplierProviderCodeState =
  | 'verified_read_only'
  | 'scaffolded_unverified'
  | 'partner_access_required'
  | 'directory_api_approval_required'
  | 'contract_blocked'
  | 'future_compliance_gate';

export type SupplierProviderRole =
  | 'supplier_network'
  | 'direct_supplier'
  | 'supplier_directory'
  | 'marketplace_retail_source';

export interface SupplierProviderDefinition {
  key: SupplierProviderKey;
  label: string;
  role: SupplierProviderRole;
  codeState: SupplierProviderCodeState;
  /** Hosted Supplier Commerce activation remains OFF independently of code readiness. */
  hostedActivation: 'off';
  /** Capabilities proven in Loadify code/live-provider evidence. Empty means none verified. */
  verifiedCapabilities: readonly SupplierAdapterCapability[];
  /** Research targets only. These MUST NOT be treated as enabled or provider-verified capabilities. */
  potentialCapabilities: readonly SupplierAdapterCapability[];
  requiresProviderOrPartnerApproval: boolean;
  notes: string;
}

const DIRECT_SUPPLIER_TARGETS = [
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

const BIGBUY_RESEARCH_TARGETS = [
  'catalog',
  'variants',
  'stock',
  'price',
  'shipping',
  'order_submission',
  'acknowledgement',
  'tracking',
] as const satisfies readonly SupplierAdapterCapability[];

const READ_TARGETS = [
  'catalog',
  'variants',
  'stock',
  'price',
] as const satisfies readonly SupplierAdapterCapability[];

const ASIA_RESEARCH_TARGETS = [
  'catalog',
  'variants',
  'stock',
  'price',
  'order_submission',
  'tracking',
] as const satisfies readonly SupplierAdapterCapability[];

const DEFINITIONS: Record<SupplierProviderKey, SupplierProviderDefinition> = {
  avasam: {
    key: 'avasam',
    label: 'Avasam',
    role: 'supplier_network',
    codeState: 'verified_read_only',
    hostedActivation: 'off',
    verifiedCapabilities: AVASAM_VERIFIED_IMPLEMENTABLE_CAPABILITIES,
    potentialCapabilities: AVASAM_GATE_B_CAPABILITIES,
    requiresProviderOrPartnerApproval: false,
    notes: 'Controlled GB read-only pilot exists. Gate B classifies every SupplierAdapterV1 capability and keeps commercial/write capabilities fail-closed until provider evidence promotes them.',
  },
  bigbuy: {
    key: 'bigbuy',
    label: 'BigBuy',
    role: 'supplier_network',
    codeState: 'scaffolded_unverified',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: BIGBUY_RESEARCH_TARGETS,
    requiresProviderOrPartnerApproval: true,
    notes: 'Official API/sandbox surfaces exist, but Loadify has not verified credentials or live provider contracts yet.',
  },
  direct_supplier: {
    key: 'direct_supplier',
    label: 'Loadify Direct Supplier',
    role: 'direct_supplier',
    codeState: 'scaffolded_unverified',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: DIRECT_SUPPLIER_TARGETS,
    requiresProviderOrPartnerApproval: false,
    notes: 'Provider-neutral contract for direct UK/EU manufacturers and wholesalers; no supplier is activated by this scaffold.',
  },
  syncee: {
    key: 'syncee',
    label: 'Syncee',
    role: 'supplier_network',
    codeState: 'partner_access_required',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: READ_TARGETS,
    requiresProviderOrPartnerApproval: true,
    notes: 'Current custom-platform webhook documentation is supplier-side order intake only and explicitly does not provide catalog access. Do not infer retailer catalog/order API access without explicit Syncee partner enablement and evidence.',
  },
  appscenic: {
    key: 'appscenic',
    label: 'AppScenic',
    role: 'supplier_network',
    codeState: 'partner_access_required',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: READ_TARGETS,
    requiresProviderOrPartnerApproval: true,
    notes: 'AppScenic documents a Supplier Public API while its current integrations page says a retailer Public API is still upcoming. Keep inactive until retailer-side access and compatible contracts are explicitly available to Loadify.',
  },
  salehoo: {
    key: 'salehoo',
    label: 'SaleHoo',
    role: 'supplier_directory',
    codeState: 'directory_api_approval_required',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: ['supplier_identity', 'catalog'],
    requiresProviderOrPartnerApproval: true,
    notes: 'Treat primarily as supplier discovery/due-diligence. Developer API registration requires approval, and API access must not be treated as commerce execution authority.',
  },
  spocket: {
    key: 'spocket',
    label: 'Spocket',
    role: 'marketplace_retail_source',
    codeState: 'contract_blocked',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: [],
    requiresProviderOrPartnerApproval: true,
    notes: 'Current retailer guidance permits supported standalone store channels but restricts third-party marketplace resale. Keep Loadify Market integration contract-blocked until explicit written permission is compatible with the marketplace model.',
  },
  aliexpress_dsers: {
    key: 'aliexpress_dsers',
    label: 'AliExpress / DSers',
    role: 'marketplace_retail_source',
    codeState: 'future_compliance_gate',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: ASIA_RESEARCH_TARGETS,
    requiresProviderOrPartnerApproval: true,
    notes: 'DSers now documents Developer/Open API registration for third-party integrations. Keep future-only until Loadify receives developer approval and UK import VAT, customs, product safety, landed-cost and returns controls are complete.',
  },
};

export function listSupplierProviderDefinitions(): readonly SupplierProviderDefinition[] {
  return SUPPLIER_PROVIDER_KEYS.map(key => DEFINITIONS[key]);
}

export function getSupplierProviderDefinition(key: SupplierProviderKey): SupplierProviderDefinition {
  return DEFINITIONS[key];
}

/**
 * Creates an adapter for a known provider without activating hosted commerce.
 * Only Avasam currently receives its verified read-only implementation.
 * Every other provider receives a zero-capability fail-closed scaffold.
 */
export function createSupplierProviderAdapter(key: SupplierProviderKey): SupplierAdapterV1 {
  if (key === 'avasam') return new AvasamAdapterV1();
  return new InactiveSupplierAdapterV1(key);
}
