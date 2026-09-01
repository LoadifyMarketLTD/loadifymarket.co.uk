import type { SupplierAdapterResult } from './supplierAdapter';

export const BIGBUY_TRANSACTIONAL_CONTRACT_INTERFACE_VERSION = 1 as const;

export const BIGBUY_TRANSACTIONAL_ENDPOINTS = {
  shippingOptions: '/rest/shipping/orders.json',
  carriers: '/rest/shipping/carriers.json',
  orderCheck: '/rest/order/check/multishipping.json',
  orderCreate: '/rest/order/create/multishipping.json',
} as const;

/**
 * These blockers are intentionally machine-readable. Public provider
 * documentation proves CHECK/CREATE shapes and partial-create risk, but it does
 * not by itself prove Loadify's required idempotency/lost-response recovery or
 * authorise customer PII disclosure.
 */
export const BIGBUY_ORDER_SUBMISSION_BLOCKERS = [
  'bigbuy_orders_permission_not_runtime_verified',
  'bigbuy_pii_permission_not_runtime_verified',
  'bigbuy_idempotency_contract_missing',
  'bigbuy_lost_response_recovery_contract_missing',
  'bigbuy_partial_creation_reconciliation_not_runtime_verified',
] as const;

export interface BigBuyShippingQuoteProductV1 {
  reference: string;
  quantity: number;
}

export interface BigBuyShippingQuoteInputV1 {
  isoCountry: string;
  postcode: string;
  products: BigBuyShippingQuoteProductV1[];
}

export interface BigBuyShippingServiceV1 {
  id: string;
  delay: string;
  name: string;
  transportMethod: string;
  serviceName: string;
}

export interface BigBuyShippingOptionV1 {
  shippingService: BigBuyShippingServiceV1;
  cost: number;
  weight: number;
}

export interface BigBuyProviderOrderErrorV1 {
  status: number;
  code: string;
  message: string;
  productReferences: string[];
  warehouse: number | null;
}

export interface BigBuyOrderCheckWarehouseV1 {
  productReferences: string[];
  totalWithoutTaxesAndWithoutShippingCost: number;
  totalWithoutTaxes: number;
  total: number;
  warehouse: number;
}

export interface BigBuyOrderCheckResultV1 {
  orders: BigBuyOrderCheckWarehouseV1[];
  errors: BigBuyProviderOrderErrorV1[];
  canCreate: boolean;
  providerMutationPerformed: false;
}

export interface BigBuyCreatedOrderV1 {
  productReferences: string[];
  id: string;
  warehouse: number;
  url: string;
}

export type BigBuyCreateOutcome = 'complete' | 'partial' | 'failed';

export interface BigBuyOrderCreateResultV1 {
  orders: BigBuyCreatedOrderV1[];
  errors: BigBuyProviderOrderErrorV1[];
  outcome: BigBuyCreateOutcome;
  partialCreationDetected: boolean;
  requiresReconciliation: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformed<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'MALFORMED_RESPONSE', message };
}

function rejected<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'PERMANENT_REJECTION', message };
}

function requiredText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseProductReferences(value: unknown, field: string): SupplierAdapterResult<string[]> {
  if (!Array.isArray(value)) return malformed(`${field} must be an array`);
  const refs: string[] = [];
  for (const [index, item] of value.entries()) {
    const ref = requiredText(item);
    if (!ref) return malformed(`${field}[${index}] is invalid`);
    refs.push(ref);
  }
  if (refs.length === 0) return malformed(`${field} must not be empty`);
  return { ok: true, data: refs };
}

