import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUPPLIER_FEED_CIRCUIT_POLICY,
  evaluateSupplierFeedCircuitBreaker,
} from '../_shared/supplierFeedCircuitBreaker';

describe('supplier feed circuit breaker', () => {
  it('allows safe staging while keeping public sellability false', () => {
    expect(evaluateSupplierFeedCircuitBreaker({
      previous: { amountMinor: 1000, stockQuantity: 10 },
      current: { amountMinor: 900, stockQuantity: 8 },
    })).toEqual({
      decision: 'allow_staging',
      reasons: [],
      publicSellabilityAllowed: false,
      requiresHumanReview: false,
      priceChangeRatio: -0.1,
    });
  });

  it('auto-quarantines a price drop greater than 50 percent', () => {
    const result = evaluateSupplierFeedCircuitBreaker({
      previous: { amountMinor: 1000, stockQuantity: 10 },
      current: { amountMinor: 499, stockQuantity: 10 },
    });

    expect(result.decision).toBe('auto_quarantine');
    expect(result.reasons).toContain('PRICE_DROP_THRESHOLD_EXCEEDED');
    expect(result.publicSellabilityAllowed).toBe(false);
    expect(result.requiresHumanReview).toBe(true);
  });

  it('does not quarantine an exact 50 percent drop under the default policy', () => {
    const result = evaluateSupplierFeedCircuitBreaker({
      previous: { amountMinor: 1000 },
      current: { amountMinor: 500 },
    });

    expect(result.decision).toBe('allow_staging');
  });

  it('auto-quarantines an extreme price increase', () => {
    const result = evaluateSupplierFeedCircuitBreaker({
      previous: { amountMinor: 1000, stockQuantity: 5 },
      current: { amountMinor: 2001, stockQuantity: 5 },
    });

    expect(result.decision).toBe('auto_quarantine');
    expect(result.reasons).toContain('PRICE_INCREASE_THRESHOLD_EXCEEDED');
  });

  it('fails closed immediately when supplier stock reaches zero', () => {
    const result = evaluateSupplierFeedCircuitBreaker({
      previous: { amountMinor: 1000, stockQuantity: 3 },
      current: { amountMinor: 1000, stockQuantity: 0 },
    });

    expect(result.decision).toBe('fail_closed_inactive');
    expect(result.reasons).toContain('OUT_OF_STOCK');
    expect(result.publicSellabilityAllowed).toBe(false);
    expect(result.requiresHumanReview).toBe(false);
  });

  it('fails closed on zero or invalid prices', () => {
    const result = evaluateSupplierFeedCircuitBreaker({
      previous: { amountMinor: 1000 },
      current: { amountMinor: 0, stockQuantity: 4 },
    });

    expect(result.decision).toBe('fail_closed_inactive');
    expect(result.reasons).toContain('INVALID_CURRENT_PRICE');
  });

  it('fails closed when required stock is omitted', () => {
    const result = evaluateSupplierFeedCircuitBreaker({
      current: { amountMinor: 1000 },
      policy: { ...DEFAULT_SUPPLIER_FEED_CIRCUIT_POLICY, requireStockQuantity: true },
    });

    expect(result.decision).toBe('fail_closed_inactive');
    expect(result.reasons).toContain('MISSING_REQUIRED_STOCK');
  });

  it('rejects invalid threshold configuration', () => {
    expect(() => evaluateSupplierFeedCircuitBreaker({
      current: { amountMinor: 1000 },
      policy: {
        ...DEFAULT_SUPPLIER_FEED_CIRCUIT_POLICY,
        maxPriceDropRatio: -0.1,
      },
    })).toThrow(/maxPriceDropRatio/);
  });
});
