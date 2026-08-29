const REQUIRED_ENV = ['AVASAM_CONSUMER_KEY', 'AVASAM_SECRET_KEY'];
const DEFAULT_BASE_URL = 'https://app.avasam.com';
const TOKEN_PATH = '/api/auth/request-token';
const INVENTORY_PATH = '/apiseeker/ProductModule/GetInventoryListWithFilter';
const STOCK_PATH = '/apiseeker/Products/SellerStockList';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function safeBaseUrl() {
  const value = (process.env.AVASAM_API_BASE_URL || DEFAULT_BASE_URL).trim();
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('AVASAM_API_BASE_URL must be an HTTPS origin without embedded credentials');
  }
  return url.origin;
}

function readOnlyInventoryBody(sku) {
  return {
    ProductType: [], Supplier: sku, Sortby: 'SKU', SortStatus: 'down', limit: 1,
    PriceDelimeter: '0', PriceValue: 0, StockValue: '0', Stock: 0,
    Category: '', CategoryName: '', IsMapped: '', PriceMaxValue: 0,
    PriceMaxDelimeter: '0', page: 0,
  };
}

async function jsonOrNull(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function validTokenPayload(value) {
  return Boolean(value && typeof value === 'object'
    && typeof value.access_token === 'string' && value.access_token.trim()
    && typeof value.expires_at === 'string' && Number.isFinite(Date.parse(value.expires_at)));
}

function inventoryShapeFacts(value) {
  const record = Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const dataArray = record && Array.isArray(value.data);
  const dataUpperArray = record && Array.isArray(value.Data);
  const itemsArray = record && Array.isArray(value.items);
  const itemsUpperArray = record && Array.isArray(value.Items);
  const resultArray = record && Array.isArray(value.result);
  const resultUpperArray = record && Array.isArray(value.Result);
  const productsArray = record && Array.isArray(value.products);
  const productsUpperArray = record && Array.isArray(value.Products);
  const totalNumber = record && typeof value.total === 'number' && Number.isFinite(value.total) && value.total >= 0;
  const totalUpperNumber = record && typeof value.Total === 'number' && Number.isFinite(value.Total) && value.Total >= 0;
  const totalNumericString = record && typeof value.total === 'string' && value.total.trim() !== '' && Number.isFinite(Number(value.total));
  return {
    record, dataArray, dataUpperArray, itemsArray, itemsUpperArray, resultArray,
    resultUpperArray, productsArray, productsUpperArray, totalNumber,
    totalUpperNumber, totalNumericString, topLevelArray: Array.isArray(value),
  };
}

function validInventoryEnvelope(value) {
  const facts = inventoryShapeFacts(value);
  return facts.dataArray && facts.totalNumber;
}

function validStockResponse(value) {
  return Array.isArray(value) && value.every(item => (
    item && typeof item === 'object'
    && typeof item.SKU === 'string' && item.SKU.trim().length > 0
    && Number.isInteger(item.Stock)
  ));
}

function diagnosticTransportHeaders(token) {
  const mode = (process.env.AVASAM_PROBE_TRANSPORT || 'bearer').trim().toLowerCase();
  if (mode === 'bearer') return { mode, headers: { Authorization: `Bearer ${token}` } };
  if (mode === 'token') return { mode, headers: { Token: token } };
  if (mode === 'authorization-raw') return { mode, headers: { Authorization: token } };
  if (mode === 'access-token') return { mode, headers: { 'Access-Token': token } };
  if (mode === 'access_token') return { mode, headers: { access_token: token } };
  throw new Error('Unsupported AVASAM_PROBE_TRANSPORT');
}

async function postJson(baseUrl, path, body, providerHeaders = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...providerHeaders },
    body: JSON.stringify(body),
    redirect: 'error',
  });
  return { response, payload: await jsonOrNull(response) };
}

async function postInventory(baseUrl, body, providerHeaders) {
  const { response, payload } = await postJson(baseUrl, INVENTORY_PATH, body, providerHeaders);
  const facts = inventoryShapeFacts(payload);
  const shapeOk = validInventoryEnvelope(payload);
  return { status: response.status, ok: response.ok, shapeOk, payload, ...facts };
}

