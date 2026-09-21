import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  evaluateProjectionSupplierFallback,
  evaluateProjectionSupplierOffers,
} from '../_shared/supplierOfferSelectionRuntime';

const projectionId = '00000000-0000-4000-8000-000000000001';
const offerId = '00000000-0000-4000-8000-000000000002';
const productId = '00000000-0000-4000-8000-000000000003';
const supplierId = '00000000-0000-4000-8000-000000000004';
const pricingSnapshotId = '00000000-0000-4000-8000-000000000005';

function clientWithCandidate(overrides: Record<string, unknown> = {}): SupabaseClient {
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === 'server_supplier_projection_offer_candidates_v1') {
      return {
        data: [{
          supplier_offer_id: offerId,
          supplier_id: supplierId,
          supplier_key: 'supplier-a',
          canonical_product_id: productId,
          supplier_catalog_item_id: '00000000-0000-4000-8000-000000000006',
          external_variant_ref: 'SKU-1',
          territory: 'GB',
          fallback_allowed: true,
          dispatch_hours: 24,
          return_window_days: 30,
          tracking_deadline_hours: 48,
          pricing_snapshot_id: pricingSnapshotId,
          currency: 'GBP',
          gross_customer_price: 29.99,
          expected_contribution: 8,
          minimum_contribution: 4,
          ...overrides,
        }],
        error: null,
      };
    }
    if (name === 'server_supplier_catalog_decision_v1') {
      return {
        data: {
          eligible: true,
          reason: 'supplier_catalog_ready',
          canonicalProductId: productId,
          supplierOfferId: offerId,
          supplierId,
          interfaceVersion: 1,
        },
        error: null,
      };
    }
    if (name === 'server_supplier_commercial_decision_v1') {
      return {
        data: {
          eligible: true,
          reason: 'commercial_economics_ready',
          supplierOfferId: offerId,
          canonicalProductId: productId,
          pricingSnapshotId,
          landedCostSnapshotId: '00000000-0000-4000-8000-000000000007',
          taxRuleVersionId: '00000000-0000-4000-8000-000000000008',
          currency: 'GBP',
          grossCustomerPrice: 29.99,
          pricingPolicyVersion: 1,
          interfaceVersion: 1,
        },
        error: null,
      };
    }
    if (name === 'server_supplier_stock_price_decision_v1') {
      return {
        data: {
          eligible: true,
          reason: 'stock_price_ready',
          supplierOfferId: offerId,
          canonicalProductId: productId,
          stockObservationId: '00000000-0000-4000-8000-000000000009',
          priceObservationId: '00000000-0000-4000-8000-000000000010',
          pricingSnapshotId,
          availability: 'in_stock',
          sellableQuantity: 12,
          supplierPriceMinor: 1599,
          currency: 'GBP',
          stockObservedAt: '2026-09-21T09:00:00.000Z',
          priceObservedAt: '2026-09-21T09:00:00.000Z',
          policyVersion: 1,
          interfaceVersion: 1,
        },
        error: null,
      };
    }
    if (name === 'server_supplier_foundation_decision_v1') {
      return {
        data: {
          eligible: args?.p_required_capability !== 'returns' || overrides.returns_capability !== false,
          reason: 'supplier_foundation_ready',
          interfaceVersion: 1,
        },
        error: null,
      };
    }
    return { data: null, error: new Error(`unexpected rpc: ${name}`) };
  });
  return { rpc } as unknown as SupabaseClient;
}

describe('supplier offer selection runtime', () => {
  it('selects an offer only after catalog, economics, stock and fulfilment capabilities pass', async () => {
    const result = await evaluateProjectionSupplierOffers(clientWithCandidate(), {
      projectionId,
      requestedQuantity: 2,
      territory: 'GB',
    });

    expect(result.eligible).toBe(true);
    expect(result.selected?.supplierOfferId).toBe(offerId);
    expect(result.selected?.requestedQuantity).toBe(2);
    expect(result.selected?.expectedContribution).toBe(8);
  });

  it('fails closed when a required fulfilment capability is unavailable', async () => {
    const result = await evaluateProjectionSupplierOffers(
      clientWithCandidate({ returns_capability: false }),
      { projectionId, requestedQuantity: 1, territory: 'GB' },
    );

    expect(result.eligible).toBe(false);
    expect(result.rejected[0]?.reasons).toContain('returns_not_eligible');
  });

  it('rejects candidate evidence when the pricing snapshot no longer matches economics', async () => {
    const result = await evaluateProjectionSupplierOffers(
      clientWithCandidate({ pricing_snapshot_id: '00000000-0000-4000-8000-000000000099' }),
      { projectionId, requestedQuantity: 1, territory: 'GB' },
    );

    expect(result.eligible).toBe(false);
    expect(result.rejected[0]?.reasons).toContain('economics_not_eligible');
  });

  it('uses only fallback-approved bindings during recovery', async () => {
    const result = await evaluateProjectionSupplierFallback(
      clientWithCandidate({ fallback_allowed: false }),
      {
        projectionId,
        requestedQuantity: 1,
        failedSupplierOfferId: '00000000-0000-4000-8000-000000000099',
        promise: {
          territory: 'GB',
          currency: 'GBP',
          maxCustomerPrice: 29.99,
          maxDispatchHours: 24,
          minReturnWindowDays: 30,
        },
      },
    );

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('no_safe_supplier_fallback');
  });
});
