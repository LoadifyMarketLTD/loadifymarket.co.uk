import type {
  SupplierAdapterContext,
  SupplierAdapterResult,
  SupplierAdapterV1,
} from './supplierAdapter';
import { SUPPLIER_ADAPTER_INTERFACE_VERSION } from './supplierAdapter';

/**
 * Provider adapter boundary for Avasam.
 *
 * This deliberately does not invent undocumented Avasam payloads or endpoints.
 * Until the verified Avasam API contract is configured, every capability remains
 * fail-closed rather than silently using guessed routes or degraded semantics.
 */
export class AvasamAdapterV1 implements SupplierAdapterV1 {
  readonly interfaceVersion = SUPPLIER_ADAPTER_INTERFACE_VERSION;
  readonly providerKey = 'avasam';
  readonly adapterVersion = '1.0.0-contract-foundation';
  readonly capabilities = [] as const;

  private unavailable<T>(capability: string): Promise<SupplierAdapterResult<T>> {
    return Promise.resolve({
      ok: false,
      errorClass: 'CAPABILITY_UNAVAILABLE',
      message: `Avasam capability '${capability}' is not enabled until its verified provider contract is configured`,
    });
  }

  getSupplierIdentity(context: SupplierAdapterContext) {
    void context;
    return this.unavailable<Record<string, unknown>>('supplier_identity');
  }

  listCatalog(context: SupplierAdapterContext) {
    void context;
    return this.unavailable<never[]>('catalog');
  }

  getStock(context: SupplierAdapterContext, externalVariantRefs: string[]) {
    void context; void externalVariantRefs;
    return this.unavailable<never[]>('stock');
  }

  getPrices(context: SupplierAdapterContext, externalVariantRefs: string[]) {
    void context; void externalVariantRefs;
    return this.unavailable<never[]>('price');
  }

  quoteShipping(context: SupplierAdapterContext, input: { externalOfferRef: string; quantity: number; destinationCountry: string }) {
    void context; void input;
    return this.unavailable<never[]>('shipping');
  }

  submitOrder(context: SupplierAdapterContext, input: { externalOfferRef: string; quantity: number; shippingServiceRef?: string; destinationCountry: string }) {
    void context; void input;
    return this.unavailable<never>('order_submission');
  }

  getOrderAcknowledgement(context: SupplierAdapterContext, supplierOrderRef: string) {
    void context; void supplierOrderRef;
    return this.unavailable<never>('acknowledgement');
  }

  findOrderByIdempotencyKey(context: SupplierAdapterContext) {
    void context;
    return this.unavailable<never>('acknowledgement');
  }

  getTracking(context: SupplierAdapterContext, supplierOrderRef: string) {
    void context; void supplierOrderRef;
    return this.unavailable<never[]>('tracking');
  }

  cancelOrder(context: SupplierAdapterContext, supplierOrderRef: string) {
    void context; void supplierOrderRef;
    return this.unavailable<never>('cancellation');
  }

  requestReturn(context: SupplierAdapterContext, supplierOrderRef: string, reasonCode: string) {
    void context; void supplierOrderRef; void reasonCode;
    return this.unavailable<never>('returns');
  }

  getReimbursement(context: SupplierAdapterContext, supplierOrderRef: string) {
    void context; void supplierOrderRef;
    return this.unavailable<never>('reimbursement');
  }
}

export function createAvasamAdapterV1(): AvasamAdapterV1 {
  return new AvasamAdapterV1();
}
