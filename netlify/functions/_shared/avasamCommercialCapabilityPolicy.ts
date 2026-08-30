import type { SupplierAdapterCapability } from './supplierAdapter';

export type AvasamCommercialCapabilityClassification =
  | 'VERIFIED_IMPLEMENTABLE'
  | 'VERIFIED_MANUAL_ONLY'
  | 'REQUIRES_PII_PERMISSION'
  | 'REQUIRES_ORDERS_PERMISSION'
  | 'PROVIDER_CONTRACT_STILL_MISSING'
  | 'NOT_SUPPORTED';

export type AvasamRequiredPermission = 'orders' | 'pii';

export interface AvasamCommercialCapabilityDecision {
  capability: SupplierAdapterCapability;
  classification: AvasamCommercialCapabilityClassification;
  adapterAdvertisementAllowed: boolean;
  automatedExecutionAllowed: boolean;
  requiredPermissions: readonly AvasamRequiredPermission[];
  blockers: readonly string[];
  evidence: string;
}

/**
 * Complete SupplierAdapterV1 capability surface under review for Avasam Gate B.
 *
 * This is a commercial-readiness policy, not an activation switch. A capability
 * can be a research target while remaining unavailable in the runtime adapter.
 */
export const AVASAM_GATE_B_CAPABILITIES = [
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

const DECISIONS: Record<SupplierAdapterCapability, AvasamCommercialCapabilityDecision> = {
  supplier_identity: {
    capability: 'supplier_identity',
    classification: 'PROVIDER_CONTRACT_STILL_MISSING',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: [],
    blockers: ['supplier_identity_contract_not_live_verified'],
    evidence: 'No provider identity contract has been independently verified for the controlled Seller API pilot.',
  },
  catalog: {
    capability: 'catalog',
    classification: 'VERIFIED_IMPLEMENTABLE',
    adapterAdvertisementAllowed: true,
    automatedExecutionAllowed: true,
    requiredPermissions: [],
    blockers: [],
    evidence: 'GetSellerProductList was live-verified for controlled SKU S0671779793.',
  },
  variants: {
    capability: 'variants',
    classification: 'PROVIDER_CONTRACT_STILL_MISSING',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: [],
    blockers: ['variant_contract_not_live_verified'],
    evidence: 'Variation-related documentation exists, but Loadify has not independently verified a provider-neutral variant contract for the pilot.',
  },
  stock: {
    capability: 'stock',
    classification: 'VERIFIED_IMPLEMENTABLE',
    adapterAdvertisementAllowed: true,
    automatedExecutionAllowed: true,
    requiredPermissions: [],
    blockers: [],
    evidence: 'SellerStockList was live-verified for controlled SKU S0671779793.',
  },
  price: {
    capability: 'price',
    classification: 'VERIFIED_IMPLEMENTABLE',
    adapterAdvertisementAllowed: true,
    automatedExecutionAllowed: true,
    requiredPermissions: [],
    blockers: [],
    evidence: 'Numeric seller price from GetSellerProductList was live-verified and normalized to GBP minor units.',
  },
  shipping: {
    capability: 'shipping',
    classification: 'PROVIDER_CONTRACT_STILL_MISSING',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: [],
    blockers: [
      'shipping_service_discovery_contract_missing',
      'pre_order_shipping_quote_contract_missing',
      'remote_postcode_policy_not_verified',
      'dispatch_sla_conflict_unresolved',
      'delivery_sla_conflict_unresolved',
    ],
    evidence: 'No authoritative pre-order shipping service/quote API suitable for Loadify order construction has been verified.',
  },
  order_submission: {
    capability: 'order_submission',
    classification: 'PROVIDER_CONTRACT_STILL_MISSING',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: ['orders', 'pii'],
    blockers: [
      'orders_permission_off',
      'pii_permission_off',
      'canonical_order_create_endpoint_unconfirmed',
      'stable_provider_order_identifier_missing',
      'idempotency_contract_missing',
      'lost_response_recovery_contract_missing',
    ],
    evidence: 'CreateSellerOrder and AddNewOrder are documented, but the canonical endpoint, stable provider order ID and safe retry/recovery contract remain unverified.',
  },
  acknowledgement: {
    capability: 'acknowledgement',
    classification: 'PROVIDER_CONTRACT_STILL_MISSING',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: ['orders'],
    blockers: [
      'orders_permission_off',
      'stable_provider_order_identifier_missing',
      'lookup_by_seller_reference_not_verified',
      'lost_response_recovery_contract_missing',
    ],
    evidence: 'The documented create response does not provide a usable stable identifier and deterministic acknowledgement/reconciliation lookup remains unverified.',
  },
  tracking: {
    capability: 'tracking',
    classification: 'REQUIRES_PII_PERMISSION',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: ['orders', 'pii'],
    blockers: [
      'orders_permission_off',
      'pii_permission_off',
      'dedicated_tracking_only_endpoint_not_verified',
      'server_side_pii_minimisation_not_verified',
    ],
    evidence: 'GetProcessOrderList exposes tracking data together with substantial customer/order PII; no dedicated least-privilege tracking contract has been verified.',
  },
  cancellation: {
    capability: 'cancellation',
    classification: 'VERIFIED_MANUAL_ONLY',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: ['orders'],
    blockers: [
      'automated_cancellation_endpoint_not_documented',
      'gb010107_standard_cancellation_disabled',
      'avasam_support_flow_required',
    ],
    evidence: 'For controlled supplier GB010107, supplier terms require a support-mediated cancellation request and do not guarantee cancellation.',
  },
  returns: {
    capability: 'returns',
    classification: 'PROVIDER_CONTRACT_STILL_MISSING',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: ['orders', 'pii'],
    blockers: [
      'return_creation_endpoint_not_documented',
      'orders_permission_off',
      'pii_permission_off',
      'gb010107_non_faulty_returns_not_supported',
    ],
    evidence: 'Return-related states are observable in processed-order data, but no authoritative Seller API return-creation contract has been verified.',
  },
  reimbursement: {
    capability: 'reimbursement',
    classification: 'PROVIDER_CONTRACT_STILL_MISSING',
    adapterAdvertisementAllowed: false,
    automatedExecutionAllowed: false,
    requiredPermissions: ['orders'],
    blockers: [
      'reimbursement_action_or_finality_contract_not_documented',
      'orders_permission_off',
    ],
    evidence: 'Repayment/refund-related status data exists, but supplier-side financial recovery finality and reconciliation semantics are not verified.',
  },
};

export const AVASAM_VERIFIED_IMPLEMENTABLE_CAPABILITIES = AVASAM_GATE_B_CAPABILITIES.filter(
  capability => DECISIONS[capability].classification === 'VERIFIED_IMPLEMENTABLE',
) as readonly SupplierAdapterCapability[];

export function getAvasamCommercialCapabilityDecision(
  capability: SupplierAdapterCapability,
): AvasamCommercialCapabilityDecision {
  return DECISIONS[capability];
}

export function listAvasamCommercialCapabilityDecisions(): readonly AvasamCommercialCapabilityDecision[] {
  return AVASAM_GATE_B_CAPABILITIES.map(capability => DECISIONS[capability]);
}

export function canAdvertiseAvasamCapability(capability: SupplierAdapterCapability): boolean {
  const decision = DECISIONS[capability];
  return decision.classification === 'VERIFIED_IMPLEMENTABLE' && decision.adapterAdvertisementAllowed;
}
