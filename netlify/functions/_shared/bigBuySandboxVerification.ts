import type { SupplierAdapterResult } from './supplierAdapter';
import type { BigBuyClient, BigBuyRequestContext } from './bigBuyClient';
import {
  BIGBUY_READONLY_ENDPOINTS,
  bigBuyParentTaxonomyPath,
  parseBigBuyProductsResponse,
  parseBigBuyStockResponse,
  parseBigBuyVariationsResponse,
  totalBigBuyStock,
  type BigBuyProduct,
  type BigBuyProductVariation,
  type BigBuyStockItem,
} from './bigBuyContracts';

export const BIGBUY_SANDBOX_VERIFICATION_INTERFACE_VERSION = 1 as const;

export interface BigBuySandboxVerificationConfigV1 {
  parentTaxonomy: number;
  productId: number;
  productSku: string;
  variationId: number;
  variationSku: string;
}

export interface BigBuyReadOnlyTransport {
  request<T>(
    context: BigBuyRequestContext,
    path: string,
    init?: RequestInit,
  ): Promise<SupplierAdapterResult<T>>;
}

export interface BigBuySandboxVerificationEvidenceV1 {
  interfaceVersion: typeof BIGBUY_SANDBOX_VERIFICATION_INTERFACE_VERSION;
  provider: 'bigbuy';
  environment: 'sandbox';
  observedAt: string;
  controlledScope: {
    parentTaxonomy: number;
    productId: number;
    productSku: string;
    variationId: number;
    variationSku: string;
  };
  observedContracts: {
    products: {
      matched: true;
      active: 0 | 1;
      wholesalePrice: number;
    };
    variations: {
      matched: true;
      parentProductMatched: true;
      wholesalePrice: number;
    };
    productStock: {
      matched: true;
      totalQuantity: number;
      stockBucketCount: number;
    };
    variationStock: {
      matched: true;
      totalQuantity: number;
      stockBucketCount: number;
    };
  };
  safety: {
    ordersCalled: false;
    piiProcessed: false;
    providerWriteExecuted: false;
    capabilityPromotionPerformed: false;
    marketplacePublicationPerformed: false;
    rawProviderPayloadReturned: false;
  };
  promotion: {
    automaticallyAllowed: false;
    requiresSeparateEvidenceReview: true;
  };
}

function positiveSafeInteger(value: number, field: string): SupplierAdapterResult<number> {
  if (!Number.isSafeInteger(value) || value <= 0) {
    return {
      ok: false,
      errorClass: 'PERMANENT_REJECTION',
      message: `BigBuy ${field} must be a positive safe integer`,
    };
  }
  return { ok: true, data: value };
}

function requiredString(value: string, field: string): SupplierAdapterResult<string> {
  const normalized = value.trim();
  if (!normalized) {
    return {
      ok: false,
      errorClass: 'PERMANENT_REJECTION',
      message: `BigBuy ${field} is required`,
    };
  }
  return { ok: true, data: normalized };
}

function oneControlledMatch<T extends { id: number; sku: string }>(
  items: T[],
  id: number,
  sku: string,
  label: string,
): SupplierAdapterResult<T> {
  const matches = items.filter(item => item.id === id && item.sku === sku);
  if (matches.length !== 1) {
    return {
      ok: false,
      errorClass: 'PERMANENT_REJECTION',
      message: `BigBuy ${label} did not contain exactly one controlled id/SKU match`,
    };
  }
  return { ok: true, data: matches[0] };
}

function pathOrFailure(endpoint: string, parentTaxonomy: number): SupplierAdapterResult<string> {
  return bigBuyParentTaxonomyPath(endpoint, parentTaxonomy);
}

async function requestParsed<T>(
  client: BigBuyReadOnlyTransport,
  context: BigBuyRequestContext,
  path: string,
  parser: (value: unknown) => SupplierAdapterResult<T>,
): Promise<SupplierAdapterResult<T>> {
  const result = await client.request<unknown>(context, path, { method: 'GET' });
  if (!result.ok) return result;
  return parser(result.data);
}

/**
 * Executes the controlled BigBuy sandbox read-only evidence gate against the
 * production BigBuy transport/contracts. It never promotes a capability or
 * performs a provider/commercial mutation. The caller owns admin authorization
 * and sandbox-only environment enforcement.
 */
