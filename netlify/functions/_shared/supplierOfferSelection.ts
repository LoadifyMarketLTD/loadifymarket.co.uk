export const SUPPLIER_OFFER_SELECTION_INTERFACE_VERSION = 1 as const;

export interface SupplierOfferSelectionCandidate {
  supplierOfferId: string;
  supplierId: string;
  supplierKey: string;
  canonicalProductId: string;
  territory: string;
  currency: string;
  requestedQuantity: number;
  sellableQuantity: number | null;
  grossCustomerPrice: number;
  expectedContribution: number;
  minimumContribution: number;
  dispatchHours: number | null;
  returnWindowDays: number | null;
  trackingDeadlineHours: number | null;
  stockObservedAt: string;
  priceObservedAt: string;
  catalogEligible: boolean;
  economicsEligible: boolean;
  stockPriceEligible: boolean;
  shippingEligible: boolean;
  orderSubmissionEligible: boolean;
  acknowledgementEligible: boolean;
  trackingEligible: boolean;
  returnsEligible: boolean;
}

export interface SupplierOfferSelectionRejection {
  supplierOfferId: string;
  supplierKey: string;
  reasons: string[];
}

export interface SupplierOfferSelectionResult {
  interfaceVersion: typeof SUPPLIER_OFFER_SELECTION_INTERFACE_VERSION;
  eligible: boolean;
  reason: string;
  selected: SupplierOfferSelectionCandidate | null;
  ranked: SupplierOfferSelectionCandidate[];
  rejected: SupplierOfferSelectionRejection[];
}

export interface SupplierPromiseEnvelope {
  territory: string;
  currency: string;
  maxCustomerPrice: number;
  maxDispatchHours?: number | null;
  minReturnWindowDays?: number | null;
}

const isFiniteNonNegative = (value: number): boolean =>
  Number.isFinite(value) && value >= 0;

const isoTime = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function supplierOfferEligibilityReasons(
  candidate: SupplierOfferSelectionCandidate,
): string[] {
  const reasons: string[] = [];

  if (!candidate.catalogEligible) reasons.push('catalog_not_eligible');
  if (!candidate.economicsEligible) reasons.push('economics_not_eligible');
  if (!candidate.stockPriceEligible) reasons.push('stock_price_not_eligible');
  if (!candidate.shippingEligible) reasons.push('shipping_not_eligible');
  if (!candidate.orderSubmissionEligible) reasons.push('order_submission_not_eligible');
  if (!candidate.acknowledgementEligible) reasons.push('acknowledgement_not_eligible');
  if (!candidate.trackingEligible) reasons.push('tracking_not_eligible');
  if (!candidate.returnsEligible) reasons.push('returns_not_eligible');

  if (!Number.isSafeInteger(candidate.requestedQuantity) || candidate.requestedQuantity < 1) {
    reasons.push('invalid_requested_quantity');
  }
  if (candidate.sellableQuantity !== null
    && (!Number.isSafeInteger(candidate.sellableQuantity)
      || candidate.sellableQuantity < candidate.requestedQuantity)) {
    reasons.push('insufficient_sellable_quantity');
  }
  if (!isFiniteNonNegative(candidate.grossCustomerPrice)) reasons.push('invalid_customer_price');
  if (!isFiniteNonNegative(candidate.expectedContribution)) reasons.push('invalid_expected_contribution');
  if (!isFiniteNonNegative(candidate.minimumContribution)) reasons.push('invalid_minimum_contribution');
  if (candidate.expectedContribution < candidate.minimumContribution) reasons.push('margin_floor_failed');
  if (!/^[A-Z]{2}$/.test(candidate.territory)) reasons.push('invalid_territory');
  if (!/^[A-Z]{3}$/.test(candidate.currency)) reasons.push('invalid_currency');
  if (candidate.dispatchHours !== null
    && (!Number.isFinite(candidate.dispatchHours) || candidate.dispatchHours < 0)) {
    reasons.push('invalid_dispatch_sla');
  }
  if (candidate.returnWindowDays !== null
    && (!Number.isFinite(candidate.returnWindowDays) || candidate.returnWindowDays < 0)) {
    reasons.push('invalid_return_sla');
  }
  if (isoTime(candidate.stockObservedAt) <= 0) reasons.push('invalid_stock_observed_at');
  if (isoTime(candidate.priceObservedAt) <= 0) reasons.push('invalid_price_observed_at');

  return reasons;
}

