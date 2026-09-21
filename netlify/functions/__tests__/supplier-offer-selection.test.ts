import { describe, expect, it } from 'vitest';
import {
  selectFallbackSupplierOffer,
  selectSupplierOffer,
  supplierOfferEligibilityReasons,
  type SupplierOfferSelectionCandidate,
} from '../_shared/supplierOfferSelection';

const base = (overrides: Partial<SupplierOfferSelectionCandidate> = {}): SupplierOfferSelectionCandidate => ({
  supplierOfferId: '00000000-0000-4000-8000-000000000001',
  supplierId: '00000000-0000-4000-8000-000000000101',
  supplierKey: 'supplier-a',
  canonicalProductId: '00000000-0000-4000-8000-000000000201',
  territory: 'GB',
  currency: 'GBP',
  requestedQuantity: 1,
  sellableQuantity: 10,
  grossCustomerPrice: 29.99,
  expectedContribution: 8,
  minimumContribution: 4,
  dispatchHours: 24,
  returnWindowDays: 30,
  trackingDeadlineHours: 48,
  stockObservedAt: '2026-09-21T08:00:00.000Z',
  priceObservedAt: '2026-09-21T08:00:00.000Z',
  catalogEligible: true,
  economicsEligible: true,
  stockPriceEligible: true,
  shippingEligible: true,
  orderSubmissionEligible: true,
  acknowledgementEligible: true,
  trackingEligible: true,
  returnsEligible: true,
  ...overrides,
});

describe('supplier offer selection engine', () => {
  it('fails closed when a mandatory commerce gate is missing', () => {
    const candidate = base({ returnsEligible: false, orderSubmissionEligible: false });
    expect(supplierOfferEligibilityReasons(candidate)).toEqual([
      'order_submission_not_eligible',
      'returns_not_eligible',
    ]);

    const result = selectSupplierOffer([candidate]);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('no_eligible_supplier_offer');
    expect(result.selected).toBeNull();
  });

  it('rejects offers that cannot cover the requested quantity', () => {
    const result = selectSupplierOffer([
      base({ requestedQuantity: 5, sellableQuantity: 3 }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.rejected[0]?.reasons).toContain('insufficient_sellable_quantity');
  });

  it('prefers margin headroom, then faster dispatch, then lower buyer price', () => {
    const lowerMargin = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000010',
      supplierKey: 'lower-margin',
      expectedContribution: 7,
      minimumContribution: 4,
      dispatchHours: 12,
      grossCustomerPrice: 24.99,
    });
    const higherMarginSlower = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000020',
      supplierKey: 'higher-margin',
      expectedContribution: 10,
      minimumContribution: 4,
      dispatchHours: 48,
      grossCustomerPrice: 31.99,
    });

    const result = selectSupplierOffer([lowerMargin, higherMarginSlower]);
    expect(result.selected?.supplierKey).toBe('higher-margin');

    const equalMarginFast = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000030',
      supplierKey: 'equal-margin-fast',
      expectedContribution: 10,
      minimumContribution: 4,
      dispatchHours: 12,
      grossCustomerPrice: 32.99,
    });
    const reranked = selectSupplierOffer([higherMarginSlower, equalMarginFast]);
    expect(reranked.selected?.supplierKey).toBe('equal-margin-fast');
  });

  it('uses deterministic offer id ordering as the final tie breaker', () => {
    const second = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000002',
      supplierKey: 'supplier-b',
    });
    const first = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000001',
      supplierKey: 'supplier-a',
    });

    const result = selectSupplierOffer([second, first]);
    expect(result.selected?.supplierOfferId).toBe(first.supplierOfferId);
  });

  it('allows fallback only when the buyer promise is preserved', () => {
    const failed = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000001',
      supplierKey: 'failed',
      grossCustomerPrice: 29.99,
      dispatchHours: 24,
      returnWindowDays: 30,
    });
    const safe = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000002',
      supplierKey: 'safe',
      grossCustomerPrice: 28.99,
      dispatchHours: 24,
      returnWindowDays: 30,
    });
    const priceRegression = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000003',
      supplierKey: 'too-expensive',
      grossCustomerPrice: 30.5,
    });
    const slaRegression = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000004',
      supplierKey: 'too-slow',
      dispatchHours: 48,
    });
    const returnsRegression = base({
      supplierOfferId: '00000000-0000-4000-8000-000000000005',
      supplierKey: 'worse-returns',
      returnWindowDays: 14,
    });

    const result = selectFallbackSupplierOffer({
      candidates: [failed, priceRegression, slaRegression, returnsRegression, safe],
      failedSupplierOfferId: failed.supplierOfferId,
      promise: {
        territory: 'GB',
        currency: 'GBP',
        maxCustomerPrice: 29.99,
        maxDispatchHours: 24,
        minReturnWindowDays: 30,
      },
    });

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe('supplier_fallback_selected_without_customer_promise_regression');
    expect(result.selected?.supplierKey).toBe('safe');
  });

  it('refuses fallback when every alternative would degrade the customer promise', () => {
    const result = selectFallbackSupplierOffer({
      candidates: [
        base({
          supplierOfferId: '00000000-0000-4000-8000-000000000001',
          supplierKey: 'failed',
        }),
        base({
          supplierOfferId: '00000000-0000-4000-8000-000000000002',
          supplierKey: 'slow',
          dispatchHours: 72,
        }),
      ],
      failedSupplierOfferId: '00000000-0000-4000-8000-000000000001',
      promise: {
        territory: 'GB',
        currency: 'GBP',
        maxCustomerPrice: 29.99,
        maxDispatchHours: 24,
        minReturnWindowDays: 30,
      },
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('no_safe_supplier_fallback');
    expect(result.selected).toBeNull();
  });
});
