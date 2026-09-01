import { BigBuyClient, type BigBuyRequestContext } from './bigBuyClient';
import {
  BIGBUY_READONLY_ENDPOINTS,
  bigBuyParentTaxonomyPath,
  parseBigBuyProductsResponse,
  parseBigBuyStockResponse,
  parseBigBuyVariationsResponse,
  type BigBuyProduct,
  type BigBuyProductVariation,
  type BigBuyStockItem,
} from './bigBuyContracts';
import {
  projectBigBuyReadModel,
  type BigBuyReadProjectionV1,
} from './bigBuyReadProjection';
import type { SupplierAdapterResult } from './supplierAdapter';

export const BIGBUY_CONTROLLED_READ_SESSION_INTERFACE_VERSION = 1 as const;

export interface BigBuyControlledReadScopeV1 {
  parentTaxonomy: number;
  productId: number;
  productSku: string;
  variationId: number;
  variationSku: string;
}

export interface BigBuyControlledReadSessionInputV1 {
  client: BigBuyClient;
  context: BigBuyRequestContext;
  scope: BigBuyControlledReadScopeV1;
  observedAt?: string;
}

export interface BigBuyControlledReadSessionResultV1 {
  interfaceVersion: typeof BIGBUY_CONTROLLED_READ_SESSION_INTERFACE_VERSION;
  provider: 'bigbuy';
  environment: 'sandbox';
  scope: {
    parentTaxonomy: number;
    product: { id: number; sku: string };
    variation: { id: number; sku: string; productId: number };
  };
  projection: BigBuyReadProjectionV1;
  transport: {
    requestCount: 4;
    method: 'GET';
    productionAllowed: false;
    writeRequestsPerformed: false;
    customerPiiProcessed: false;
    capabilityPromotionPerformed: false;
  };
}

interface BigBuyControlledReadPreflightV1 {
  parentTaxonomy: number;
  productId: number;
  productSku: string;
  variationId: number;
  variationSku: string;
  observedAt: string;
}

function malformed<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'MALFORMED_RESPONSE', message };
}

function rejected<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'PERMANENT_REJECTION', message };
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function preflightControlledRead(
  input: BigBuyControlledReadSessionInputV1,
): SupplierAdapterResult<BigBuyControlledReadPreflightV1> {
  const rawScope: unknown = input.scope;
  if (!rawScope || typeof rawScope !== 'object' || Array.isArray(rawScope)) {
    return rejected('BigBuy controlled read scope is invalid');
  }

  const scope = rawScope as Record<string, unknown>;
  const parentTaxonomy = scope.parentTaxonomy;
  const productId = scope.productId;
  const variationId = scope.variationId;
  const productSku = typeof scope.productSku === 'string' ? scope.productSku.trim() : '';
  const variationSku = typeof scope.variationSku === 'string' ? scope.variationSku.trim() : '';

  if (!positiveSafeInteger(parentTaxonomy)) {
    return rejected('BigBuy controlled parent taxonomy must be a positive safe integer');
  }
  if (!positiveSafeInteger(productId) || !productSku) {
    return rejected('BigBuy controlled product id/SKU is invalid');
  }
  if (!positiveSafeInteger(variationId) || !variationSku) {
    return rejected('BigBuy controlled variation id/SKU is invalid');
  }
  if (productSku === variationSku) {
    return rejected('BigBuy controlled product and variation SKUs must be distinct');
  }

  const rawObservedAt: unknown = input.observedAt ?? new Date().toISOString();
  if (typeof rawObservedAt !== 'string' || !rawObservedAt.trim()) {
    return rejected('BigBuy controlled observedAt is required');
  }
  const observedTimestamp = Date.parse(rawObservedAt.trim());
  if (Number.isNaN(observedTimestamp)) {
    return rejected('BigBuy controlled observedAt is invalid');
  }

  return {
    ok: true,
    data: {
      parentTaxonomy,
      productId,
      productSku,
      variationId,
      variationSku,
      observedAt: new Date(observedTimestamp).toISOString(),
    },
  };
}

function controlledIdentity<T extends { id: number; sku: string }>(
  items: readonly T[],
  id: number,
  sku: string,
  label: string,
): SupplierAdapterResult<T> {
  const normalizedSku = sku.trim();
  if (!positiveSafeInteger(id) || !normalizedSku) {
    return malformed(`BigBuy controlled ${label} identity is invalid`);
  }

  const byId = items.filter(item => item.id === id);
  const bySku = items.filter(item => item.sku === normalizedSku);
  if (
    byId.length !== 1
    || bySku.length !== 1
    || byId[0].sku !== normalizedSku
    || bySku[0].id !== id
  ) {
    return malformed(`BigBuy controlled ${label} id/SKU identity is ambiguous or missing`);
  }

  return { ok: true, data: byId[0] };
}

