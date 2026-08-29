import type { SupplierAdapterResult } from './supplierAdapter';

export const AVASAM_VERIFIED_ENDPOINTS = {
  requestToken: '/api/auth/request-token',
  getSellerProductList: '/apiseeker/Products/GetSellerProductList',
  getInventoryListWithFilter: '/apiseeker/ProductModule/GetInventoryListWithFilter',
  sellerStockList: '/apiseeker/Products/SellerStockList',
  acknowledgeStockUpdate: '/api-seller/Product/AcknowledgeStockUpdate',
} as const;

export interface AvasamSellerProductListRequest {
  Page: number;
  Limit: number;
}

export interface AvasamSellerProduct {
  SKU: string;
  Price: number;
  Title?: string;
  BarCode?: string | null;
  Vat?: number;
  RetailPrice?: number;
  Category?: string;
  CategoryId?: string;
  Description?: string | null;
  MinimumLevel?: number;
  ProductDepth?: number;
  ProductWeight?: number;
  ProductWidth?: number;
  Height?: number;
  ProductImage?: string[];
  IsVariation?: boolean;
}

export type AvasamInventoryScope = 'parents_and_singles' | 'variation_children';

export interface AvasamInventoryFilterRequest {
  ProductType: unknown[];
  Supplier: string;
  Sortby: string;
  SortStatus: string;
  limit: number;
  PriceDelimeter: string;
  PriceValue: number;
  StockValue: string;
  Stock: number;
  Category: string;
  CategoryName: string;
  IsMapped: string;
  PriceMaxValue: number;
  PriceMaxDelimeter: string;
  page: number;
  Variation?: 'true';
  Showchild?: 'true';
}

export interface AvasamInventoryItem {
  SKU: string;
  Price: number;
  Stock: number;
  Number?: string;
  RetailPrice?: number;
  PriceIncVat?: number;
  RetailPriceIncVat?: number;
  VATPercentage?: number;
  Title?: string;
  image?: string;
  IsActive?: boolean;
  Category?: string;
  CategoryId?: string;
  HasVariations?: boolean;
  isMapped?: boolean;
}

export interface AvasamInventoryListResponse {
  data: AvasamInventoryItem[];
  total: number;
}

export interface AvasamSellerStockRequest {
  limit: number;
  page: number;
}

export interface AvasamSellerStockItem {
  SKU: string;
  Stock: number;
}

export interface AvasamWebhookEnvelope<T> {
  requestId: string;
  on: string;
  token: string;
  data: T[];
}

export interface AvasamStockUpdate {
  sku: string;
  quantity: number;
  updatedOn: string;
}

function malformed<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'MALFORMED_RESPONSE', message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function integerNumber(value: unknown): value is number {
  return finiteNumber(value) && Number.isInteger(value);
}

function dateTimeString(value: unknown): value is string {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function optionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function optionalNumber(value: unknown): value is number | undefined {
  return value === undefined || finiteNumber(value);
}

function optionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function optionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every(item => typeof item === 'string'));
}

export function createSellerProductListRequest(page: number, limit: number): AvasamSellerProductListRequest {
  if (!Number.isInteger(page) || page < 0) throw new Error('Avasam product page must be a non-negative integer');
  if (!Number.isInteger(limit) || limit <= 0) throw new Error('Avasam product limit must be a positive integer');
  return { Page: page, Limit: limit };
}

export function parseSellerProductListResponse(value: unknown): SupplierAdapterResult<AvasamSellerProduct[]> {
  if (!Array.isArray(value)) return malformed('Avasam GetSellerProductList response must be an array');
  const items: AvasamSellerProduct[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !nonEmptyString(raw.SKU) || !finiteNumber(raw.Price)) {
      return malformed('Avasam GetSellerProductList returned an invalid product row');
    }
    if (!optionalString(raw.Title) || !optionalString(raw.BarCode) || !optionalNumber(raw.Vat)
      || !optionalNumber(raw.RetailPrice) || !optionalString(raw.Category) || !optionalString(raw.CategoryId)
      || !optionalString(raw.Description) || !optionalNumber(raw.MinimumLevel) || !optionalNumber(raw.ProductDepth)
      || !optionalNumber(raw.ProductWeight) || !optionalNumber(raw.ProductWidth) || !optionalNumber(raw.Height)
      || !optionalStringArray(raw.ProductImage) || !optionalBoolean(raw.IsVariation)) {
      return malformed('Avasam GetSellerProductList returned malformed optional product fields');
    }
    items.push(raw as unknown as AvasamSellerProduct);
  }
  return { ok: true, data: items };
}

/**
 * Avasam documents two distinct inventory views:
 * - omit Variation + Showchild => single products and variation parents;
 * - set both to "true" => variation child SKUs only.
 *
 * Keep the choice explicit so a caller cannot silently switch catalogue shape.
 */
