import type {
  SupplierAdapterCapability,
  SupplierAdapterContext,
  SupplierAdapterResult,
  SupplierAdapterV1,
  SupplierCatalogItemRef,
  SupplierOrderAcknowledgement,
  SupplierOrderRequest,
  SupplierPriceSnapshot,
  SupplierShippingQuote,
  SupplierStockSnapshot,
  SupplierTrackingEvent,
} from './supplierAdapter';
import { SUPPLIER_ADAPTER_INTERFACE_VERSION } from './supplierAdapter';

/**
 * Safe placeholder for a known supplier provider whose contract has not yet
 * passed Loadify's provider-specific verification gates.
 *
 * It intentionally advertises zero capabilities and every operation fails
 * closed before network access. Replacing this scaffold with a real provider
 * adapter requires explicit provider contract verification and separate gates.
 */
export class InactiveSupplierAdapterV1 implements SupplierAdapterV1 {
  readonly interfaceVersion = SUPPLIER_ADAPTER_INTERFACE_VERSION;
  readonly capabilities = [] as const;

  constructor(
    readonly providerKey: string,
    readonly adapterVersion = '0.1.0-scaffold-off',
  ) {
    if (!providerKey.trim()) throw new Error('Inactive supplier adapter providerKey is required');
  }

  private unavailable<T>(capability: SupplierAdapterCapability): Promise<SupplierAdapterResult<T>> {
    return Promise.resolve({
      ok: false,
      errorClass: 'CAPABILITY_UNAVAILABLE',
      message: `${this.providerKey} capability '${capability}' is scaffolded but not enabled`,
    });
  }

  getSupplierIdentity(_context: SupplierAdapterContext) {
    return this.unavailable<Record<string, unknown>>('supplier_identity');
  }

  listCatalog(_context: SupplierAdapterContext) {
    return this.unavailable<SupplierCatalogItemRef[]>('catalog');
  }

  getStock(_context: SupplierAdapterContext, _externalVariantRefs: string[]) {
    return this.unavailable<SupplierStockSnapshot[]>('stock');
  }

  getPrices(_context: SupplierAdapterContext, _externalVariantRefs: string[]) {
    return this.unavailable<SupplierPriceSnapshot[]>('price');
  }

  quoteShipping(
    _context: SupplierAdapterContext,
    _input: { externalOfferRef: string; quantity: number; destinationCountry: string },
  ) {
    return this.unavailable<SupplierShippingQuote[]>('shipping');
  }

  submitOrder(_context: SupplierAdapterContext, _input: SupplierOrderRequest) {
    return this.unavailable<SupplierOrderAcknowledgement>('order_submission');
  }

  getOrderAcknowledgement(_context: SupplierAdapterContext, _supplierOrderRef: string) {
    return this.unavailable<SupplierOrderAcknowledgement>('acknowledgement');
  }

  findOrderByIdempotencyKey(_context: SupplierAdapterContext) {
    return this.unavailable<SupplierOrderAcknowledgement>('acknowledgement');
  }

  getTracking(_context: SupplierAdapterContext, _supplierOrderRef: string) {
    return this.unavailable<SupplierTrackingEvent[]>('tracking');
  }

  cancelOrder(_context: SupplierAdapterContext, _supplierOrderRef: string) {
    return this.unavailable<{ cancelled: boolean }>('cancellation');
  }

  requestReturn(_context: SupplierAdapterContext, _supplierOrderRef: string, _reasonCode: string) {
    return this.unavailable<{ returnRef: string }>('returns');
  }

  getReimbursement(_context: SupplierAdapterContext, _supplierOrderRef: string) {
    return this.unavailable<{ amountMinor?: number; currency?: string; state: string }>('reimbursement');
  }
}
