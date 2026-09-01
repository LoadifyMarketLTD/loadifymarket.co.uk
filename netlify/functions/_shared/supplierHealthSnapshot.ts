import { evaluateSupplierHealth, type SupplierHealthDecisionV1, type SupplierHealthInput } from './supplierHealth';

const FAILURE_CLASSES = new Set([
  'RETRYABLE_FAILURE',
  'PERMANENT_REJECTION',
  'AUTH_CONFIGURATION_FAILURE',
  'RATE_LIMITED',
  'UNKNOWN_OUTCOME',
]);
const NON_PROVIDER_CLASSES = new Set(['BLOCKED_BY_CONTROL', 'MANUAL_REVIEW_REQUIRED']);
const SYNC_OPERATIONS = new Set(['stock_price_sync', 'stock_sync', 'price_sync']);

interface ControlCentreOperation {
  operation: string;
  resultClass: string;
  errorClass: string | null;
  providerRef: string | null;
  createdAt: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function operation(value: unknown): ControlCentreOperation | null {
  const row = record(value);
  if (!row) return null;
  const op = typeof row.operation === 'string' ? row.operation.trim().toLowerCase() : '';
  const resultClass = typeof row.result_class === 'string' ? row.result_class.trim().toUpperCase() : '';
  const createdAtRaw = typeof row.created_at === 'string' ? row.created_at : '';
  if (!op || !resultClass || !createdAtRaw || Number.isNaN(Date.parse(createdAtRaw))) return null;
  return {
    operation: op,
    resultClass,
    errorClass: typeof row.error_class === 'string' && row.error_class.trim() ? row.error_class.trim().toLowerCase() : null,
    providerRef: typeof row.provider_ref === 'string' && row.provider_ref.trim() ? row.provider_ref.trim().toLowerCase() : null,
    createdAt: new Date(createdAtRaw).toISOString(),
  };
}

function isFailure(row: ControlCentreOperation): boolean {
  return FAILURE_CLASSES.has(row.resultClass);
}

/**
 * Builds an explainable Supplier Health snapshot from the existing admin
 * Supplier Control Centre read model. No new database read path or migration is
 * introduced. Missing evidence families stay at zero samples instead of being
 * treated as healthy.
 */
export function deriveSupplierHealthFromControlCentre(input: {
  result: unknown;
  providerRef?: string | null;
  now?: Date;
  windowHours?: number;
}): SupplierHealthDecisionV1 | null {
  const root = record(input.result);
  if (!root) return null;
  const supplier = record(root.supplier);
  const supplierKey = typeof supplier?.supplier_key === 'string' ? supplier.supplier_key.trim().toLowerCase() : '';
  if (!supplierKey) return null;

  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error('Supplier Health snapshot now must be valid');
  const windowHours = input.windowHours ?? 168;
  if (!Number.isSafeInteger(windowHours) || windowHours < 1 || windowHours > 720) {
    throw new Error('Supplier Health snapshot windowHours must be between 1 and 720');
  }
  const windowStart = new Date(now.getTime() - windowHours * 3_600_000);

  const recent = Array.isArray(root.recentOperations)
    ? root.recentOperations.map(operation).filter((row): row is ControlCentreOperation => row !== null)
    : [];
  const rows = recent
    .filter(row => Date.parse(row.createdAt) >= windowStart.getTime() && Date.parse(row.createdAt) <= now.getTime())
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const reachedProvider = rows.filter(row => !NON_PROVIDER_CLASSES.has(row.resultClass));
  const syncRows = reachedProvider.filter(row => SYNC_OPERATIONS.has(row.operation));
  const orderRows = reachedProvider.filter(row => row.operation === 'supplier_order');
  const trackingRows = reachedProvider.filter(row => row.operation === 'tracking_ingest');

  let consecutiveSyncFailures = 0;
  for (const row of syncRows) {
    if (!isFailure(row)) break;
    consecutiveSyncFailures += 1;
  }

  const providerRefs = [...new Set(reachedProvider.map(row => row.providerRef).filter((value): value is string => Boolean(value)))];
  const requestedProvider = input.providerRef?.trim().toLowerCase() || '';
  const providerRef = requestedProvider || (providerRefs.length === 1 ? providerRefs[0] : 'all-providers');

  const operations = {
    total: reachedProvider.length,
    retryableFailures: reachedProvider.filter(row => row.resultClass === 'RETRYABLE_FAILURE').length,
    permanentRejections: reachedProvider.filter(row => row.resultClass === 'PERMANENT_REJECTION').length,
    authConfigurationFailures: reachedProvider.filter(row => row.resultClass === 'AUTH_CONFIGURATION_FAILURE').length,
    rateLimited: reachedProvider.filter(row => row.resultClass === 'RATE_LIMITED').length,
    unknownOutcomes: reachedProvider.filter(row => row.resultClass === 'UNKNOWN_OUTCOME').length,
  };

  const healthInput: SupplierHealthInput = {
    supplierKey,
    providerRef,
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    consecutiveSyncFailures,
    operations,
    price: {
      observations: syncRows.length,
      anomalies: syncRows.filter(row => row.resultClass === 'PRICE_CHANGED' || row.errorClass === 'supplier_price_changed').length,
    },
    freshness: {
      observations: syncRows.length,
      stale: syncRows.filter(row => row.errorClass === 'stock_stale' || row.errorClass === 'price_stale').length,
    },
    fulfilment: {
      orders: orderRows.length,
      failures: orderRows.filter(isFailure).length,
      // The current Control Centre operation taxonomy does not expose a
      // dedicated cancellation event. Do not infer one from generic failures.
      cancellations: 0,
    },
    tracking: {
      shipments: trackingRows.length,
      exceptions: trackingRows.filter(isFailure).length,
    },
    // Terminal reconciliation does not yet have a dedicated aggregate in this
    // read model. Leave the evidence family unknown rather than assuming zero.
    reconciliation: { attempts: 0, failures: 0 },
  };

  return evaluateSupplierHealth(healthInput);
}