function controlledOptionalStock(
  items: readonly BigBuyStockItem[],
  id: number,
  sku: string,
  label: string,
): SupplierAdapterResult<BigBuyStockItem | null> {
  const normalizedSku = sku.trim();
  const byId = items.filter(item => item.id === id);
  const bySku = items.filter(item => item.sku === normalizedSku);

  if (byId.length === 0 && bySku.length === 0) return { ok: true, data: null };
  if (
    byId.length !== 1
    || bySku.length !== 1
    || byId[0].sku !== normalizedSku
    || bySku[0].id !== id
  ) {
    return malformed(`BigBuy controlled ${label} id/SKU binding is ambiguous or inconsistent`);
  }

  return { ok: true, data: byId[0] };
}

async function requestUnknown(
  client: BigBuyClient,
  context: BigBuyRequestContext,
  path: string,
): Promise<SupplierAdapterResult<unknown>> {
  return client.request<unknown>(context, path);
}

/**
 * Executes a deliberately narrow BigBuy sandbox read session for one controlled
 * product and one controlled variation.
 *
 * The concrete BigBuyClient type is required so the sandbox-only transport gate
 * remains part of the execution boundary. The session validates the complete
 * controlled scope before any request, then performs four sequential GETs and
 * stops immediately on transport/parser failure. It never registers BigBuy,
 * promotes a capability, submits an order, or processes customer PII.
 */
export async function runBigBuyControlledReadSession(
  input: BigBuyControlledReadSessionInputV1,
): Promise<SupplierAdapterResult<BigBuyControlledReadSessionResultV1>> {
  const preflight = preflightControlledRead(input);
  if (!preflight.ok) return preflight;
  const scope = preflight.data;

  const productsPath = bigBuyParentTaxonomyPath(
    BIGBUY_READONLY_ENDPOINTS.products,
    scope.parentTaxonomy,
  );
  if (!productsPath.ok) return productsPath;

  const variationsPath = bigBuyParentTaxonomyPath(
    BIGBUY_READONLY_ENDPOINTS.productVariations,
    scope.parentTaxonomy,
  );
  if (!variationsPath.ok) return variationsPath;

  const productStockPath = bigBuyParentTaxonomyPath(
    BIGBUY_READONLY_ENDPOINTS.productStock,
    scope.parentTaxonomy,
  );
  if (!productStockPath.ok) return productStockPath;

  const variationStockPath = bigBuyParentTaxonomyPath(
    BIGBUY_READONLY_ENDPOINTS.variationStock,
    scope.parentTaxonomy,
  );
  if (!variationStockPath.ok) return variationStockPath;

  const productsResponse = await requestUnknown(input.client, input.context, productsPath.data);
  if (!productsResponse.ok) return productsResponse;
  const products = parseBigBuyProductsResponse(productsResponse.data);
  if (!products.ok) return products;
  const product = controlledIdentity<BigBuyProduct>(
    products.data,
    scope.productId,
    scope.productSku,
    'product',
  );
  if (!product.ok) return product;

  const variationsResponse = await requestUnknown(input.client, input.context, variationsPath.data);
  if (!variationsResponse.ok) return variationsResponse;
  const variations = parseBigBuyVariationsResponse(variationsResponse.data);
  if (!variations.ok) return variations;
  const variation = controlledIdentity<BigBuyProductVariation>(
    variations.data,
    scope.variationId,
    scope.variationSku,
    'variation',
  );
  if (!variation.ok) return variation;
  if (variation.data.product !== product.data.id) {
    return malformed('BigBuy controlled variation is not bound to the controlled product');
  }

  const productStockResponse = await requestUnknown(input.client, input.context, productStockPath.data);
  if (!productStockResponse.ok) return productStockResponse;
  const productStockItems = parseBigBuyStockResponse(productStockResponse.data);
  if (!productStockItems.ok) return productStockItems;
  const productStock = controlledOptionalStock(
    productStockItems.data,
    product.data.id,
    product.data.sku,
    'product stock',
  );
  if (!productStock.ok) return productStock;

  const variationStockResponse = await requestUnknown(input.client, input.context, variationStockPath.data);
  if (!variationStockResponse.ok) return variationStockResponse;
  const variationStockItems = parseBigBuyStockResponse(variationStockResponse.data);
  if (!variationStockItems.ok) return variationStockItems;
  const variationStock = controlledOptionalStock(
    variationStockItems.data,
    variation.data.id,
    variation.data.sku,
    'variation stock',
  );
  if (!variationStock.ok) return variationStock;

  const projection = projectBigBuyReadModel({
    products: [product.data],
    variations: [variation.data],
    productStock: productStock.data ? [productStock.data] : [],
    variationStock: variationStock.data ? [variationStock.data] : [],
    observedAt: scope.observedAt,
  });
  if (!projection.ok) return projection;

  return {
    ok: true,
    data: {
      interfaceVersion: BIGBUY_CONTROLLED_READ_SESSION_INTERFACE_VERSION,
      provider: 'bigbuy',
      environment: 'sandbox',
      scope: {
        parentTaxonomy: scope.parentTaxonomy,
        product: { id: product.data.id, sku: product.data.sku },
        variation: {
          id: variation.data.id,
          sku: variation.data.sku,
          productId: variation.data.product,
        },
      },
      projection: projection.data,
      transport: {
        requestCount: 4,
        method: 'GET',
        productionAllowed: false,
        writeRequestsPerformed: false,
        customerPiiProcessed: false,
        capabilityPromotionPerformed: false,
      },
    },
  };
}
