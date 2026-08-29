const BASE_URL = 'https://app.avasam.com';
const TOKEN_PATH = '/api/auth/request-token';
const INVENTORY_PATH = '/apiseeker/ProductModule/GetInventoryListWithFilter';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function inventoryBody(sku) {
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

async function post(path, body, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    redirect: 'error',
  });
  return { response, payload: await readJson(response) };
}

async function main() {
  const consumerKey = required('AVASAM_CONSUMER_KEY');
  const secretKey = required('AVASAM_SECRET_KEY');
  const sku = required('AVASAM_PROBE_SKU');

  const token = await post(TOKEN_PATH, { consumer_key: consumerKey, secret_key: secretKey });
  if (!token.response.ok || !token.payload || typeof token.payload !== 'object'
      || typeof token.payload.access_token !== 'string' || !token.payload.access_token.trim()) {
    throw new Error('Avasam token contract failed');
  }

  const auth = { Authorization: token.payload.access_token.trim() };
  const unauth = await post(INVENTORY_PATH, inventoryBody(sku));
  const live = await post(INVENTORY_PATH, inventoryBody(sku), auth);

  if (unauth.response.ok || !live.response.ok) {
    throw new Error('Avasam sourced SKU authenticated HTTP control failed');
  }
  if (!live.payload || typeof live.payload !== 'object' || Array.isArray(live.payload)) {
    throw new Error('Avasam sourced SKU payload is not an object envelope');
  }
  if (!Array.isArray(live.payload.data)) {
    throw new Error('Avasam sourced SKU payload data is not an array');
  }
  if (!Number.isInteger(live.payload.total) || live.payload.total < 0) {
    throw new Error('Avasam sourced SKU payload total is not a non-negative integer');
  }

  const row = live.payload.data.find(item => item && typeof item === 'object'
    && typeof item.SKU === 'string' && item.SKU.trim() === sku);
  if (!row) throw new Error('Avasam sourced SKU row not found in data array');
  if (typeof row.Price !== 'number' || !Number.isFinite(row.Price)) {
    throw new Error('Avasam sourced SKU Price is not numeric');
  }
  if (typeof row.Stock !== 'number' || !Number.isInteger(row.Stock)) {
    throw new Error('Avasam sourced SKU Stock is not an integer');
  }

  console.log('Avasam sourced SKU parser contract: PASS');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Avasam sourced SKU parser contract failed');
  process.exitCode = 1;
});
