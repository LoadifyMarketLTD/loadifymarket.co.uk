export const AVASAM_PILOT_SKU = 'S0671779793' as const;
export const AVASAM_PILOT_SUPPLIER_REF = 'GB010107' as const;

export type AvasamSupplierAction = 'read_only_source_pilot' | 'listing' | 'order_submission';

export interface AvasamSupplierGateInput {
  supplierRef: string;
  sku: string;
  termsAccepted: boolean;
  action: AvasamSupplierAction;
}

/**
 * Supplier-specific terms presented by Avasam for GB010107.
 *
 * This is deliberately declarative and fail-closed. It does not accept terms,
 * source a product, enable a marketplace listing, submit an order or write any
 * Supplier Commerce hosted state.
 */
export const AVASAM_GB010107_POLICY = {
  supplierRef: AVASAM_PILOT_SUPPLIER_REF,
  pilotSku: AVASAM_PILOT_SKU,
  territory: 'GB',
  commercialActivation: 'blocked',
  ordersPermissionRequired: false,
  piiRequired: false,
  listingEnabled: false,
  orderSubmissionEnabled: false,
  sourcing: {
    termsAcceptanceRequired: true,
    pilotOnly: true,
  },
  pricing: {
    priceChanges: 'real_time',
    standardNoticePeriodApplies: false,
    automatedPricingRuleRequiredBeforeListing: true,
    marginFloorRequiredBeforeListing: true,
  },
  returns: {
    nonFaultyReturnsAcceptedBySupplier: false,
    retailerCarriesCustomerRefundExposure: true,
    supplierRecoveryForChangeOfMind: false,
  },
  cancellation: {
    standardCancellationDisabled: true,
    avasamSupportRequired: true,
    indicativeRequestWindowMinutes: 120,
    guaranteed: false,
  },
  shipping: {
    internationalSupported: false,
    remoteUkRequiresQuote: true,
    carriersAsPresented: ['Roymail', 'DPD', 'EVRI', 'Yodel'],
    dispatchTerms: {
      summary: '2 business day',
      detailedTerms: 'within 24 hours on Business Days',
      conflictStatus: 'unresolved',
    },
    deliveryTerms: {
      summary: '3-10 business days',
      detailedTerms: 'tracked 3 to 5 day UK shipping only',
      conflictStatus: 'unresolved',
    },
  },
} as const;

export interface AvasamSupplierGateDecision {
  eligible: boolean;
  blockers: string[];
}

export function evaluateAvasamGb010107Gate(input: AvasamSupplierGateInput): AvasamSupplierGateDecision {
  const blockers: string[] = [];

  if (input.supplierRef !== AVASAM_PILOT_SUPPLIER_REF) blockers.push('supplier_not_approved_for_this_policy');
  if (input.sku !== AVASAM_PILOT_SKU) blockers.push('sku_outside_controlled_pilot');
  if (!input.termsAccepted) blockers.push('supplier_terms_not_accepted');

  if (input.action === 'read_only_source_pilot') {
    return { eligible: blockers.length === 0, blockers };
  }

  if (input.action === 'listing') {
    blockers.push(
      'commercial_activation_off',
      'automated_pricing_rule_not_verified',
      'margin_floor_not_verified',
      'dispatch_sla_conflict_unresolved',
      'delivery_sla_conflict_unresolved',
      'remote_postcode_policy_not_verified',
      'non_faulty_returns_economics_not_approved',
    );
    return { eligible: false, blockers };
  }

  blockers.push('orders_permission_off', 'order_submission_capability_disabled', 'commercial_activation_off');
  return { eligible: false, blockers };
}