function parseProviderErrors(value: unknown): SupplierAdapterResult<BigBuyProviderOrderErrorV1[]> {
  if (!Array.isArray(value)) return malformed('BigBuy order errors must be an array');
  const errors: BigBuyProviderOrderErrorV1[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) return malformed(`BigBuy order errors[${index}] must be an object`);
    if (!positiveSafeInteger(item.status)) return malformed(`BigBuy order errors[${index}].status is invalid`);
    const code = requiredText(item.code);
    const message = requiredText(item.message);
    if (!code) return malformed(`BigBuy order errors[${index}].code is invalid`);
    if (!message) return malformed(`BigBuy order errors[${index}].message is invalid`);

    let productReferences: string[] = [];
    if (item.productReferences !== undefined) {
      const refs = parseProductReferences(item.productReferences, `BigBuy order errors[${index}].productReferences`);
      if (!refs.ok) return refs;
      productReferences = refs.data;
    }

    const warehouse = item.warehouse === undefined || item.warehouse === null
      ? null
      : positiveSafeInteger(item.warehouse)
        ? item.warehouse
        : null;
    if (item.warehouse !== undefined && item.warehouse !== null && warehouse === null) {
      return malformed(`BigBuy order errors[${index}].warehouse is invalid`);
    }

    errors.push({ status: item.status, code, message, productReferences, warehouse });
  }

  return { ok: true, data: errors };
}

function validatedQuoteProduct(
  item: BigBuyShippingQuoteProductV1,
  index: number,
): SupplierAdapterResult<BigBuyShippingQuoteProductV1> {
  const reference = requiredText(item.reference);
  if (!reference) return rejected(`BigBuy shipping products[${index}].reference is required`);
  if (!positiveSafeInteger(item.quantity)) return rejected(`BigBuy shipping products[${index}].quantity must be a positive safe integer`);
  return { ok: true, data: { reference, quantity: item.quantity } };
}

/**
 * Builds only the provider's pre-order shipping quote request. No customer name,
 * street address, phone or email is accepted by this function.
 *
 * BigBuy requires both destination country and postcode for an exact quote.
 * SupplierAdapterV1 currently exposes only destinationCountry, so this request
 * is deliberately not wired into the generic adapter yet.
 */
export function buildBigBuyShippingQuoteRequest(
  input: BigBuyShippingQuoteInputV1,
): SupplierAdapterResult<{ order: { delivery: { isoCountry: string; postcode: string }; products: BigBuyShippingQuoteProductV1[] } }> {
  const country = requiredText(input.isoCountry)?.toUpperCase() ?? '';
  const postcode = requiredText(input.postcode) ?? '';
  if (!/^[A-Z]{2}$/.test(country)) return rejected('BigBuy shipping isoCountry must be a 2-letter country code');
  if (!postcode || postcode.length > 32) return rejected('BigBuy shipping postcode is required and must be at most 32 characters');
  if (!Array.isArray(input.products) || input.products.length === 0) return rejected('BigBuy shipping products must not be empty');

  const products: BigBuyShippingQuoteProductV1[] = [];
  const seen = new Set<string>();
  for (const [index, item] of input.products.entries()) {
    const validated = validatedQuoteProduct(item, index);
    if (!validated.ok) return validated;
    if (seen.has(validated.data.reference)) return rejected('BigBuy shipping product references must be unique');
    seen.add(validated.data.reference);
    products.push(validated.data);
  }

  return {
    ok: true,
    data: {
      order: {
        delivery: { isoCountry: country, postcode },
        products,
      },
    },
  };
}

export function parseBigBuyShippingOptionsResponse(
  value: unknown,
): SupplierAdapterResult<BigBuyShippingOptionV1[]> {
  if (!isRecord(value) || !Array.isArray(value.shippingOptions)) {
    return malformed('BigBuy shipping options response is invalid');
  }

  const options: BigBuyShippingOptionV1[] = [];
  for (const [index, item] of value.shippingOptions.entries()) {
    if (!isRecord(item) || !isRecord(item.shippingService)) {
      return malformed(`BigBuy shippingOptions[${index}] is invalid`);
    }
    const id = requiredText(item.shippingService.id);
    const delay = requiredText(item.shippingService.delay);
    const name = requiredText(item.shippingService.name);
    const transportMethod = requiredText(item.shippingService.transportMethod);
    const serviceName = requiredText(item.shippingService.serviceName);
    if (!id || !delay || !name || !transportMethod || !serviceName) {
      return malformed(`BigBuy shippingOptions[${index}].shippingService is incomplete`);
    }
    if (!nonNegativeFinite(item.cost)) return malformed(`BigBuy shippingOptions[${index}].cost is invalid`);
    if (!nonNegativeFinite(item.weight)) return malformed(`BigBuy shippingOptions[${index}].weight is invalid`);

    options.push({
      shippingService: { id, delay, name, transportMethod, serviceName },
      cost: item.cost,
      weight: item.weight,
    });
  }

  return { ok: true, data: options };
}

