const REQUIRED_ENV = ['AVASAM_CONSUMER_KEY', 'AVASAM_SECRET_KEY'];
const DEFAULT_BASE_URL = 'https://app.avasam.com';
const TOKEN_PATH = '/api/auth/request-token';
const INVENTORY_PATH = '/apiseeker/ProductModule/GetInventoryListWithFilter';

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
    ProductType: [],
    Supplier: sku,
    Sortby: 'SKU',
    SortStatus: 'down',
    limit: 1,
    PriceDelimeter: '0',
    PriceValue: 0,
    StockValue: '0',
    Stock: 0,
    Category: '',
    CategoryName: '',
    IsMapped: '',
    PriceMaxValue: 0,
    PriceMaxDelimeter: '0',
    page: 0,
  };
}

async function jsonOrNull(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function validTokenPayload(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof value.access_token === 'string'
    && value.access_token.trim()
    && typeof value.expires_at === 'string'
    && Number.isFinite(Date.parse(value.expires_at)),
  );
}

function validInventoryEnvelope(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && Array.isArray(value.data)
    && typeof value.total === 'number'
    && Number.isFinite(value.total)
    && value.total >= 0,
  );
}

async function postInventory(baseUrl, body, authorization) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (authorization) headers.Authorization = authorization;

  const response = await fetch(`${baseUrl}${INVENTORY_PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    redirect: 'error',
  });
  const payload = await jsonOrNull(response);
  return {
    status: response.status,
    ok: response.ok,
    shapeOk: validInventoryEnvelope(payload),
    count: validInventoryEnvelope(payload) ? payload.data.length : null,
    total: validInventoryEnvelope(payload) ? payload.total : null,
    skuMatched: validInventoryEnvelope(payload)
      ? payload.data.some(item => item && typeof item === 'object' && item.SKU === body.Supplier)
      : false,
  };
}

export async function runAvasamBearerReadOnlyProbe() {
  for (const name of REQUIRED_ENV) requiredEnv(name);
  const consumerKey = requiredEnv('AVASAM_CONSUMER_KEY');
  const secretKey = requiredEnv('AVASAM_SECRET_KEY');
  const sku = requiredEnv('AVASAM_PROBE_SKU');
  const baseUrl = safeBaseUrl();

  const tokenResponse = await fetch(`${baseUrl}${TOKEN_PATH}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ consumer_key: consumerKey, secret_key: secretKey }),
    redirect: 'error',
  });
  const tokenPayload = await jsonOrNull(tokenResponse);

  if (!tokenResponse.ok || !validTokenPayload(tokenPayload)) {
    console.log(JSON.stringify({
      gate: 'avasam-readonly-token-transport',
      stage: 'request-token',
      status: tokenResponse.status,
      tokenShapeOk: validTokenPayload(tokenPayload),
    }));
    throw new Error('Avasam request-token probe did not return a valid token contract');
  }

  const body = readOnlyInventoryBody(sku);

  // Negative control: the same read-only request without any provider token.
  const unauthenticated = await postInventory(baseUrl, body, null);

  // Diagnostic hypothesis only: standard OAuth access-token transport.
  // This is not promoted into AvasamClient unless this controlled probe proves it.
  const bearer = await postInventory(baseUrl, body, `Bearer ${tokenPayload.access_token.trim()}`);

  const evidence = {
    gate: 'avasam-readonly-token-transport',
    endpoint: INVENTORY_PATH,
    sku,
    unauthenticated: {
      status: unauthenticated.status,
      shapeOk: unauthenticated.shapeOk,
    },
    bearer: {
      status: bearer.status,
      shapeOk: bearer.shapeOk,
      count: bearer.count,
      total: bearer.total,
      skuMatched: bearer.skuMatched,
    },
  };

  // Never print credentials, access_token, expiry payload, response rows, prices, stock, or supplier identifiers.
  console.log(JSON.stringify(evidence));

  const negativeControlRejected = !unauthenticated.ok && !unauthenticated.shapeOk;
  const bearerProved = bearer.ok && bearer.shapeOk;
  if (!negativeControlRejected || !bearerProved) {
    throw new Error('Avasam Bearer transport was not proven by the controlled read-only probe');
  }

  return evidence;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAvasamBearerReadOnlyProbe().catch(error => {
    console.error(error instanceof Error ? error.message : 'Avasam read-only transport probe failed');
    process.exitCode = 1;
  });
}
