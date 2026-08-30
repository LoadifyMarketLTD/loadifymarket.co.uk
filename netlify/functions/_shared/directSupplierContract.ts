export const DIRECT_SUPPLIER_CONTRACT_VERSION = 1 as const;

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

export function validateDirectSupplierFeedBatch(batch: DirectSupplierFeedBatchV1): string[] {
  const errors: string[] = [];
  if (batch.contractVersion !== DIRECT_SUPPLIER_CONTRACT_VERSION) errors.push('unsupported contractVersion');
  if (!batch.supplierKey.trim()) errors.push('supplierKey is required');
  if (!Number.isFinite(Date.parse(batch.generatedAt))) errors.push('generatedAt must be an ISO-compatible timestamp');

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