function compareCandidates(
  left: SupplierOfferSelectionCandidate,
  right: SupplierOfferSelectionCandidate,
): number {
  const leftMarginHeadroom = left.expectedContribution - left.minimumContribution;
  const rightMarginHeadroom = right.expectedContribution - right.minimumContribution;
  if (leftMarginHeadroom !== rightMarginHeadroom) return rightMarginHeadroom - leftMarginHeadroom;

  const leftDispatch = left.dispatchHours ?? Number.POSITIVE_INFINITY;
  const rightDispatch = right.dispatchHours ?? Number.POSITIVE_INFINITY;
  if (leftDispatch !== rightDispatch) return leftDispatch - rightDispatch;

  if (left.grossCustomerPrice !== right.grossCustomerPrice) {
    return left.grossCustomerPrice - right.grossCustomerPrice;
  }

  const leftStock = left.sellableQuantity ?? -1;
  const rightStock = right.sellableQuantity ?? -1;
  if (leftStock !== rightStock) return rightStock - leftStock;

  const leftFreshness = Math.min(isoTime(left.stockObservedAt), isoTime(left.priceObservedAt));
  const rightFreshness = Math.min(isoTime(right.stockObservedAt), isoTime(right.priceObservedAt));
  if (leftFreshness !== rightFreshness) return rightFreshness - leftFreshness;

  return left.supplierOfferId.localeCompare(right.supplierOfferId);
}

export function selectSupplierOffer(
  candidates: readonly SupplierOfferSelectionCandidate[],
): SupplierOfferSelectionResult {
  const rejected: SupplierOfferSelectionRejection[] = [];
  const eligible: SupplierOfferSelectionCandidate[] = [];

  for (const candidate of candidates) {
    const reasons = supplierOfferEligibilityReasons(candidate);
    if (reasons.length > 0) {
      rejected.push({
        supplierOfferId: candidate.supplierOfferId,
        supplierKey: candidate.supplierKey,
        reasons,
      });
      continue;
    }
    eligible.push(candidate);
  }

  const ranked = [...eligible].sort(compareCandidates);
  return {
    interfaceVersion: SUPPLIER_OFFER_SELECTION_INTERFACE_VERSION,
    eligible: ranked.length > 0,
    reason: ranked.length > 0 ? 'supplier_offer_selected' : 'no_eligible_supplier_offer',
    selected: ranked[0] ?? null,
    ranked,
    rejected,
  };
}

export function selectFallbackSupplierOffer(input: {
  candidates: readonly SupplierOfferSelectionCandidate[];
  failedSupplierOfferId: string;
  promise: SupplierPromiseEnvelope;
}): SupplierOfferSelectionResult {
  const filtered = input.candidates.filter(candidate => {
    if (candidate.supplierOfferId === input.failedSupplierOfferId) return false;
    if (candidate.territory !== input.promise.territory) return false;
    if (candidate.currency !== input.promise.currency) return false;
    if (candidate.grossCustomerPrice > input.promise.maxCustomerPrice) return false;
    if (input.promise.maxDispatchHours !== undefined
      && input.promise.maxDispatchHours !== null
      && (candidate.dispatchHours === null || candidate.dispatchHours > input.promise.maxDispatchHours)) {
      return false;
    }
    if (input.promise.minReturnWindowDays !== undefined
      && input.promise.minReturnWindowDays !== null
      && (candidate.returnWindowDays === null || candidate.returnWindowDays < input.promise.minReturnWindowDays)) {
      return false;
    }
    return true;
  });

  const result = selectSupplierOffer(filtered);
  return {
    ...result,
    reason: result.eligible
      ? 'supplier_fallback_selected_without_customer_promise_regression'
      : 'no_safe_supplier_fallback',
  };
}