/**
 * CHECK is explicitly pre-mutation in the BigBuy contract. A positive CHECK is
 * necessary before CREATE but does not constitute order acknowledgement.
 */
export function parseBigBuyOrderCheckResponse(
  value: unknown,
): SupplierAdapterResult<BigBuyOrderCheckResultV1> {
  if (!isRecord(value) || !Array.isArray(value.orders)) return malformed('BigBuy order check response is invalid');
  const errors = parseProviderErrors(value.errors);
  if (!errors.ok) return errors;

  const orders: BigBuyOrderCheckWarehouseV1[] = [];
  for (const [index, item] of value.orders.entries()) {
    if (!isRecord(item)) return malformed(`BigBuy check orders[${index}] must be an object`);
    const refs = parseProductReferences(item.productReferences, `BigBuy check orders[${index}].productReferences`);
    if (!refs.ok) return refs;
    if (!nonNegativeFinite(item.totalWithoutTaxesAndWithoutShippingCost)) return malformed(`BigBuy check orders[${index}].totalWithoutTaxesAndWithoutShippingCost is invalid`);
    if (!nonNegativeFinite(item.totalWithoutTaxes)) return malformed(`BigBuy check orders[${index}].totalWithoutTaxes is invalid`);
    if (!nonNegativeFinite(item.total)) return malformed(`BigBuy check orders[${index}].total is invalid`);
    if (!positiveSafeInteger(item.warehouse)) return malformed(`BigBuy check orders[${index}].warehouse is invalid`);
    orders.push({
      productReferences: refs.data,
      totalWithoutTaxesAndWithoutShippingCost: item.totalWithoutTaxesAndWithoutShippingCost,
      totalWithoutTaxes: item.totalWithoutTaxes,
      total: item.total,
      warehouse: item.warehouse,
    });
  }

  return {
    ok: true,
    data: {
      orders,
      errors: errors.data,
      canCreate: orders.length > 0 && errors.data.length === 0,
      providerMutationPerformed: false,
    },
  };
}

/**
 * CREATE can legally return both created orders and errors when multiple BigBuy
 * warehouses are involved. That state is classified as partial and must never
 * be collapsed into generic success.
 */
export function parseBigBuyOrderCreateResponse(
  value: unknown,
): SupplierAdapterResult<BigBuyOrderCreateResultV1> {
  if (!isRecord(value) || !Array.isArray(value.orders)) return malformed('BigBuy order create response is invalid');
  const errors = parseProviderErrors(value.errors);
  if (!errors.ok) return errors;

  const orders: BigBuyCreatedOrderV1[] = [];
  for (const [index, item] of value.orders.entries()) {
    if (!isRecord(item)) return malformed(`BigBuy create orders[${index}] must be an object`);
    const refs = parseProductReferences(item.productReferences, `BigBuy create orders[${index}].productReferences`);
    if (!refs.ok) return refs;
    const id = requiredText(item.id);
    const url = requiredText(item.url);
    if (!id) return malformed(`BigBuy create orders[${index}].id is invalid`);
    if (!positiveSafeInteger(item.warehouse)) return malformed(`BigBuy create orders[${index}].warehouse is invalid`);
    if (!url || !/^\/rest\/order\/[A-Za-z0-9._-]+$/.test(url)) {
      return malformed(`BigBuy create orders[${index}].url is invalid`);
    }
    orders.push({ productReferences: refs.data, id, warehouse: item.warehouse, url });
  }

  if (orders.length === 0 && errors.data.length === 0) {
    return malformed('BigBuy order create response contains neither created orders nor errors');
  }

  const outcome: BigBuyCreateOutcome = orders.length > 0
    ? errors.data.length > 0 ? 'partial' : 'complete'
    : 'failed';
  const partialCreationDetected = outcome === 'partial';

  return {
    ok: true,
    data: {
      orders,
      errors: errors.data,
      outcome,
      partialCreationDetected,
      requiresReconciliation: partialCreationDetected,
    },
  };
}
