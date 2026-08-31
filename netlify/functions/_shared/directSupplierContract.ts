export const DIRECT_SUPPLIER_CONTRACT_VERSION = 1 as const;
export const DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH = 500 as const;

export type DirectSupplierFeedTransport = 'json_api' | 'json_feed' | 'csv' | 'xml' | 'sftp';

export interface DirectSupplierVariantRecord {
  externalProductRef: string;
  externalVariantRef: string;
  sku?: string;
  gtin?: string;
  title: string;
  currency: string;
  amountMinor: number;
  stockQuantity?: number;
  warehouseCountry: string;
  imageUrls?: string[];
  attributes?: Record<string, string>;
}

export interface DirectSupplierFeedBatchV1 {
  contractVersion: typeof DIRECT_SUPPLIER_CONTRACT_VERSION;
  supplierKey: string;
  generatedAt: string;
  transport: DirectSupplierFeedTransport;
  variants: DirectSupplierVariantRecord[];
}

export type DirectSupplierWebhookEventType =
  | 'catalog.updated'
  | 'stock.updated'
  | 'price.updated'
  | 'order.acknowledged'
  | 'shipment.updated'
  | 'order.cancelled'
  | 'return.updated'
  | 'reimbursement.updated';

export const DIRECT_SUPPLIER_WEBHOOK_EVENT_TYPES: readonly DirectSupplierWebhookEventType[] = [
  'catalog.updated',
  'stock.updated',
  'price.updated',
  'order.acknowledged',
  'shipment.updated',
  'order.cancelled',
  'return.updated',
  'reimbursement.updated',
];

/**
 * PII is deliberately excluded from the shared supplier webhook envelope.
 * Customer disclosure, if ever required for fulfillment, must be handled by a
 * separately reviewed server-side minimum-disclosure contract.
 */
export interface DirectSupplierWebhookEnvelopeV1<TPayload = Record<string, unknown>> {
  contractVersion: typeof DIRECT_SUPPLIER_CONTRACT_VERSION;
  eventId: string;
  eventType: DirectSupplierWebhookEventType;
  supplierKey: string;
  occurredAt: string;
  payload: TPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateDirectSupplierFeedBatch(batch: DirectSupplierFeedBatchV1): string[] {
  const errors: string[] = [];
  if (batch.contractVersion !== DIRECT_SUPPLIER_CONTRACT_VERSION) errors.push('unsupported contractVersion');
  if (!batch.supplierKey.trim()) errors.push('supplierKey is required');
  if (!Number.isFinite(Date.parse(batch.generatedAt))) errors.push('generatedAt must be an ISO-compatible timestamp');
  if (batch.variants.length > DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH) {
    errors.push(
      `variants must contain at most ${DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH} records; split larger feeds into smaller batches`,
    );
  }

  for (const [index, variant] of batch.variants.entries()) {
    const prefix = `variants[${index}]`;
    if (!variant.externalProductRef.trim()) errors.push(`${prefix}.externalProductRef is required`);
    if (!variant.externalVariantRef.trim()) errors.push(`${prefix}.externalVariantRef is required`);
    if (!variant.title.trim()) errors.push(`${prefix}.title is required`);
    if (!/^[A-Z]{3}$/.test(variant.currency.trim().toUpperCase())) errors.push(`${prefix}.currency must be a 3-letter code`);
    if (!Number.isSafeInteger(variant.amountMinor) || variant.amountMinor < 0) errors.push(`${prefix}.amountMinor must be a non-negative safe integer`);
    if (variant.stockQuantity !== undefined && (!Number.isSafeInteger(variant.stockQuantity) || variant.stockQuantity < 0)) {
      errors.push(`${prefix}.stockQuantity must be a non-negative safe integer when provided`);
    }
    if (!/^[A-Z]{2}$/.test(variant.warehouseCountry.trim().toUpperCase())) errors.push(`${prefix}.warehouseCountry must be a 2-letter country code`);
  }

  return errors;
}

export function validateDirectSupplierWebhookEnvelope(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ['webhook envelope must be an object'];

  if (value.contractVersion !== DIRECT_SUPPLIER_CONTRACT_VERSION) errors.push('unsupported contractVersion');
  if (typeof value.eventId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value.eventId.trim())) {
    errors.push('eventId is invalid');
  }
  if (typeof value.eventType !== 'string' || !DIRECT_SUPPLIER_WEBHOOK_EVENT_TYPES.includes(value.eventType as DirectSupplierWebhookEventType)) {
    errors.push('eventType is unsupported');
  }
  if (typeof value.supplierKey !== 'string' || !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(value.supplierKey.trim())) {
    errors.push('supplierKey is invalid');
  }
  if (typeof value.occurredAt !== 'string' || !Number.isFinite(Date.parse(value.occurredAt))) {
    errors.push('occurredAt must be an ISO-compatible timestamp');
  }
  if (!isRecord(value.payload)) errors.push('payload must be an object');

  return errors;
}
