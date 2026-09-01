import type { DirectSupplierPhaseFImportPlanV1 } from './directSupplierPhaseFImportPlan';

export const DIRECT_SUPPLIER_PHASE_F_IMPORT_EXECUTION_VERSION = 1 as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DirectSupplierPhaseFMutationAction = 'create_import_batch' | 'record_import_item';

export type DirectSupplierPhaseFMutationResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export type DirectSupplierPhaseFMutationExecutor = (
  action: DirectSupplierPhaseFMutationAction,
  payload: Record<string, unknown>,
) => Promise<DirectSupplierPhaseFMutationResult>;

export type DirectSupplierPhaseFExecutionReason =
  | 'execution_disabled'
  | 'confirmation_required'
  | 'plan_not_ready'
  | 'empty_plan_rejected'
  | 'canonical_product_mapping_required'
  | 'unsafe_plan_rejected'
  | 'mutation_failed'
  | 'executed';

export interface DirectSupplierPhaseFImportExecutionResultV1 {
  interfaceVersion: typeof DIRECT_SUPPLIER_PHASE_F_IMPORT_EXECUTION_VERSION;
  executed: boolean;
  reason: DirectSupplierPhaseFExecutionReason;
  batchId?: string;
  totalItems: number;
  recordedItems: number;
  supplierImportMutationPerformed: boolean;
  createImportBatchMutationPerformed: boolean;
  recordImportItemMutationCount: number;
  canonicalIdentityMutationPerformed: false;
  supplierCatalogMutationPerformed: false;
  marketplaceListingPerformed: false;
  commercialActivationPerformed: false;
  providerWriteMutationPerformed: false;
  supplierOrderMutationPerformed: false;
  customerPiiDisclosurePerformed: false;
  financialMutationPerformed: false;
}

function resultBase(input: {
  reason: DirectSupplierPhaseFExecutionReason;
  totalItems: number;
  recordedItems?: number;
  batchId?: string;
  createImportBatchMutationPerformed?: boolean;
}): DirectSupplierPhaseFImportExecutionResultV1 {
  const recordedItems = input.recordedItems ?? 0;
  const createImportBatchMutationPerformed = input.createImportBatchMutationPerformed ?? false;
  const supplierImportMutationPerformed = createImportBatchMutationPerformed || recordedItems > 0;

  return {
    interfaceVersion: DIRECT_SUPPLIER_PHASE_F_IMPORT_EXECUTION_VERSION,
    executed: input.reason === 'executed',
    reason: input.reason,
    batchId: input.batchId,
    totalItems: input.totalItems,
    recordedItems,
    supplierImportMutationPerformed,
    createImportBatchMutationPerformed,
    recordImportItemMutationCount: recordedItems,
    canonicalIdentityMutationPerformed: false,
    supplierCatalogMutationPerformed: false,
    marketplaceListingPerformed: false,
    commercialActivationPerformed: false,
    providerWriteMutationPerformed: false,
    supplierOrderMutationPerformed: false,
    customerPiiDisclosurePerformed: false,
    financialMutationPerformed: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function planIsFailClosed(plan: DirectSupplierPhaseFImportPlanV1): boolean {
  if (
    plan.supplierFoundationMutationPerformed !== false
    || plan.canonicalIdentityMutationPerformed !== false
    || plan.canonicalImportBatchCreationPerformed !== false
    || plan.commercialActivationPerformed !== false
    || plan.capabilityPromotionPerformed !== false
    || plan.marketplaceListingPerformed !== false
    || plan.normalizedFactsExecutionDeferred !== true
    || plan.assetRightsExecutionDeferred !== true
    || plan.complianceExecutionDeferred !== true
  ) return false;

  if (!plan.createImportBatch || plan.createImportBatch.action !== 'create_import_batch' || plan.createImportBatch.mutationPerformed !== false) {
    return false;
  }

  if (plan.createImportBatch.payload.providerKey !== 'direct_supplier') return false;

  return plan.items.every(item => (
    item.recordImportItem.action === 'record_import_item'
    && item.recordImportItem.mutationPerformed === false
    && item.recordImportItem.payload.batchId === '__PHASE_F_BATCH_ID__'
    && item.marketplaceListingAllowed === false
    && item.commercialActivationAllowed === false
    && item.normalizedFactsReviewRequired === true
    && item.assetRightsReviewRequired === true
  ));
}

/**
 * Executes only the two existing Phase F capture mutations produced by the
 * reviewed Direct Supplier planner. It does not normalize facts, approve
 * compliance, publish products, activate commerce, write supplier orders,
 * disclose customer PII, or mutate payments.
 *
 * Execution is deliberately stricter than planning: every item must already
 * have a real canonicalProductId. The current idempotent record_import_item RPC
 * does not backfill canonical_product_id on conflict, so capturing an item with
 * a missing canonical mapping would create a difficult-to-recover partial
 * identity state.
 */
export async function executeDirectSupplierPhaseFImportPlan(input: {
  plan: DirectSupplierPhaseFImportPlanV1;
  executionEnabled: boolean;
  confirmed: boolean;
  mutate: DirectSupplierPhaseFMutationExecutor;
}): Promise<DirectSupplierPhaseFImportExecutionResultV1> {
  const totalItems = input.plan.items.length;

  if (!input.executionEnabled) return resultBase({ reason: 'execution_disabled', totalItems });
  if (!input.confirmed) return resultBase({ reason: 'confirmation_required', totalItems });
  if (!input.plan.planReady || input.plan.reason !== 'import_plan_ready') {
    return resultBase({ reason: 'plan_not_ready', totalItems });
  }
  if (totalItems === 0) return resultBase({ reason: 'empty_plan_rejected', totalItems });
  if (!planIsFailClosed(input.plan)) return resultBase({ reason: 'unsafe_plan_rejected', totalItems });
  if (input.plan.items.some(item => !item.canonicalProductId || !UUID_RE.test(item.canonicalProductId))) {
    return resultBase({ reason: 'canonical_product_mapping_required', totalItems });
  }

  const createImportBatch = input.plan.createImportBatch;
  if (!createImportBatch) return resultBase({ reason: 'unsafe_plan_rejected', totalItems });

  const created = await input.mutate('create_import_batch', { ...createImportBatch.payload });
  if (!created.ok) return resultBase({ reason: 'mutation_failed', totalItems });
  if (!isRecord(created.data) || typeof created.data.batchId !== 'string' || !UUID_RE.test(created.data.batchId)) {
    return resultBase({
      reason: 'mutation_failed',
      totalItems,
      createImportBatchMutationPerformed: true,
    });
  }

  const batchId = created.data.batchId;
  let recordedItems = 0;

  for (const item of input.plan.items) {
    const recorded = await input.mutate('record_import_item', {
      ...item.recordImportItem.payload,
      batchId,
    });
    if (!recorded.ok) {
      return resultBase({
        reason: 'mutation_failed',
        totalItems,
        recordedItems,
        batchId,
        createImportBatchMutationPerformed: true,
      });
    }
    recordedItems += 1;
  }

  return resultBase({
    reason: 'executed',
    totalItems,
    recordedItems,
    batchId,
    createImportBatchMutationPerformed: true,
  });
}
