import type { DirectSupplierFeedTransport } from './directSupplierContract';

export const SUPPLIER_SOURCE_POLICY_VERSION = 1 as const;

export const SUPPLIER_SOURCE_CHANNELS = [
  'direct_supplier_network',
  'supplier_aggregator',
  'wholesale_catalog_feed',
  'product_discovery',
  'multi_supplier_routing',
] as const;

export type SupplierSourceChannel = (typeof SUPPLIER_SOURCE_CHANNELS)[number];

export type SupplierSourceTransport =
  | DirectSupplierFeedTransport
  | 'partner_api'
  | 'partner_feed'
  | 'web_discovery'
  | 'none';

export interface SupplierSourcePolicy {
  channel: SupplierSourceChannel;
  label: string;
  allowedTransports: readonly SupplierSourceTransport[];
  mayCreateStagingCandidates: boolean;
  mayCreateSupplierOffers: boolean;
  mayBecomeBuyerVisibleWithoutSupplierAuthority: false;
  requiresSupplierIdentity: boolean;
  requiresCommercialTerms: boolean;
  requiresRightsAndCompliance: boolean;
  notes: string;
}

const POLICIES: Record<SupplierSourceChannel, SupplierSourcePolicy> = {
  direct_supplier_network: {
    channel: 'direct_supplier_network',
    label: 'Direct Supplier Network',
    allowedTransports: ['json_api', 'json_feed', 'feed_url', 'csv', 'xml', 'sftp', 'manual_catalog'],
    mayCreateStagingCandidates: true,
    mayCreateSupplierOffers: true,
    mayBecomeBuyerVisibleWithoutSupplierAuthority: false,
    requiresSupplierIdentity: true,
    requiresCommercialTerms: true,
    requiresRightsAndCompliance: true,
    notes: 'Manufacturers, importers, wholesalers and distributors contracted directly by Loadify. No warehouse assumption.',
  },
  supplier_aggregator: {
    channel: 'supplier_aggregator',
    label: 'Supplier Aggregators',
    allowedTransports: ['partner_api', 'partner_feed'],
    mayCreateStagingCandidates: true,
    mayCreateSupplierOffers: true,
    mayBecomeBuyerVisibleWithoutSupplierAuthority: false,
    requiresSupplierIdentity: true,
    requiresCommercialTerms: true,
    requiresRightsAndCompliance: true,
    notes: 'Avasam, Syncee, AppScenic and future networks are adapters, never the Loadify commerce core.',
  },
  wholesale_catalog_feed: {
    channel: 'wholesale_catalog_feed',
    label: 'Wholesale & Catalog Feeds',
    allowedTransports: ['json_api', 'json_feed', 'feed_url', 'csv', 'xml', 'sftp', 'manual_catalog'],
    mayCreateStagingCandidates: true,
    mayCreateSupplierOffers: true,
    mayBecomeBuyerVisibleWithoutSupplierAuthority: false,
    requiresSupplierIdentity: true,
    requiresCommercialTerms: true,
    requiresRightsAndCompliance: true,
    notes: 'Supplier-held stock imported from structured wholesale feeds with periodic price and inventory refresh.',
  },
  product_discovery: {
    channel: 'product_discovery',
    label: 'Product Discovery',
    allowedTransports: ['web_discovery', 'manual_catalog'],
    mayCreateStagingCandidates: true,
    mayCreateSupplierOffers: false,
    mayBecomeBuyerVisibleWithoutSupplierAuthority: false,
    requiresSupplierIdentity: false,
    requiresCommercialTerms: false,
    requiresRightsAndCompliance: true,
    notes: 'Discovery creates candidates only. A candidate must later resolve to an authorised supplier offer before commerce.',
  },
  multi_supplier_routing: {
    channel: 'multi_supplier_routing',
    label: 'Multi-Supplier Routing',
    allowedTransports: ['none'],
    mayCreateStagingCandidates: false,
    mayCreateSupplierOffers: false,
    mayBecomeBuyerVisibleWithoutSupplierAuthority: false,
    requiresSupplierIdentity: true,
    requiresCommercialTerms: true,
    requiresRightsAndCompliance: true,
    notes: 'Runtime selection across already-approved interchangeable offers for one canonical product.',
  },
};

export function listSupplierSourcePolicies(): readonly SupplierSourcePolicy[] {
  return SUPPLIER_SOURCE_CHANNELS.map(channel => POLICIES[channel]);
}

export function getSupplierSourcePolicy(channel: SupplierSourceChannel): SupplierSourcePolicy {
  return POLICIES[channel];
}

export interface SupplierSourceAdmissionInput {
  channel: SupplierSourceChannel;
  transport: SupplierSourceTransport;
  supplierIdentityVerified: boolean;
  commercialTermsApproved: boolean;
  rightsAndComplianceVerified: boolean;
  canonicalSupplierOfferApproved: boolean;
}

export interface SupplierSourceAdmissionResult {
  policyVersion: typeof SUPPLIER_SOURCE_POLICY_VERSION;
  eligibleForStaging: boolean;
  eligibleForSupplierOffer: boolean;
  eligibleForBuyerCommerce: boolean;
  reasons: string[];
}

export function evaluateSupplierSourceAdmission(
  input: SupplierSourceAdmissionInput,
): SupplierSourceAdmissionResult {
  const policy = getSupplierSourcePolicy(input.channel);
  const reasons: string[] = [];

  if (!policy.allowedTransports.includes(input.transport)) reasons.push('transport_not_allowed');
  if (policy.requiresSupplierIdentity && !input.supplierIdentityVerified) {
    reasons.push('supplier_identity_not_verified');
  }
  if (policy.requiresCommercialTerms && !input.commercialTermsApproved) {
    reasons.push('commercial_terms_not_approved');
  }
  if (policy.requiresRightsAndCompliance && !input.rightsAndComplianceVerified) {
    reasons.push('rights_or_compliance_not_verified');
  }

  const eligibleForStaging = policy.mayCreateStagingCandidates
    && !reasons.includes('transport_not_allowed');

  const eligibleForSupplierOffer = policy.mayCreateSupplierOffers
    && eligibleForStaging
    && (!policy.requiresSupplierIdentity || input.supplierIdentityVerified)
    && (!policy.requiresCommercialTerms || input.commercialTermsApproved)
    && (!policy.requiresRightsAndCompliance || input.rightsAndComplianceVerified);

  const eligibleForBuyerCommerce = eligibleForSupplierOffer
    && input.canonicalSupplierOfferApproved
    && input.supplierIdentityVerified
    && input.commercialTermsApproved
    && input.rightsAndComplianceVerified;

  if (input.channel === 'product_discovery' && input.canonicalSupplierOfferApproved) {
    reasons.push('discovery_candidate_cannot_become_commerce_directly');
  }
  if (input.channel === 'multi_supplier_routing' && !input.canonicalSupplierOfferApproved) {
    reasons.push('approved_supplier_offer_required_for_routing');
  }

  return {
    policyVersion: SUPPLIER_SOURCE_POLICY_VERSION,
    eligibleForStaging,
    eligibleForSupplierOffer,
    eligibleForBuyerCommerce: input.channel === 'product_discovery'
      ? false
      : eligibleForBuyerCommerce,
    reasons: [...new Set(reasons)],
  };
}