async function postStock(baseUrl, providerHeaders) {
  const { response, payload } = await postJson(baseUrl, STOCK_PATH, { limit: 1, page: 0 }, providerHeaders);
  const shapeOk = validStockResponse(payload);
  return { status: response.status, ok: response.ok, shapeOk, count: shapeOk ? payload.length : null };
}

function assertTransportProved(unauthenticated, authenticated, label) {
  const negativeControlRejected = !unauthenticated.ok && !unauthenticated.shapeOk;
  const authenticatedProved = authenticated.ok && authenticated.shapeOk;
  if (!negativeControlRejected || !authenticatedProved) {
    throw new Error(`Avasam ${label} transport was not proven by the controlled read-only probe`);
  }
}

export async function runAvasamBearerReadOnlyProbe() {
  for (const name of REQUIRED_ENV) requiredEnv(name);
  const consumerKey = requiredEnv('AVASAM_CONSUMER_KEY');
  const secretKey = requiredEnv('AVASAM_SECRET_KEY');
  const baseUrl = safeBaseUrl();

  const tokenResponse = await fetch(`${baseUrl}${TOKEN_PATH}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ consumer_key: consumerKey, secret_key: secretKey }),
    redirect: 'error',
  });
  const tokenPayload = await jsonOrNull(tokenResponse);
  if (!tokenResponse.ok || !validTokenPayload(tokenPayload)) throw new Error('Avasam request-token probe did not return a valid token contract');
  if (process.env.AVASAM_PROBE_TOKEN_ONLY === '1') return { stage: 'request-token', status: tokenResponse.status };

  const transport = diagnosticTransportHeaders(tokenPayload.access_token.trim());
  if (process.env.AVASAM_PROBE_TARGET === 'stock') {
    const unauthenticated = await postStock(baseUrl, {});
    const authenticated = await postStock(baseUrl, transport.headers);
    assertTransportProved(unauthenticated, authenticated, transport.mode);
    return { endpoint: STOCK_PATH, transport: transport.mode };
  }

  const sku = requiredEnv('AVASAM_PROBE_SKU');
  const body = readOnlyInventoryBody(sku);
  const unauthenticated = await postInventory(baseUrl, body, {});
  const authenticated = await postInventory(baseUrl, body, transport.headers);
  const gate = process.env.AVASAM_PROBE_GATE;
  if (gate === 'http-only') {
    if (unauthenticated.ok || !authenticated.ok) throw new Error('Avasam authenticated Inventory HTTP gate did not pass');
    return { endpoint: INVENTORY_PATH, transport: transport.mode };
  }

  const gateFacts = {
    record: authenticated.record,
    'data-array': authenticated.dataArray,
    'Data-array': authenticated.dataUpperArray,
    'items-array': authenticated.itemsArray,
    'Items-array': authenticated.itemsUpperArray,
    'result-array': authenticated.resultArray,
    'Result-array': authenticated.resultUpperArray,
    'products-array': authenticated.productsArray,
    'Products-array': authenticated.productsUpperArray,
    'total-number': authenticated.totalNumber,
    'Total-number': authenticated.totalUpperNumber,
    'total-numeric-string': authenticated.totalNumericString,
    'top-level-array': authenticated.topLevelArray,
  };
  if (gate && Object.prototype.hasOwnProperty.call(gateFacts, gate)) {
    if (!authenticated.ok || !gateFacts[gate]) throw new Error(`Avasam Inventory ${gate} gate did not pass`);
    return { endpoint: INVENTORY_PATH, transport: transport.mode, gate };
  }

  assertTransportProved(unauthenticated, authenticated, transport.mode);
  return { endpoint: INVENTORY_PATH, transport: transport.mode };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAvasamBearerReadOnlyProbe().catch(error => {
    console.error(error instanceof Error ? error.message : 'Avasam read-only transport probe failed');
    process.exitCode = 1;
  });
}
