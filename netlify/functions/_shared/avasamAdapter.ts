import type {
  SupplierAdapterContext,
  SupplierAdapterResult,
  SupplierAdapterV1,
  SupplierCatalogItemRef,
  SupplierPriceSnapshot,
  SupplierStockSnapshot,
} from './supplierAdapter';
import { SUPPLIER_ADAPTER_INTERFACE_VERSION } from './supplierAdapter';
import {
  AVASAM_VERIFIED_ENDPOINTS,
  createSellerProductListRequest,
  createSellerStockRequest,
  parseSellerProductListResponse,
  parseSellerStockResponse,
  type AvasamSellerProduct,
  type AvasamSellerStockItem,
} from './avasamContracts';
import {
  AvasamClient,
  avasamClientFromEnvironment,
  type AvasamRequestContext,
} from './avasamClient';
import { AvasamTokenManager } from './avasamTokenManager';
import { AVASAM_PILOT_SKU } from './avasamSupplierPolicy';

const READ_PAGE_LIMIT = 100;
const MAX_READ_PAGES = 20;

export interface AvasamAdapterDependencies {
  client?: AvasamClient;
  tokenManager?: AvasamTokenManager;
  now?: () => number;
}

/**
 * Provider adapter boundary for Avasam.
 *
 * Only the read-only contracts proven against the live Seller API are exposed:
 * catalog identity for the controlled pilot SKU, seller price, and seller stock.
 * Every write/commercial capability remains fail-closed.
 */
export class AvasamAdapterV1 implements SupplierAdapterV1 {
  readonly interfaceVersion = SUPPLIER_ADAPTER_INTERFACE_VERSION;
  readonly providerKey = 'avasam';
  readonly adapterVersion = '1.1.0-read-only-pilot';
  readonly capabilities = ['catalog', 'stock', 'price'] as const;

  private readonly client: AvasamClient;
  private readonly tokenManager: AvasamTokenManager;
  private readonly now: () => number;

  constructor(dependencies: AvasamAdapterDependencies = {}) {
    this.client = dependencies.client ?? avasamClientFromEnvironment();
    this.tokenManager = dependencies.tokenManager ?? new AvasamTokenManager(this.client);
    this.now = dependencies.now ?? Date.now;
  }

  private unavailable<T>(capability: string): Promise<SupplierAdapterResult<T>> {
    return Promise.resolve({
      ok: false,
      errorClass: 'CAPABILITY_UNAVAILABLE',
      message: `Avasam capability '${capability}' is not enabled for the controlled read-only pilot`,
    });
  }

  private validateReadContext(context: SupplierAdapterContext): SupplierAdapterResult<null> {
    if (context.territory.trim().toUpperCase() !== 'GB') {
      return {
        ok: false,
        errorClass: 'CAPABILITY_UNAVAILABLE',
        message: 'Avasam read-only pilot is restricted to the GB territory',
      };
    }
    return { ok: true, data: null };
  }

  private validatePilotRefs(externalVariantRefs: string[]): SupplierAdapterResult<string[]> {
    const refs = [...new Set(externalVariantRefs.map(ref => ref.trim()).filter(Boolean))];
    if (refs.some(ref => ref !== AVASAM_PILOT_SKU)) {
      return {
        ok: false,
        errorClass: 'CAPABILITY_UNAVAILABLE',
        message: 'Avasam read-only adapter access is restricted to the approved pilot SKU',
      };
    }
    return { ok: true, data: refs };
  }

  private requestContext(context: SupplierAdapterContext): AvasamRequestContext {
    // Read-only Seller API calls do not use order idempotency semantics.
    return { correlationId: context.correlationId };
  }

