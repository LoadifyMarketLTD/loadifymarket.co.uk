export const SUPPLIER_ADAPTER_INTERFACE_VERSION = 1 as const;

export type SupplierAdapterCapability =
  | 'supplier_identity'
  | 'catalog'
  | 'variants'
  | 'stock'
  | 'price'
  | 'shipping'
  | 'order_submission'
  | 'acknowledgement'
  | 'tracking'
  | 'cancellation'
  | 'returns'
  | 'reimbursement';

export type SupplierAdapterErrorClass =
  | 'AUTH_CONFIGURATION_FAILURE'
  | 'RATE_LIMITED'
  | 'RETRYABLE_FAILURE'
  | 'PERMANENT_REJECTION'
  | 'UNKNOWN_OUTCOME'
  | 'MALFORMED_RESPONSE'
  | 'CAPABILITY_UNAVAILABLE';

export type SupplierAdapterResult<T> =
  | { ok: true; data: T; externalRef?: string; acknowledged?: boolean }
  | { ok: false; errorClass: SupplierAdapterErrorClass; message: string; retryAfterMs?: number; externalRef?: string };

export interface SupplierAdapterContext {
  correlationId: string;
  idempotencyKey: string;
  supplierKey: string;
  territory: string;
}

export interface SupplierCatalogItemRef {
  externalProductRef: string;
  externalVariantRefs?: string[];
}

export interface SupplierStockSnapshot {
  externalVariantRef: string;
  quantity?: number;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';
  observedAt: string;
}

export interface SupplierPriceSnapshot {
  externalVariantRef: string;
  amountMinor: number;
  currency: string;
  observedAt: string;
}

export interface SupplierShippingQuote {
  serviceRef: string;
  amountMinor: number;
  currency: string;
  estimatedDispatchAt?: string;
  estimatedDeliveryFrom?: string;
  estimatedDeliveryTo?: string;
}

export interface SupplierOrderRequest {
  externalOfferRef: string;
  quantity: number;
  shippingServiceRef?: string;
  destinationCountry: string;
  // Customer PII is intentionally not part of the generic adapter contract here.
  // Provider implementations may translate the minimum lawful server-side
  // disclosure envelope without leaking credentials or PII into the core model.
}

export interface SupplierOrderAcknowledgement {
  supplierOrderRef: string;
  state: 'accepted' | 'pending' | 'rejected' | 'unknown';
  acknowledgedAt: string;
}

export interface SupplierTrackingEvent {
  supplierOrderRef: string;
  carrierRef?: string;
  trackingRef?: string;
  status: string;
  occurredAt: string;
}

/**
 * Canonical provider-neutral Supplier Adapter V1.
 *
 * Provider implementations conform to this interface; the commerce engine must
 * not import provider-specific payload types. Unsupported capabilities must
 * return CAPABILITY_UNAVAILABLE rather than silently degrading behavior.
 */
export interface SupplierAdapterV1 {
  readonly interfaceVersion: typeof SUPPLIER_ADAPTER_INTERFACE_VERSION;
  readonly providerKey: string;
  readonly adapterVersion: string;
  readonly capabilities: readonly SupplierAdapterCapability[];

  getSupplierIdentity?(context: SupplierAdapterContext): Promise<SupplierAdapterResult<Record<string, unknown>>>;
  listCatalog?(context: SupplierAdapterContext): Promise<SupplierAdapterResult<SupplierCatalogItemRef[]>>;
  getStock?(context: SupplierAdapterContext, externalVariantRefs: string[]): Promise<SupplierAdapterResult<SupplierStockSnapshot[]>>;
  getPrices?(context: SupplierAdapterContext, externalVariantRefs: string[]): Promise<SupplierAdapterResult<SupplierPriceSnapshot[]>>;
  quoteShipping?(context: SupplierAdapterContext, input: { externalOfferRef: string; quantity: number; destinationCountry: string }): Promise<SupplierAdapterResult<SupplierShippingQuote[]>>;
  submitOrder?(context: SupplierAdapterContext, input: SupplierOrderRequest): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>>;
  getOrderAcknowledgement?(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>>;
  /**
   * Optional lost-response recovery hook. Providers that can query by the same
   * idempotency key used for submitOrder should implement this so an UNKNOWN
   * outcome can be resolved without a blind duplicate submit. Recovery must use
   * the same idempotency key used for submitOrder.
   */
  findOrderByIdempotencyKey?(context: SupplierAdapterContext): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>>;
  getTracking?(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<SupplierTrackingEvent[]>>;
  cancelOrder?(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<{ cancelled: boolean }>>;
  requestReturn?(context: SupplierAdapterContext, supplierOrderRef: string, reasonCode: string): Promise<SupplierAdapterResult<{ returnRef: string }>>;
  getReimbursement?(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<{ amountMinor?: number; currency?: string; state: string }>>;
}

export function adapterSupports(adapter: Pick<SupplierAdapterV1, 'capabilities'>, capability: SupplierAdapterCapability): boolean {
  return adapter.capabilities.includes(capability);
}

export function assertSupplierAdapterV1(adapter: SupplierAdapterV1): void {
  if (adapter.interfaceVersion !== SUPPLIER_ADAPTER_INTERFACE_VERSION) {
    throw new Error(`Unsupported supplier adapter interface version: ${adapter.interfaceVersion}`);
  }
  if (!adapter.providerKey.trim() || !adapter.adapterVersion.trim()) {
    throw new Error('Supplier adapter providerKey and adapterVersion are required');
  }
  if (new Set(adapter.capabilities).size !== adapter.capabilities.length) {
    throw new Error('Supplier adapter capabilities must be unique');
  }
}
