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

function validInventoryEnvelope(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.data)
    && typeof value.total === 'number' && Number.isFinite(value.total) && value.total >= 0);
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
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...providerHeaders,
    },
    body: JSON.stringify(body),
    redirect: 'error',
  });
  return { response, payload: await jsonOrNull(response) };
}

async function postInventory(baseUrl, body, providerHeaders) {
  const { response, payload } = await postJson(baseUrl, INVENTORY_PATH, body, providerHeaders);
  return {
    status: response.status, ok: response.ok, shapeOk: validInventoryEnvelope(payload),
    count: validInventoryEnvelope(payload) ? payload.data.length : null,
    total: validInventoryEnvelope(payload) ? payload.total : null,
    skuMatched: validInventoryEnvelope(payload)
      ? payload.data.some(item => item && typeof item === 'object' && item.SKU === body.Supplier)
      : false,
  };
}

async function postStock(baseUrl, providerHeaders) {
  const { response, payload } = await postJson(baseUrl, STOCK_PATH, { limit: 1, page: 0 }, providerHeaders);
  return {
    status: response.status, ok: response.ok, shapeOk: validStockResponse(payload),
    count: validStockResponse(payload) ? payload.length : null,
  };
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

  if (!tokenResponse.ok || !validTokenPayload(tokenPayload)) {
    console.log(JSON.stringify({ gate: 'avasam-readonly-token-transport', stage: 'request-token', status: tokenResponse.status, tokenShapeOk: validTokenPayload(tokenPayload) }));
    throw new Error('Avasam request-token probe did not return a valid token contract');
  }

  if (process.env.AVASAM_PROBE_TOKEN_ONLY === '1') {
    const evidence = { gate: 'avasam-readonly-token-transport', stage: 'request-token', status: tokenResponse.status, tokenShapeOk: true };
    console.log(JSON.stringify(evidence));
    return evidence;
  }

  const transport = diagnosticTransportHeaders(tokenPayload.access_token.trim());

  if (process.env.AVASAM_PROBE_TARGET === 'stock') {
    const unauthenticated = await postStock(baseUrl, {});
    const authenticated = await postStock(baseUrl, transport.headers);
    const evidence = {
      gate: 'avasam-readonly-token-transport', endpoint: STOCK_PATH, transport: transport.mode,
      unauthenticated: { status: unauthenticated.status, shapeOk: unauthenticated.shapeOk },
      authenticated: { status: authenticated.status, shapeOk: authenticated.shapeOk, count: authenticated.count },
    };
    console.log(JSON.stringify(evidence));
    assertTransportProved(unauthenticated, authenticated, transport.mode);
    return evidence;
  }

  const sku = requiredEnv('AVASAM_PROBE_SKU');
  const body = readOnlyInventoryBody(sku);
  const unauthenticated = await postInventory(baseUrl, body, {});
  const authenticated = await postInventory(baseUrl, body, transport.headers);
  const evidence = {
    gate: 'avasam-readonly-token-transport', endpoint: INVENTORY_PATH, transport: transport.mode, sku,
    unauthenticated: { status: unauthenticated.status, shapeOk: unauthenticated.shapeOk },
    authenticated: { status: authenticated.status, shapeOk: authenticated.shapeOk, count: authenticated.count, total: authenticated.total, skuMatched: authenticated.skuMatched },
  };
  console.log(JSON.stringify(evidence));
  assertTransportProved(unauthenticated, authenticated, transport.mode);
  return evidence;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAvasamBearerReadOnlyProbe().catch(error => {
    console.error(error instanceof Error ? error.message : 'Avasam read-only transport probe failed');
    process.exitCode = 1;
  });
}