  private async authenticatedPost<T>(
    context: SupplierAdapterContext,
    path: string,
    body: unknown,
  ): Promise<SupplierAdapterResult<T>> {
    const token = await this.tokenManager.getValidToken(this.now());
    if (!token.ok) return token;

    const execute = (accessToken: string) => this.client.authenticatedRequest<T>(
      this.requestContext(context),
      path,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    const first = await execute(token.data.access_token);
    if (first.ok || first.errorClass !== 'AUTH_CONFIGURATION_FAILURE') return first;

    // A cached token may have been invalidated provider-side before expires_at.
    // Refresh once; never loop or fall back to another auth transport.
    this.tokenManager.invalidate();
    const refreshed = await this.tokenManager.getValidToken(this.now());
    if (!refreshed.ok) return refreshed;
    return execute(refreshed.data.access_token);
  }

  private async findPilotProduct(context: SupplierAdapterContext): Promise<SupplierAdapterResult<AvasamSellerProduct>> {
    for (let page = 0; page < MAX_READ_PAGES; page += 1) {
      const result = await this.authenticatedPost<unknown>(
        context,
        AVASAM_VERIFIED_ENDPOINTS.getSellerProductList,
        createSellerProductListRequest(page, READ_PAGE_LIMIT),
      );
      if (!result.ok) return result;

      const parsed = parseSellerProductListResponse(result.data);
      if (!parsed.ok) return parsed;
      const match = parsed.data.find(item => item.SKU.trim() === AVASAM_PILOT_SKU);
      if (match) return { ok: true, data: match };
      if (parsed.data.length < READ_PAGE_LIMIT) {
        return {
          ok: false,
          errorClass: 'PERMANENT_REJECTION',
          message: 'Avasam pilot SKU is not present in the sourced seller product inventory',
        };
      }
    }

    return {
      ok: false,
      errorClass: 'UNKNOWN_OUTCOME',
      message: 'Avasam seller product pagination exceeded the controlled read limit',
    };
  }

  private async findPilotStock(context: SupplierAdapterContext): Promise<SupplierAdapterResult<AvasamSellerStockItem>> {
    for (let page = 0; page < MAX_READ_PAGES; page += 1) {
      const result = await this.authenticatedPost<unknown>(
        context,
        AVASAM_VERIFIED_ENDPOINTS.sellerStockList,
        createSellerStockRequest(page, READ_PAGE_LIMIT),
      );
      if (!result.ok) return result;

      const parsed = parseSellerStockResponse(result.data);
      if (!parsed.ok) return parsed;
      const match = parsed.data.find(item => item.SKU.trim() === AVASAM_PILOT_SKU);
      if (match) return { ok: true, data: match };
      if (parsed.data.length < READ_PAGE_LIMIT) {
        return {
          ok: false,
          errorClass: 'PERMANENT_REJECTION',
          message: 'Avasam pilot SKU is not present in the sourced seller stock inventory',
        };
      }
    }

    return {
      ok: false,
      errorClass: 'UNKNOWN_OUTCOME',
      message: 'Avasam seller stock pagination exceeded the controlled read limit',
    };
  }

  getSupplierIdentity(context: SupplierAdapterContext) {
    void context;
    return this.unavailable<Record<string, unknown>>('supplier_identity');
  }

  async listCatalog(context: SupplierAdapterContext): Promise<SupplierAdapterResult<SupplierCatalogItemRef[]>> {
    const contextGate = this.validateReadContext(context);
    if (!contextGate.ok) return contextGate;

    const product = await this.findPilotProduct(context);
    if (!product.ok) return product;
    return {
      ok: true,
      data: [{
        externalProductRef: AVASAM_PILOT_SKU,
        externalVariantRefs: [AVASAM_PILOT_SKU],
      }],
    };
  }

  async getStock(
    context: SupplierAdapterContext,
    externalVariantRefs: string[],
  ): Promise<SupplierAdapterResult<SupplierStockSnapshot[]>> {
    const contextGate = this.validateReadContext(context);
    if (!contextGate.ok) return contextGate;
    const refs = this.validatePilotRefs(externalVariantRefs);
    if (!refs.ok) return refs;
    if (refs.data.length === 0) return { ok: true, data: [] };

    const stock = await this.findPilotStock(context);
    if (!stock.ok) return stock;
    if (stock.data.Stock < 0) {
      return {
        ok: false,
        errorClass: 'MALFORMED_RESPONSE',
        message: 'Avasam returned a negative stock quantity for the pilot SKU',
      };
    }

    const observedAt = new Date(this.now()).toISOString();
    return {
      ok: true,
      data: [{
        externalVariantRef: AVASAM_PILOT_SKU,
        quantity: stock.data.Stock,
        availability: stock.data.Stock > 0 ? 'in_stock' : 'out_of_stock',
        observedAt,
      }],
    };
  }

  async getPrices(
    context: SupplierAdapterContext,
    externalVariantRefs: string[],
  ): Promise<SupplierAdapterResult<SupplierPriceSnapshot[]>> {
    const contextGate = this.validateReadContext(context);
    if (!contextGate.ok) return contextGate;
    const refs = this.validatePilotRefs(externalVariantRefs);
    if (!refs.ok) return refs;
    if (refs.data.length === 0) return { ok: true, data: [] };

    const product = await this.findPilotProduct(context);
    if (!product.ok) return product;
    const amountMinor = Math.round(product.data.Price * 100);
    if (product.data.Price < 0 || !Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      return {
        ok: false,
        errorClass: 'MALFORMED_RESPONSE',
        message: 'Avasam returned an invalid price for the pilot SKU',
      };
    }

    return {
      ok: true,
      data: [{
        externalVariantRef: AVASAM_PILOT_SKU,
        amountMinor,
        currency: 'GBP',
        observedAt: new Date(this.now()).toISOString(),
      }],
    };
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

export function createAvasamAdapterV1(dependencies: AvasamAdapterDependencies = {}): AvasamAdapterV1 {
  return new AvasamAdapterV1(dependencies);
}