export async function runBigBuySandboxVerification(input: {
  client: BigBuyReadOnlyTransport | BigBuyClient;
  context: BigBuyRequestContext;
  config: BigBuySandboxVerificationConfigV1;
  now?: () => number;
}): Promise<SupplierAdapterResult<BigBuySandboxVerificationEvidenceV1>> {
  const now = input.now ?? Date.now;
  const parentTaxonomy = positiveSafeInteger(input.config.parentTaxonomy, 'parentTaxonomy');
  if (!parentTaxonomy.ok) return parentTaxonomy;
  const productId = positiveSafeInteger(input.config.productId, 'productId');
  if (!productId.ok) return productId;
  const variationId = positiveSafeInteger(input.config.variationId, 'variationId');
  if (!variationId.ok) return variationId;
  const productSku = requiredString(input.config.productSku, 'productSku');
  if (!productSku.ok) return productSku;
  const variationSku = requiredString(input.config.variationSku, 'variationSku');
  if (!variationSku.ok) return variationSku;
  if (!input.context.correlationId.trim()) {
    return {
      ok: false,
      errorClass: 'AUTH_CONFIGURATION_FAILURE',
      message: 'BigBuy sandbox verification requires a correlation id',
    };
  }

  const productPath = pathOrFailure(BIGBUY_READONLY_ENDPOINTS.products, parentTaxonomy.data);
  if (!productPath.ok) return productPath;
  const variationPath = pathOrFailure(BIGBUY_READONLY_ENDPOINTS.productVariations, parentTaxonomy.data);
  if (!variationPath.ok) return variationPath;
  const productStockPath = pathOrFailure(BIGBUY_READONLY_ENDPOINTS.productStock, parentTaxonomy.data);
  if (!productStockPath.ok) return productStockPath;
  const variationStockPath = pathOrFailure(BIGBUY_READONLY_ENDPOINTS.variationStock, parentTaxonomy.data);
  if (!variationStockPath.ok) return variationStockPath;

  const products = await requestParsed<BigBuyProduct[]>(
    input.client,
    input.context,
    productPath.data,
    parseBigBuyProductsResponse,
  );
  if (!products.ok) return products;
  const product = oneControlledMatch(products.data, productId.data, productSku.data, 'products');
  if (!product.ok) return product;

  const variations = await requestParsed<BigBuyProductVariation[]>(
    input.client,
    input.context,
    variationPath.data,
    parseBigBuyVariationsResponse,
  );
  if (!variations.ok) return variations;
  const variation = oneControlledMatch(variations.data, variationId.data, variationSku.data, 'variations');
  if (!variation.ok) return variation;
  if (variation.data.product !== productId.data) {
    return {
      ok: false,
      errorClass: 'PERMANENT_REJECTION',
      message: 'BigBuy controlled variation is not bound to the controlled product',
    };
  }

  const productStockItems = await requestParsed<BigBuyStockItem[]>(
    input.client,
    input.context,
    productStockPath.data,
    parseBigBuyStockResponse,
  );
  if (!productStockItems.ok) return productStockItems;
  const productStock = oneControlledMatch(
    productStockItems.data,
    productId.data,
    productSku.data,
    'product stock',
  );
  if (!productStock.ok) return productStock;
  const productStockTotal = totalBigBuyStock(productStock.data);
  if (!productStockTotal.ok) return productStockTotal;

  const variationStockItems = await requestParsed<BigBuyStockItem[]>(
    input.client,
    input.context,
    variationStockPath.data,
    parseBigBuyStockResponse,
  );
  if (!variationStockItems.ok) return variationStockItems;
  const variationStock = oneControlledMatch(
    variationStockItems.data,
    variationId.data,
    variationSku.data,
    'variation stock',
  );
  if (!variationStock.ok) return variationStock;
  const variationStockTotal = totalBigBuyStock(variationStock.data);
  if (!variationStockTotal.ok) return variationStockTotal;

  return {
    ok: true,
    data: {
      interfaceVersion: BIGBUY_SANDBOX_VERIFICATION_INTERFACE_VERSION,
      provider: 'bigbuy',
      environment: 'sandbox',
      observedAt: new Date(now()).toISOString(),
      controlledScope: {
        parentTaxonomy: parentTaxonomy.data,
        productId: productId.data,
        productSku: productSku.data,
        variationId: variationId.data,
        variationSku: variationSku.data,
      },
      observedContracts: {
        products: {
          matched: true,
          active: product.data.active,
          wholesalePrice: product.data.wholesalePrice,
        },
        variations: {
          matched: true,
          parentProductMatched: true,
          wholesalePrice: variation.data.wholesalePrice,
        },
        productStock: {
          matched: true,
          totalQuantity: productStockTotal.data,
          stockBucketCount: productStock.data.stocks.length,
        },
        variationStock: {
          matched: true,
          totalQuantity: variationStockTotal.data,
          stockBucketCount: variationStock.data.stocks.length,
        },
      },
      safety: {
        ordersCalled: false,
        piiProcessed: false,
        providerWriteExecuted: false,
        capabilityPromotionPerformed: false,
        marketplacePublicationPerformed: false,
        rawProviderPayloadReturned: false,
      },
      promotion: {
        automaticallyAllowed: false,
        requiresSeparateEvidenceReview: true,
      },
    },
  };
}
