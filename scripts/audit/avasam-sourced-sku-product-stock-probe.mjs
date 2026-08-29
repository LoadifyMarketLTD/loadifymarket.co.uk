const BASE_URL = 'https://app.avasam.com';
const TOKEN_PATH = '/api/auth/request-token';
const PRODUCT_PATH = '/apiseeker/Products/GetSellerProductList';
const STOCK_PATH = '/apiseeker/Products/SellerStockList';

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

async function post(path, body, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    redirect: 'error',
  });
  return { response, payload: await readJson(response) };
}

function findSkuRow(payload, sku) {
  if (!Array.isArray(payload)) return null;
  return payload.find(item => item && typeof item === 'object'
    && typeof item.SKU === 'string' && item.SKU.trim() === sku) || null;
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

  const productUnauth = await post(PRODUCT_PATH, { Page: 0, Limit: 10 });
  const productLive = await post(PRODUCT_PATH, { Page: 0, Limit: 10 }, auth);
  if (productUnauth.response.ok || !productLive.response.ok || !Array.isArray(productLive.payload)) {
    throw new Error('Avasam Seller Product List controlled read failed');
  }
  const productRow = findSkuRow(productLive.payload, sku);
  if (!productRow) throw new Error('Avasam sourced SKU not present in Seller Product List');
  if (typeof productRow.Price !== 'number' || !Number.isFinite(productRow.Price)) {
    throw new Error('Avasam sourced SKU Price is not numeric in Seller Product List');
  }

  const stockUnauth = await post(STOCK_PATH, { limit: 10, page: 0 });
  const stockLive = await post(STOCK_PATH, { limit: 10, page: 0 }, auth);
  if (stockUnauth.response.ok || !stockLive.response.ok || !Array.isArray(stockLive.payload)) {
    throw new Error('Avasam Seller Stock List controlled read failed');
  }
  const stockRow = findSkuRow(stockLive.payload, sku);
  if (!stockRow) throw new Error('Avasam sourced SKU not present in Seller Stock List');
  if (typeof stockRow.Stock !== 'number' || !Number.isInteger(stockRow.Stock)) {
    throw new Error('Avasam sourced SKU Stock is not an integer in Seller Stock List');
  }

  console.log('Avasam sourced SKU product + price + stock contract: PASS');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Avasam sourced SKU product + stock probe failed');
  process.exitCode = 1;
});
