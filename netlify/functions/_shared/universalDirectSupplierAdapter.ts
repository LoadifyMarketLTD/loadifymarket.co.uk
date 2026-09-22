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
  SupplierShippingQuoteRequest,
  SupplierStockSnapshot,
  SupplierTrackingEvent,
} from './supplierAdapter';
import { SUPPLIER_ADAPTER_INTERFACE_VERSION } from './supplierAdapter';
import type { SupplierIntegrationBinding, SupplierIntegrationRuntime } from './supplierIntegrationRuntime';
import { resolveSupplierRuntimeConfig } from './supplierRuntimeConfig';
import { executeSupplierRuntimeHttp } from './supplierRuntimeHttp';
import { resolveSupplierWebhookConfig } from './supplierWebhookRuntime';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getPath(value: unknown, path: string): unknown {
  if (!path.trim()) return value;
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, value);
}

function setPath(target: JsonRecord, path: string, value: unknown) {
  const parts = path.split('.').map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) return;
  let cursor = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value;
      return;
    }
    if (!isRecord(cursor[part])) cursor[part] = {};
    cursor = cursor[part] as JsonRecord;
  });
}

function canonicalValue(source: JsonRecord, canonicalPath: string): unknown {
  return getPath(source, canonicalPath);
}

function mapRequest(source: JsonRecord, mapping: JsonRecord): JsonRecord {
  const requestMap = isRecord(mapping.request) ? mapping.request : {};
  const output: JsonRecord = {};
  for (const [canonicalPath, remotePathValue] of Object.entries(requestMap)) {
    if (typeof remotePathValue !== 'string' || !remotePathValue.trim()) continue;
    const value = canonicalValue(source, canonicalPath);
    if (value !== undefined) setPath(output, remotePathValue.trim(), value);
  }
  return output;
}

const FORBIDDEN_DYNAMIC_HEADERS = new Set([
  'authorization','cookie','host','content-length','connection','proxy-authorization',
  'te','trailer','transfer-encoding','upgrade',
]);

function mapDynamicHeaders(source: JsonRecord, mapping: JsonRecord): SupplierAdapterResult<Record<string, string>> {
  const headerMap = isRecord(mapping.headers) ? mapping.headers : {};
  const output: Record<string, string> = {};
  for (const [canonicalPath, remoteNameValue] of Object.entries(headerMap)) {
    if (typeof remoteNameValue !== 'string') continue;
    const name = remoteNameValue.trim().toLowerCase();
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]{1,64}$/.test(name) || FORBIDDEN_DYNAMIC_HEADERS.has(name)) {
      return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Supplier runtime dynamic header mapping is invalid' };
    }
    const value = canonicalValue(source, canonicalPath);
    if (value === undefined || value === null) continue;
    const rendered = String(value);
    if (rendered.length > 4096 || /[\r\n]/.test(rendered)) {
      return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Supplier runtime dynamic header value is invalid' };
    }
    output[name] = rendered;
  }
  return { ok: true, data: output };
}

function mappingHasCanonicalPath(mapping: JsonRecord, canonicalPath: string): boolean {
  const requestMap = isRecord(mapping.request) ? mapping.request : {};
  const headerMap = isRecord(mapping.headers) ? mapping.headers : {};
  return (
    typeof requestMap[canonicalPath] === 'string'
    || typeof headerMap[canonicalPath] === 'string'
  );
}

function orderSubmissionMappingReady(mapping: JsonRecord): boolean {
  const required = [
    'context.idempotencyKey',
    'input.externalOfferRef',
    'input.quantity',
    'input.recipient.name',
    'input.recipient.line1',
    'input.recipient.city',
    'input.recipient.postcode',
    'input.recipient.country',
  ];
  return required.every((path) => mappingHasCanonicalPath(mapping, path));
}

