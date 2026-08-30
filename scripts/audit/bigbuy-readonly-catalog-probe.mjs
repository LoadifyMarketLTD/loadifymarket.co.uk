const BIGBUY_BASE_URLS = {
  sandbox: 'https://api.sandbox.bigbuy.eu',
  production: 'https://api.bigbuy.eu',
};

const ENDPOINTS = {
  products: '/rest/catalog/products.json',
  variations: '/rest/catalog/productsvariations.json',
  productStock: '/rest/catalog/productsstockbyhandlingdays.json',
  variationStock: '/rest/catalog/productsvariationsstockbyhandlingdays.json',
};

const PRODUCTION_CONFIRMATION = 'ALLOW_BIGBUY_PRODUCTION_READ_ONLY_PROBE';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function environment() {
  const value = (process.env.BIGBUY_API_ENVIRONMENT || 'sandbox').trim().toLowerCase();
  if (value !== 'sandbox' && value !== 'production') {
    throw new Error('BIGBUY_API_ENVIRONMENT must be sandbox or production');
  }
  if (value === 'production' && process.env.BIGBUY_PROBE_PRODUCTION_CONFIRMATION !== PRODUCTION_CONFIRMATION) {
    throw new Error(`Refusing production probe. Set BIGBUY_PROBE_PRODUCTION_CONFIRMATION=${PRODUCTION_CONFIRMATION} explicitly.`);
  }
  return value;
}

function positiveSafeIntegerEnv(name) {
  const raw = requiredEnv(name);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || String(value) !== raw.replace(/^\+/, '')) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

function endpointPath(endpoint, parentTaxonomy) {
  const params = new URLSearchParams({ parentTaxonomy: String(parentTaxonomy) });
  return `${endpoint}?${params.toString()}`;
}

async function jsonOrNull(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validProductsResponse(value) {
  return Array.isArray(value) && value.every(item => (
    isRecord(item)
    && Number.isSafeInteger(item.id) && item.id > 0
    && typeof item.sku === 'string' && item.sku.trim().length > 0
    && typeof item.wholesalePrice === 'number' && Number.isFinite(item.wholesalePrice) && item.wholesalePrice >= 0
    && (item.active === 0 || item.active === 1)
  ));
}

function validVariationsResponse(value) {
  return Array.isArray(value) && value.every(item => (
    isRecord(item)
    && Number.isSafeInteger(item.id) && item.id > 0
    && typeof item.sku === 'string' && item.sku.trim().length > 0
    && Number.isSafeInteger(item.product) && item.product > 0
    && typeof item.wholesalePrice === 'number' && Number.isFinite(item.wholesalePrice) && item.wholesalePrice >= 0
  ));
}

function validStockResponse(value) {
  return Array.isArray(value) && value.every(item => (
    isRecord(item)
    && Number.isSafeInteger(item.id) && item.id > 0
    && typeof item.sku === 'string' && item.sku.trim().length > 0
    && Array.isArray(item.stocks)
    && item.stocks.every(bucket => (
      isRecord(bucket)
      && Number.isSafeInteger(bucket.quantity) && bucket.quantity >= 0
      && Number.isSafeInteger(bucket.minHandlingDays) && bucket.minHandlingDays >= 0
      && Number.isSafeInteger(bucket.maxHandlingDays) && bucket.maxHandlingDays >= bucket.minHandlingDays
      && Number.isSafeInteger(bucket.warehouse) && bucket.warehouse >= 0
    ))
  ));
}

function containsSku(value, sku) {
  return Array.isArray(value) && value.some(item => isRecord(item) && item.sku?.trim() === sku);
}

async function getJson(baseUrl, path, apiKey) {
  const headers = { Accept: 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
    redirect: 'error',
  });
  return { response, payload: await jsonOrNull(response) };
}

async function proveReadContract({ baseUrl, path, apiKey, validator, expectedSku, label }) {
  const unauthenticated = await getJson(baseUrl, path, null);
  const authenticated = await getJson(baseUrl, path, apiKey);

  const negativeControlRejected = !unauthenticated.response.ok;
  const shapeOk = authenticated.response.ok && validator(authenticated.payload);
  const skuPresent = shapeOk && containsSku(authenticated.payload, expectedSku);

  if (!negativeControlRejected || !shapeOk || !skuPresent) {
    throw new Error(`BigBuy ${label} read-only contract was not proven`);
  }

  return { endpoint: path.split('?')[0], sku: expectedSku, verified: true };
}

export async function runBigBuyReadOnlyCatalogProbe() {
  const env = environment();
  const apiKey = requiredEnv('BIGBUY_API_KEY');
  const parentTaxonomy = positiveSafeIntegerEnv('BIGBUY_AUDIT_PARENT_TAXONOMY');
  const productSku = requiredEnv('BIGBUY_AUDIT_PRODUCT_SKU');
  const variationSku = process.env.BIGBUY_AUDIT_VARIATION_SKU?.trim() || null;
  const baseUrl = BIGBUY_BASE_URLS[env];

  const product = await proveReadContract({
    baseUrl,
    path: endpointPath(ENDPOINTS.products, parentTaxonomy),
    apiKey,
    validator: validProductsResponse,
    expectedSku: productSku,
    label: 'products',
  });

  const stock = await proveReadContract({
    baseUrl,
    path: endpointPath(ENDPOINTS.productStock, parentTaxonomy),
    apiKey,
    validator: validStockResponse,
    expectedSku: productSku,
    label: 'product stock',
  });

  let variation = null;
  let variationStock = null;
  if (variationSku) {
    variation = await proveReadContract({
      baseUrl,
      path: endpointPath(ENDPOINTS.variations, parentTaxonomy),
      apiKey,
      validator: validVariationsResponse,
      expectedSku: variationSku,
      label: 'variations',
    });
    variationStock = await proveReadContract({
      baseUrl,
      path: endpointPath(ENDPOINTS.variationStock, parentTaxonomy),
      apiKey,
      validator: validStockResponse,
      expectedSku: variationSku,
      label: 'variation stock',
    });
  }

  return {
    provider: 'bigbuy',
    environment: env,
    parentTaxonomy,
    product,
    stock,
    variation,
    variationStock,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBigBuyReadOnlyCatalogProbe()
    .then(result => {
      console.log(JSON.stringify({
        provider: result.provider,
        environment: result.environment,
        parentTaxonomy: result.parentTaxonomy,
        productSku: result.product.sku,
        productCatalogVerified: result.product.verified,
        productStockVerified: result.stock.verified,
        variationSku: result.variation?.sku ?? null,
        variationCatalogVerified: result.variation?.verified ?? false,
        variationStockVerified: result.variationStock?.verified ?? false,
      }));
    })
    .catch(error => {
      console.error(error instanceof Error ? error.message : 'BigBuy read-only catalogue probe failed');
      process.exitCode = 1;
    });
}
