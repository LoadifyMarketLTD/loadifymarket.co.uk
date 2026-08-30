import type { SupplierAdapterResult } from './supplierAdapter';

export const BIGBUY_READONLY_ENDPOINTS = {
  products: '/rest/catalog/products.json',
  productInformation: '/rest/catalog/productsinformation.json',
  productVariations: '/rest/catalog/productsvariations.json',
  productStock: '/rest/catalog/productsstockbyhandlingdays.json',
  variationStock: '/rest/catalog/productsvariationsstockbyhandlingdays.json',
} as const;

export interface BigBuyProduct {
  id: number;
  sku: string;
  wholesalePrice: number;
  active: 0 | 1;
}

export interface BigBuyProductVariation {
  id: number;
  sku: string;
  product: number;
  wholesalePrice: number;
}

export interface BigBuyStockBucket {
  quantity: number;
  minHandlingDays: number;
  maxHandlingDays: number;
  warehouse: number;
}

export interface BigBuyStockItem {
  id: number;
  sku: string;
  stocks: BigBuyStockBucket[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformed<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'MALFORMED_RESPONSE', message };
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function nonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function bigBuyParentTaxonomyPath(
  endpoint: string,
  parentTaxonomy: number,
  extraParams: Record<string, string> = {},
): SupplierAdapterResult<string> {
  if (!positiveSafeInteger(parentTaxonomy)) {
    return {
      ok: false,
      errorClass: 'PERMANENT_REJECTION',
      message: 'BigBuy parent taxonomy must be a positive safe integer',
    };
  }
  if (!endpoint.startsWith('/rest/catalog/') || endpoint.includes('\\') || endpoint.includes('?')) {
    return {
      ok: false,
      errorClass: 'PERMANENT_REJECTION',
      message: 'BigBuy catalogue endpoint is not trusted',
    };
  }

  const params = new URLSearchParams({ parentTaxonomy: String(parentTaxonomy), ...extraParams });
  return { ok: true, data: `${endpoint}?${params.toString()}` };
}

export function parseBigBuyProductsResponse(value: unknown): SupplierAdapterResult<BigBuyProduct[]> {
  if (!Array.isArray(value)) return malformed('BigBuy products response must be an array');

  const products: BigBuyProduct[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) return malformed(`BigBuy products[${index}] must be an object`);
    if (!positiveSafeInteger(item.id)) return malformed(`BigBuy products[${index}].id is invalid`);
    if (typeof item.sku !== 'string' || !item.sku.trim()) return malformed(`BigBuy products[${index}].sku is invalid`);
    if (!nonNegativeFiniteNumber(item.wholesalePrice)) return malformed(`BigBuy products[${index}].wholesalePrice is invalid`);
    if (item.active !== 0 && item.active !== 1) return malformed(`BigBuy products[${index}].active is invalid`);

    products.push({
      id: item.id,
      sku: item.sku.trim(),
      wholesalePrice: item.wholesalePrice,
      active: item.active,
    });
  }
  return { ok: true, data: products };
}

export function parseBigBuyVariationsResponse(value: unknown): SupplierAdapterResult<BigBuyProductVariation[]> {
  if (!Array.isArray(value)) return malformed('BigBuy variations response must be an array');

  const variations: BigBuyProductVariation[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) return malformed(`BigBuy variations[${index}] must be an object`);
    if (!positiveSafeInteger(item.id)) return malformed(`BigBuy variations[${index}].id is invalid`);
    if (typeof item.sku !== 'string' || !item.sku.trim()) return malformed(`BigBuy variations[${index}].sku is invalid`);
    if (!positiveSafeInteger(item.product)) return malformed(`BigBuy variations[${index}].product is invalid`);
    if (!nonNegativeFiniteNumber(item.wholesalePrice)) return malformed(`BigBuy variations[${index}].wholesalePrice is invalid`);

    variations.push({
      id: item.id,
      sku: item.sku.trim(),
      product: item.product,
      wholesalePrice: item.wholesalePrice,
    });
  }
  return { ok: true, data: variations };
}

export function parseBigBuyStockResponse(value: unknown): SupplierAdapterResult<BigBuyStockItem[]> {
  if (!Array.isArray(value)) return malformed('BigBuy stock response must be an array');

  const stockItems: BigBuyStockItem[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) return malformed(`BigBuy stock[${index}] must be an object`);
    if (!positiveSafeInteger(item.id)) return malformed(`BigBuy stock[${index}].id is invalid`);
    if (typeof item.sku !== 'string' || !item.sku.trim()) return malformed(`BigBuy stock[${index}].sku is invalid`);
    if (!Array.isArray(item.stocks)) return malformed(`BigBuy stock[${index}].stocks must be an array`);

    const stocks: BigBuyStockBucket[] = [];
    for (const [stockIndex, bucket] of item.stocks.entries()) {
      if (!isRecord(bucket)) return malformed(`BigBuy stock[${index}].stocks[${stockIndex}] must be an object`);
      if (!nonNegativeSafeInteger(bucket.quantity)) return malformed(`BigBuy stock[${index}].stocks[${stockIndex}].quantity is invalid`);
      if (!nonNegativeSafeInteger(bucket.minHandlingDays)) return malformed(`BigBuy stock[${index}].stocks[${stockIndex}].minHandlingDays is invalid`);
      if (!nonNegativeSafeInteger(bucket.maxHandlingDays)) return malformed(`BigBuy stock[${index}].stocks[${stockIndex}].maxHandlingDays is invalid`);
      if (bucket.maxHandlingDays < bucket.minHandlingDays) return malformed(`BigBuy stock[${index}].stocks[${stockIndex}] handling-day range is invalid`);
      if (!nonNegativeSafeInteger(bucket.warehouse)) return malformed(`BigBuy stock[${index}].stocks[${stockIndex}].warehouse is invalid`);
      stocks.push({
        quantity: bucket.quantity,
        minHandlingDays: bucket.minHandlingDays,
        maxHandlingDays: bucket.maxHandlingDays,
        warehouse: bucket.warehouse,
      });
    }

    stockItems.push({ id: item.id, sku: item.sku.trim(), stocks });
  }
  return { ok: true, data: stockItems };
}

export function totalBigBuyStock(item: BigBuyStockItem): SupplierAdapterResult<number> {
  let total = 0;
  for (const bucket of item.stocks) {
    total += bucket.quantity;
    if (!Number.isSafeInteger(total)) return malformed('BigBuy stock total exceeds safe integer range');
  }
  return { ok: true, data: total };
}