function mappedString(payload: unknown, mapping: JsonRecord, key: string): string {
  const responseMap = isRecord(mapping.response) ? mapping.response : {};
  const path = typeof responseMap[key] === 'string' ? String(responseMap[key]) : '';
  const value = path ? getPath(payload, path) : undefined;
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function mappedNumber(payload: unknown, mapping: JsonRecord, key: string): number | undefined {
  const raw = mappedString(payload, mapping, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function rowsFromPayload(payload: unknown, mapping: JsonRecord): unknown[] {
  const listPath = typeof mapping.listPath === 'string' ? String(mapping.listPath) : '';
  const value = listPath ? getPath(payload, listPath) : payload;
  return Array.isArray(value) ? value : [value];
}

function normalizeAckState(value: string, mapping: JsonRecord): SupplierOrderAcknowledgement['state'] {
  const stateMap = isRecord(mapping.stateMap) ? mapping.stateMap : {};
  const mapped = typeof stateMap[value] === 'string' ? String(stateMap[value]) : value;
  const normalized = mapped.trim().toLowerCase();
  if (['accepted','pending','rejected','unknown'].includes(normalized)) {
    return normalized as SupplierOrderAcknowledgement['state'];
  }
  return 'unknown';
}

function normalizeError(status: number): SupplierAdapterResult<never> {
  if (status === 401 || status === 403) {
    return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Supplier runtime authentication was rejected' };
  }
  if (status === 429) {
    return { ok: false, errorClass: 'RATE_LIMITED', message: 'Supplier runtime rate limit reached' };
  }
  if (status >= 400 && status < 500) {
    return { ok: false, errorClass: 'PERMANENT_REJECTION', message: 'Supplier runtime rejected the request' };
  }
  return { ok: false, errorClass: 'RETRYABLE_FAILURE', message: 'Supplier runtime request failed' };
}

async function executeBinding(
  runtime: SupplierIntegrationRuntime,
  binding: SupplierIntegrationBinding,
  canonicalInput: JsonRecord,
): Promise<SupplierAdapterResult<unknown>> {
  if (binding.executionMode === 'manual_only') {
    return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Supplier capability is verified as manual-only' };
  }
  if (binding.transport !== 'http_rest' && binding.transport !== 'graphql') {
    return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Supplier transport is event-driven or not executable by the HTTP/GraphQL runtime' };
  }
  if (!binding.configRef) {
    return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Supplier runtime config reference is missing' };
  }

  const resolved = resolveSupplierRuntimeConfig(binding.configRef, {
    supplierKey: runtime.supplierKey,
    capability: binding.capability,
    transport: binding.transport,
  });
  if (!resolved.ok) {
    return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: resolved.error };
  }

  const config = resolved.config;
  if (binding.capability === 'order_submission' && !orderSubmissionMappingReady(binding.mapping)) {
    return {
      ok: false,
      errorClass: 'AUTH_CONFIGURATION_FAILURE',
      message: 'Supplier order runtime mapping must include idempotency, offer, quantity and minimum fulfilment recipient fields',
    };
  }
  const requestPayload = mapRequest(canonicalInput, binding.mapping);
  if (binding.executionMode === 'automated_write' && Object.keys(requestPayload).length === 0) {
    return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Supplier write runtime mapping is empty' };
  }
  const dynamicHeaders = mapDynamicHeaders(canonicalInput, binding.mapping);
  if (!dynamicHeaders.ok) return dynamicHeaders;
  const url = new URL(config.url);
  let body: string | undefined;
  const headers: Record<string, string> = { ...(config.headers ?? {}), ...dynamicHeaders.data };

  if (config.kind === 'graphql') {
    headers['content-type'] = 'application/json';
    body = JSON.stringify({
      query: config.graphqlDocument,
      ...(config.graphqlOperationName ? { operationName: config.graphqlOperationName } : {}),
      variables: requestPayload,
    });
  } else if (config.method !== 'GET' && config.method !== 'DELETE') {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(requestPayload);
  } else {
    const queryMap = isRecord(binding.mapping.query) ? binding.mapping.query : {};
    for (const [canonicalPath, remoteNameValue] of Object.entries(queryMap)) {
      if (typeof remoteNameValue !== 'string' || !remoteNameValue.trim()) continue;
      const value = canonicalValue(canonicalInput, canonicalPath);
      if (value !== undefined && value !== null) url.searchParams.set(remoteNameValue.trim(), String(value));
    }
  }

  const response = await executeSupplierRuntimeHttp({
    url: url.toString(),
    method: config.method ?? (config.kind === 'graphql' ? 'POST' : 'GET'),
    headers,
    body,
    timeoutMs: config.timeoutMs ?? 10000,
    maxBytes: config.maxBytes ?? 2 * 1024 * 1024,
  });
  if (!response.ok) return response;

  let payload: unknown;
  try { payload = response.body ? JSON.parse(response.body) : {}; }
  catch { return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier runtime response is not valid JSON' }; }

  if (config.kind === 'graphql') {
    if (!isRecord(payload) || (Array.isArray(payload.errors) && payload.errors.length > 0)) {
      return { ok: false, errorClass: 'PERMANENT_REJECTION', message: 'Supplier GraphQL operation returned errors' };
    }
    const rootPath = typeof binding.mapping.graphqlDataPath === 'string' ? String(binding.mapping.graphqlDataPath) : 'data';
    payload = getPath(payload, rootPath);
  }
  return { ok: true, data: payload };
}

export class UniversalDirectSupplierAdapterV1 implements SupplierAdapterV1 {
  readonly interfaceVersion = SUPPLIER_ADAPTER_INTERFACE_VERSION;
  readonly providerKey = 'direct_supplier';
  readonly adapterVersion = '1.0.0';

  readonly capabilities: readonly SupplierAdapterCapability[];

  constructor(private readonly runtime: SupplierIntegrationRuntime) {
    const implemented = new Set<SupplierAdapterCapability>([
      'supplier_identity','catalog','stock','price','shipping',
      'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement',
    ]);
    this.capabilities = [...runtime.bindings.values()]
      .filter(binding => binding.status === 'verified' && binding.executionMode !== 'manual_only')
      .filter(binding => {
        if (!implemented.has(binding.capability) || !binding.configRef) return false;
        if (binding.transport === 'http_rest' || binding.transport === 'graphql') {
          const resolved = resolveSupplierRuntimeConfig(binding.configRef, {
            supplierKey: runtime.supplierKey,
            capability: binding.capability,
            transport: binding.transport,
          });
          if (!resolved.ok) return false;
          return binding.capability !== 'order_submission' || orderSubmissionMappingReady(binding.mapping);
        }
        if (binding.capability === 'acknowledgement' && binding.transport === 'webhook') {
          return resolveSupplierWebhookConfig(binding.configRef, runtime.supplierKey).ok;
        }
        return false;
      })
      .map(binding => binding.capability);
  }

  private binding(capability: SupplierAdapterCapability): SupplierIntegrationBinding | null {
    const binding = this.runtime.bindings.get(capability);
    return binding && binding.status === 'verified' ? binding : null;
  }

  async getSupplierIdentity(context: SupplierAdapterContext): Promise<SupplierAdapterResult<Record<string, unknown>>> {
    const binding = this.binding('supplier_identity');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Supplier identity binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context });
    if (!executed.ok) return executed;
    if (!isRecord(executed.data)) {
      return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier identity response is not an object' };
    }
    return { ok: true, data: executed.data };
  }

  async listCatalog(context: SupplierAdapterContext): Promise<SupplierAdapterResult<SupplierCatalogItemRef[]>> {
    const binding = this.binding('catalog');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Catalog binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context });
    if (!executed.ok) return executed;
    const items: SupplierCatalogItemRef[] = [];
    for (const row of rowsFromPayload(executed.data, binding.mapping)) {
      const externalProductRef = mappedString(row, binding.mapping, 'externalProductRef');
      if (!externalProductRef) continue;
      const variantPath = isRecord(binding.mapping.response) && typeof binding.mapping.response.externalVariantRefs === 'string'
        ? String(binding.mapping.response.externalVariantRefs)
        : '';
      const rawVariants = variantPath ? getPath(row, variantPath) : undefined;
      const externalVariantRefs = Array.isArray(rawVariants)
        ? rawVariants.map(value => String(value).trim()).filter(Boolean)
        : undefined;
      items.push({ externalProductRef, externalVariantRefs });
    }
    return { ok: true, data: items };
  }

  async getStock(context: SupplierAdapterContext, externalVariantRefs: string[]): Promise<SupplierAdapterResult<SupplierStockSnapshot[]>> {
    const binding = this.binding('stock');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Stock binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, externalVariantRefs });
    if (!executed.ok) return executed;
    const snapshots: SupplierStockSnapshot[] = [];
    const availabilityMap = isRecord(binding.mapping.availabilityMap) ? binding.mapping.availabilityMap : {};
    for (const row of rowsFromPayload(executed.data, binding.mapping)) {
      const externalVariantRef = mappedString(row, binding.mapping, 'externalVariantRef');
      if (!externalVariantRef) continue;
      const quantity = mappedNumber(row, binding.mapping, 'quantity');
      const rawAvailability = mappedString(row, binding.mapping, 'availability');
      const mappedAvailability = typeof availabilityMap[rawAvailability] === 'string'
        ? String(availabilityMap[rawAvailability]).toLowerCase()
        : rawAvailability.toLowerCase();
      const availability = ['in_stock','out_of_stock','limited','unknown'].includes(mappedAvailability)
        ? mappedAvailability as SupplierStockSnapshot['availability']
        : quantity !== undefined
          ? quantity > 0 ? 'in_stock' : 'out_of_stock'
          : 'unknown';
      const observedAt = mappedString(row, binding.mapping, 'observedAt') || new Date().toISOString();
      snapshots.push({ externalVariantRef, quantity, availability, observedAt });
    }
    return { ok: true, data: snapshots };
  }

  async getPrices(context: SupplierAdapterContext, externalVariantRefs: string[]): Promise<SupplierAdapterResult<SupplierPriceSnapshot[]>> {
    const binding = this.binding('price');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Price binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, externalVariantRefs });
    if (!executed.ok) return executed;
    const snapshots: SupplierPriceSnapshot[] = [];
    for (const row of rowsFromPayload(executed.data, binding.mapping)) {
      const externalVariantRef = mappedString(row, binding.mapping, 'externalVariantRef');
      const amountMinor = mappedNumber(row, binding.mapping, 'amountMinor');
      const currency = mappedString(row, binding.mapping, 'currency').toUpperCase();
      const observedAt = mappedString(row, binding.mapping, 'observedAt') || new Date().toISOString();
      if (!externalVariantRef || !Number.isSafeInteger(amountMinor) || amountMinor === undefined || amountMinor < 0 || !/^[A-Z]{3}$/.test(currency)) continue;
      snapshots.push({ externalVariantRef, amountMinor, currency, observedAt });
    }
    return { ok: true, data: snapshots };
  }

  async quoteShipping(context: SupplierAdapterContext, input: SupplierShippingQuoteRequest): Promise<SupplierAdapterResult<SupplierShippingQuote[]>> {
    const binding = this.binding('shipping');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Shipping binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, input });
    if (!executed.ok) return executed;
    const quotes: SupplierShippingQuote[] = [];
    for (const row of rowsFromPayload(executed.data, binding.mapping)) {
      const serviceRef = mappedString(row, binding.mapping, 'serviceRef');
      const amountMinor = mappedNumber(row, binding.mapping, 'amountMinor');
      const currency = mappedString(row, binding.mapping, 'currency').toUpperCase();
      if (!serviceRef || amountMinor === undefined || !Number.isSafeInteger(amountMinor) || amountMinor < 0 || !/^[A-Z]{3}$/.test(currency)) continue;
      quotes.push({
        serviceRef,
        amountMinor,
        currency,
        estimatedDispatchAt: mappedString(row, binding.mapping, 'estimatedDispatchAt') || undefined,
        estimatedDeliveryFrom: mappedString(row, binding.mapping, 'estimatedDeliveryFrom') || undefined,
        estimatedDeliveryTo: mappedString(row, binding.mapping, 'estimatedDeliveryTo') || undefined,
      });
    }
    return { ok: true, data: quotes };
  }

  async submitOrder(context: SupplierAdapterContext, input: SupplierOrderRequest): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>> {
    const binding = this.binding('order_submission');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Order submission binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, input });
    if (!executed.ok) return executed;
    const supplierOrderRef = mappedString(executed.data, binding.mapping, 'supplierOrderRef');
    if (!supplierOrderRef) return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier order reference is missing' };
    const rawState = mappedString(executed.data, binding.mapping, 'state');
    const acknowledgedAt = mappedString(executed.data, binding.mapping, 'acknowledgedAt') || new Date().toISOString();
    return {
      ok: true,
      data: { supplierOrderRef, state: normalizeAckState(rawState, binding.mapping), acknowledgedAt },
      externalRef: supplierOrderRef,
      acknowledged: true,
    };
  }

  async getOrderAcknowledgement(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>> {
    const binding = this.binding('acknowledgement');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Acknowledgement binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, supplierOrderRef });
    if (!executed.ok) return executed;
    const ref = mappedString(executed.data, binding.mapping, 'supplierOrderRef') || supplierOrderRef;
    const rawState = mappedString(executed.data, binding.mapping, 'state');
    const acknowledgedAt = mappedString(executed.data, binding.mapping, 'acknowledgedAt') || new Date().toISOString();
    return { ok: true, data: { supplierOrderRef: ref, state: normalizeAckState(rawState, binding.mapping), acknowledgedAt }, externalRef: ref };
  }

  async getTracking(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<SupplierTrackingEvent[]>> {
    const binding = this.binding('tracking');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Tracking binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, supplierOrderRef });
    if (!executed.ok) return executed;
    const listPath = typeof binding.mapping.listPath === 'string' ? String(binding.mapping.listPath) : '';
    const rawList = listPath ? getPath(executed.data, listPath) : executed.data;
    const rows = Array.isArray(rawList) ? rawList : [rawList];
    const events: SupplierTrackingEvent[] = [];
    for (const row of rows) {
      const supplierRef = mappedString(row, binding.mapping, 'supplierOrderRef') || supplierOrderRef;
      const status = mappedString(row, binding.mapping, 'status');
      const occurredAt = mappedString(row, binding.mapping, 'occurredAt');
      if (!status || !occurredAt || Number.isNaN(Date.parse(occurredAt))) continue;
      events.push({
        supplierOrderRef: supplierRef,
        status,
        occurredAt,
        carrierRef: mappedString(row, binding.mapping, 'carrierRef') || undefined,
        trackingRef: mappedString(row, binding.mapping, 'trackingRef') || undefined,
      });
    }
    return { ok: true, data: events };
  }

  async cancelOrder(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<{ cancelled: boolean }>> {
    const binding = this.binding('cancellation');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Cancellation binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, supplierOrderRef });
    if (!executed.ok) return executed;
    const value = mappedString(executed.data, binding.mapping, 'cancelled').toLowerCase();
    return { ok: true, data: { cancelled: ['true','1','yes','cancelled','canceled'].includes(value) } };
  }

  async requestReturn(context: SupplierAdapterContext, supplierOrderRef: string, reasonCode: string): Promise<SupplierAdapterResult<{ returnRef: string }>> {
    const binding = this.binding('returns');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Return binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, supplierOrderRef, reasonCode });
    if (!executed.ok) return executed;
    const returnRef = mappedString(executed.data, binding.mapping, 'returnRef');
    if (!returnRef) return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier return reference is missing' };
    return { ok: true, data: { returnRef }, externalRef: returnRef };
  }

  async getReimbursement(context: SupplierAdapterContext, supplierOrderRef: string): Promise<SupplierAdapterResult<{ amountMinor?: number; currency?: string; state: string }>> {
    const binding = this.binding('reimbursement');
    if (!binding) return { ok: false, errorClass: 'CAPABILITY_UNAVAILABLE', message: 'Reimbursement binding is unavailable' };
    const executed = await executeBinding(this.runtime, binding, { context, supplierOrderRef });
    if (!executed.ok) return executed;
    const state = mappedString(executed.data, binding.mapping, 'state');
    if (!state) return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier reimbursement state is missing' };
    const amountText = mappedString(executed.data, binding.mapping, 'amountMinor');
    const amountMinor = amountText && Number.isSafeInteger(Number(amountText)) ? Number(amountText) : undefined;
    const currency = mappedString(executed.data, binding.mapping, 'currency') || undefined;
    return { ok: true, data: { state, amountMinor, currency } };
  }
}
