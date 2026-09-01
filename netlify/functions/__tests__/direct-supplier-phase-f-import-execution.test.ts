import { describe, expect, it, vi } from 'vitest';
import {
  executeDirectSupplierPhaseFImportPlan,
  type DirectSupplierPhaseFMutationExecutor,
} from '../_shared/directSupplierPhaseFImportExecution';
import type { DirectSupplierPhaseFImportPlanV1 } from '../_shared/directSupplierPhaseFImportPlan';

const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';
const CATALOG_ITEM_ID = '22222222-2222-4222-8222-222222222222';
const CANONICAL_PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const BATCH_ID = '44444444-4444-4444-8444-444444444444';
const DIGEST = 'a'.repeat(64);

function readyPlan(options?: { canonicalProductId?: string; itemCount?: number }): DirectSupplierPhaseFImportPlanV1 {
  const canonicalProductId = options && Object.prototype.hasOwnProperty.call(options, 'canonicalProductId')
    ? options.canonicalProductId
    : CANONICAL_PRODUCT_ID;
  const itemCount = options?.itemCount ?? 1;

  const items = Array.from({ length: itemCount }, (_, index) => {
    const digest = index === 0 ? DIGEST : `${index}`.padStart(64, 'b').slice(0, 64);
    return {
      interfaceVersion: 1 as const,
      sourceRecordDigest: digest,
      externalProductRef: `product-${index + 1}`,
      externalVariantRef: `variant-${index + 1}`,
      supplierCatalogItemId: CATALOG_ITEM_ID,
      ...(canonicalProductId ? { canonicalProductId } : {}),
      recordImportItem: {
        action: 'record_import_item' as const,
        payload: {
          batchId: '__PHASE_F_BATCH_ID__' as const,
          supplierCatalogItemId: CATALOG_ITEM_ID,
          ...(canonicalProductId ? { canonicalProductId } : {}),
          sourcePayloadRef: `direct-supplier-staging:item:${digest}`,
          sourcePayloadHash: digest,
          sourceObservedAt: '2026-09-01T12:00:00.000Z',
          itemIdempotencyKey: `direct-supplier:v1:${digest}`,
        },
        mutationPerformed: false as const,
      },
      canonicalProductMappingRequiredBeforeFactsAndApproval: !canonicalProductId,
      normalizedFactsReviewRequired: true as const,
      assetRightsReviewRequired: true as const,
      complianceReviewsRequired: [
        'product_safety',
        'restricted_goods',
        'claims',
        'labelling',
        'documentation',
        'marketability',
      ] as const,
      marketplaceListingAllowed: false as const,
      commercialActivationAllowed: false as const,
    };
  });

  return {
    interfaceVersion: 1,
    supplierKey: 'real-supplier-key',
    sourceBatchDigest: DIGEST,
    planReady: true,
    reason: 'import_plan_ready',
    supplierId: SUPPLIER_ID,
    createImportBatch: {
      action: 'create_import_batch',
      payload: {
        supplierId: SUPPLIER_ID,
        providerKey: 'direct_supplier',
        sourceRef: `direct-supplier-staging-batch:real-supplier-key:${DIGEST}`,
        sourceObservedAt: '2026-09-01T12:00:00.000Z',
        adapterVersion: 'direct-supplier-staging-v1',
        idempotencyKey: `direct-supplier:v1:real-supplier-key:${DIGEST}`,
      },
      mutationPerformed: false,
    },
    items,
    quarantinedCount: 0,
    normalizedFactsExecutionDeferred: true,
    assetRightsExecutionDeferred: true,
    complianceExecutionDeferred: true,
    supplierFoundationMutationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    canonicalImportBatchCreationPerformed: false,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}

describe('Direct Supplier Phase F import execution bridge', () => {
  it('fails closed while hosted execution is disabled', async () => {
    const mutate = vi.fn() as unknown as DirectSupplierPhaseFMutationExecutor;
    const result = await executeDirectSupplierPhaseFImportPlan({
      plan: readyPlan(),
      executionEnabled: false,
      confirmed: true,
      mutate,
    });

    expect(result.reason).toBe('execution_disabled');
    expect(result.supplierImportMutationPerformed).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('requires explicit operator confirmation before any mutation', async () => {
    const mutate = vi.fn() as unknown as DirectSupplierPhaseFMutationExecutor;
    const result = await executeDirectSupplierPhaseFImportPlan({
      plan: readyPlan(),
      executionEnabled: true,
      confirmed: false,
      mutate,
    });

    expect(result.reason).toBe('confirmation_required');
    expect(result.supplierImportMutationPerformed).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('rejects an empty ready plan instead of creating an empty import batch', async () => {
    const mutate = vi.fn() as unknown as DirectSupplierPhaseFMutationExecutor;
    const result = await executeDirectSupplierPhaseFImportPlan({
      plan: readyPlan({ itemCount: 0 }),
      executionEnabled: true,
      confirmed: true,
      mutate,
    });

    expect(result.reason).toBe('empty_plan_rejected');
    expect(result.totalItems).toBe(0);
    expect(result.supplierImportMutationPerformed).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('requires complete canonical product mapping before capture because replay cannot safely backfill it', async () => {
    const mutate = vi.fn() as unknown as DirectSupplierPhaseFMutationExecutor;
    const result = await executeDirectSupplierPhaseFImportPlan({
      plan: readyPlan({ canonicalProductId: undefined }),
      executionEnabled: true,
      confirmed: true,
      mutate,
    });

    expect(result.reason).toBe('canonical_product_mapping_required');
    expect(result.supplierImportMutationPerformed).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('reports a successful create call conservatively when its returned batch contract is malformed', async () => {
    const mutate = vi.fn(async () => ({ ok: true as const, data: { ok: true } }));
    const result = await executeDirectSupplierPhaseFImportPlan({
      plan: readyPlan(),
      executionEnabled: true,
      confirmed: true,
      mutate,
    });

    expect(result).toMatchObject({
      executed: false,
      reason: 'mutation_failed',
      recordedItems: 0,
      supplierImportMutationPerformed: true,
      createImportBatchMutationPerformed: true,
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('executes only create_import_batch then record_import_item with the real returned batch id', async () => {
    const mutate = vi.fn(async (action: string) => {
      if (action === 'create_import_batch') return { ok: true as const, data: { ok: true, batchId: BATCH_ID, idempotent: true } };
      return { ok: true as const, data: { ok: true, importItemId: CATALOG_ITEM_ID, idempotent: true } };
    });

    const result = await executeDirectSupplierPhaseFImportPlan({
      plan: readyPlan(),
      executionEnabled: true,
      confirmed: true,
      mutate,
    });

    expect(result).toMatchObject({
      executed: true,
      reason: 'executed',
      batchId: BATCH_ID,
      recordedItems: 1,
      supplierImportMutationPerformed: true,
      createImportBatchMutationPerformed: true,
      recordImportItemMutationCount: 1,
      providerWriteMutationPerformed: false,
      supplierOrderMutationPerformed: false,
      customerPiiDisclosurePerformed: false,
      financialMutationPerformed: false,
    });
    expect(mutate).toHaveBeenNthCalledWith(1, 'create_import_batch', expect.objectContaining({
      supplierId: SUPPLIER_ID,
      providerKey: 'direct_supplier',
    }));
    expect(mutate).toHaveBeenNthCalledWith(2, 'record_import_item', expect.objectContaining({
      batchId: BATCH_ID,
      supplierCatalogItemId: CATALOG_ITEM_ID,
      canonicalProductId: CANONICAL_PRODUCT_ID,
    }));
  });

  it('reports a partial idempotent capture honestly and stops on the first failed item mutation', async () => {
    let recordCalls = 0;
    const mutate = vi.fn(async (action: string) => {
      if (action === 'create_import_batch') return { ok: true as const, data: { batchId: BATCH_ID } };
      recordCalls += 1;
      if (recordCalls === 2) return { ok: false as const, error: 'simulated record failure' };
      return { ok: true as const, data: { importItemId: CATALOG_ITEM_ID } };
    });

    const result = await executeDirectSupplierPhaseFImportPlan({
      plan: readyPlan({ itemCount: 2 }),
      executionEnabled: true,
      confirmed: true,
      mutate,
    });

    expect(result).toMatchObject({
      executed: false,
      reason: 'mutation_failed',
      batchId: BATCH_ID,
      totalItems: 2,
      recordedItems: 1,
      supplierImportMutationPerformed: true,
      createImportBatchMutationPerformed: true,
      recordImportItemMutationCount: 1,
    });
    expect(mutate).toHaveBeenCalledTimes(3);
  });
});
