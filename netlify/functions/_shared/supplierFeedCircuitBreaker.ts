export type SupplierFeedCircuitDecision =
  | 'allow_staging'
  | 'auto_quarantine'
  | 'fail_closed_inactive';

export type SupplierFeedCircuitReason =
  | 'INVALID_CURRENT_PRICE'
  | 'PRICE_DROP_THRESHOLD_EXCEEDED'
  | 'PRICE_INCREASE_THRESHOLD_EXCEEDED'
  | 'OUT_OF_STOCK'
  | 'NEGATIVE_STOCK'
  | 'MISSING_REQUIRED_STOCK';

export interface SupplierFeedCircuitSnapshot {
  amountMinor: number;
  stockQuantity?: number;
}

export interface SupplierFeedCircuitPolicy {
  /**
   * Fractional drop relative to the previous supplier price. 0.5 means
   * a drop greater than 50% is quarantined.
   */
  maxPriceDropRatio: number;
  /**
   * Fractional increase relative to the previous supplier price. 1 means
   * an increase greater than 100% is quarantined.
   */
  maxPriceIncreaseRatio: number;
  /**
   * When true, a feed that is expected to carry stock but omits it fails
   * closed instead of silently preserving public sellability.
   */
  requireStockQuantity: boolean;
}

export interface SupplierFeedCircuitResult {
  decision: SupplierFeedCircuitDecision;
  reasons: SupplierFeedCircuitReason[];
  publicSellabilityAllowed: boolean;
  requiresHumanReview: boolean;
  priceChangeRatio?: number;
}

export const DEFAULT_SUPPLIER_FEED_CIRCUIT_POLICY: SupplierFeedCircuitPolicy = {
  maxPriceDropRatio: 0.5,
  maxPriceIncreaseRatio: 1,
  requireStockQuantity: false,
};

function validatePolicy(policy: SupplierFeedCircuitPolicy): void {
  if (!Number.isFinite(policy.maxPriceDropRatio) || policy.maxPriceDropRatio < 0) {
    throw new Error('maxPriceDropRatio must be a finite non-negative number');
  }
  if (!Number.isFinite(policy.maxPriceIncreaseRatio) || policy.maxPriceIncreaseRatio < 0) {
    throw new Error('maxPriceIncreaseRatio must be a finite non-negative number');
  }
}

/**
 * Pure fail-closed decision boundary for supplier price/stock observations.
 *
 * This function performs no database writes, does not publish/unpublish a
 * marketplace listing and does not activate Supplier Commerce. Callers must
 * persist the resulting decision through a separately governed server-only
 * boundary.
 */
export function evaluateSupplierFeedCircuitBreaker(input: {
  previous?: SupplierFeedCircuitSnapshot;
  current: SupplierFeedCircuitSnapshot;
  policy?: SupplierFeedCircuitPolicy;
}): SupplierFeedCircuitResult {
  const policy = input.policy ?? DEFAULT_SUPPLIER_FEED_CIRCUIT_POLICY;
  validatePolicy(policy);

  const reasons: SupplierFeedCircuitReason[] = [];
  let priceChangeRatio: number | undefined;

  if (!Number.isInteger(input.current.amountMinor) || input.current.amountMinor <= 0) {
    reasons.push('INVALID_CURRENT_PRICE');
  }

  if (input.current.stockQuantity !== undefined) {
    if (!Number.isInteger(input.current.stockQuantity) || input.current.stockQuantity < 0) {
      reasons.push('NEGATIVE_STOCK');
    } else if (input.current.stockQuantity === 0) {
      reasons.push('OUT_OF_STOCK');
    }
  } else if (policy.requireStockQuantity) {
    reasons.push('MISSING_REQUIRED_STOCK');
  }

  if (
    input.previous
    && Number.isInteger(input.previous.amountMinor)
    && input.previous.amountMinor > 0
    && Number.isInteger(input.current.amountMinor)
    && input.current.amountMinor > 0
  ) {
    priceChangeRatio = (input.current.amountMinor - input.previous.amountMinor) / input.previous.amountMinor;

    if (priceChangeRatio < -policy.maxPriceDropRatio) {
      reasons.push('PRICE_DROP_THRESHOLD_EXCEEDED');
    }
    if (priceChangeRatio > policy.maxPriceIncreaseRatio) {
      reasons.push('PRICE_INCREASE_THRESHOLD_EXCEEDED');
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  const failClosedReasons: SupplierFeedCircuitReason[] = [
    'INVALID_CURRENT_PRICE',
    'OUT_OF_STOCK',
    'NEGATIVE_STOCK',
    'MISSING_REQUIRED_STOCK',
  ];

  if (uniqueReasons.some(reason => failClosedReasons.includes(reason))) {
    return {
      decision: 'fail_closed_inactive',
      reasons: uniqueReasons,
      publicSellabilityAllowed: false,
      requiresHumanReview: false,
      priceChangeRatio,
    };
  }

  if (uniqueReasons.length > 0) {
    return {
      decision: 'auto_quarantine',
      reasons: uniqueReasons,
      publicSellabilityAllowed: false,
      requiresHumanReview: true,
      priceChangeRatio,
    };
  }

  return {
    decision: 'allow_staging',
    reasons: [],
    publicSellabilityAllowed: false,
    requiresHumanReview: false,
    priceChangeRatio,
  };
}