export function createInventoryFilterRequest(
  page: number,
  limit: number,
  scope: AvasamInventoryScope = 'parents_and_singles',
): AvasamInventoryFilterRequest {
  if (!Number.isInteger(page) || page < 0) throw new Error('Avasam inventory page must be a non-negative integer');
  if (!Number.isInteger(limit) || limit <= 0) throw new Error('Avasam inventory limit must be a positive integer');
  if (scope !== 'parents_and_singles' && scope !== 'variation_children') {
    throw new Error('Unsupported Avasam inventory scope');
  }

  const request: AvasamInventoryFilterRequest = {
    ProductType: [],
    Supplier: '',
    Sortby: 'SKU',
    SortStatus: 'down',
    limit,
    PriceDelimeter: '0',
    PriceValue: 0,
    StockValue: '0',
    Stock: 0,
    Category: '',
    CategoryName: '',
    IsMapped: '',
    PriceMaxValue: 0,
    PriceMaxDelimeter: '0',
    page,
  };

  if (scope === 'variation_children') {
    request.Variation = 'true';
    request.Showchild = 'true';
  }

  return request;
}

export function parseInventoryListResponse(value: unknown): SupplierAdapterResult<AvasamInventoryListResponse> {
  if (!isRecord(value) || !Array.isArray(value.data) || !integerNumber(value.total) || value.total < 0) {
    return malformed('Avasam GetInventoryListWithFilter response has invalid envelope fields');
  }
  const data: AvasamInventoryItem[] = [];
  for (const raw of value.data) {
    if (!isRecord(raw) || !nonEmptyString(raw.SKU) || !finiteNumber(raw.Price) || !integerNumber(raw.Stock)) {
      return malformed('Avasam GetInventoryListWithFilter returned an invalid inventory row');
    }
    if (!optionalString(raw.Number) || !optionalNumber(raw.RetailPrice) || !optionalNumber(raw.PriceIncVat)
      || !optionalNumber(raw.RetailPriceIncVat) || !optionalNumber(raw.VATPercentage) || !optionalString(raw.Title)
      || !optionalString(raw.image) || !optionalBoolean(raw.IsActive) || !optionalString(raw.Category)
      || !optionalString(raw.CategoryId) || !optionalBoolean(raw.HasVariations) || !optionalBoolean(raw.isMapped)) {
      return malformed('Avasam GetInventoryListWithFilter returned malformed optional inventory fields');
    }
    data.push(raw as unknown as AvasamInventoryItem);
  }
  return { ok: true, data: { data, total: value.total } };
}

export function createSellerStockRequest(page: number, limit: number): AvasamSellerStockRequest {
  if (!Number.isInteger(page) || page < 0) throw new Error('Avasam stock page must be a non-negative integer');
  if (!Number.isInteger(limit) || limit <= 0) throw new Error('Avasam stock limit must be a positive integer');
  return { limit, page };
}

export function parseSellerStockResponse(value: unknown): SupplierAdapterResult<AvasamSellerStockItem[]> {
  if (!Array.isArray(value)) return malformed('Avasam SellerStockList response must be an array');
  const rows: AvasamSellerStockItem[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !nonEmptyString(raw.SKU) || !integerNumber(raw.Stock)) {
      return malformed('Avasam SellerStockList returned an invalid stock row');
    }
    rows.push({ SKU: raw.SKU.trim(), Stock: raw.Stock });
  }
  return { ok: true, data: rows };
}

/**
 * Webhook structure documented by Avasam. Signature/JWT verification remains a
 * separate gate and must be implemented before any webhook endpoint is exposed.
 */
export function parseStockWebhookEnvelope(value: unknown): SupplierAdapterResult<AvasamWebhookEnvelope<AvasamStockUpdate>> {
  if (!isRecord(value) || !nonEmptyString(value.requestId) || !dateTimeString(value.on)
    || !nonEmptyString(value.token) || !Array.isArray(value.data)) {
    return malformed('Avasam stock webhook envelope is malformed');
  }
  const data: AvasamStockUpdate[] = [];
  for (const raw of value.data) {
    if (!isRecord(raw) || !nonEmptyString(raw.sku) || !integerNumber(raw.quantity) || !dateTimeString(raw.updatedOn)) {
      return malformed('Avasam stock webhook contains an invalid stock update row');
    }
    data.push({ sku: raw.sku.trim(), quantity: raw.quantity, updatedOn: raw.updatedOn.trim() });
  }
  return {
    ok: true,
    data: {
      requestId: value.requestId.trim(),
      on: value.on.trim(),
      token: value.token.trim(),
      data,
    },
  };
}
