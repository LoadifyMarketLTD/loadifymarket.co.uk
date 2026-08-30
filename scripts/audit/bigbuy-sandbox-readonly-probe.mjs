import { pathToFileURL } from 'node:url';

const SANDBOX_BASE_URL = 'https://api.sandbox.bigbuy.eu';
const READONLY_ENDPOINTS = Object.freeze({
  products: '/rest/catalog/products.json',
  variations: '/rest/catalog/productsvariations.json',
  productStock: '/rest/catalog/productsstockbyhandlingdays.json',
  variationStock: '/rest/catalog/productsvariationsstockbyhandlingdays.json',
});

const REQUIRED_ENV = Object.freeze([
  'BIGBUY_API_KEY',
  'BIGBUY_PROBE_PARENT_TAXONOMY',
  'BIGBUY_PROBE_PRODUCT_ID',
  'BIGBUY_PROBE_PRODUCT_SKU',
  'BIGBUY_PROBE_VARIATION_ID',
  'BIGBUY_PROBE_VARIATION_SKU',
]);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function positiveSafeIntegerEnv(name) {
  const raw = requiredEnv(name);
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a positive safe integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

function requireSandboxOnly() {
  const requested = (process.env.BIGBUY_API_ENVIRONMENT ?? 'sandbox').trim().toLowerCase();
  if (requested !== 'sandbox') {
    throw new Error('BigBuy manual read-only probe is sandbox-only; BIGBUY_API_ENVIRONMENT must be sandbox');
  }
}

function buildParentTaxonomyPath(endpoint, parentTaxonomy) {
  if (!Object.values(READONLY_ENDPOINTS).includes(endpoint)) {
    throw new Error('BigBuy probe endpoint is not in the read-only allowlist');
  }
  const params = new URLSearchParams({ parentTaxonomy: String(parentTaxonomy) });
  return `${endpoint}?${params.toString()}`;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertJsonArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`BigBuy ${label} response must be an array`);
  return value;
}

function assertProductShape(value, label) {
  if (!isRecord(value)) throw new Error(`BigBuy ${label} item must be an object`);
  if (!Number.isSafeInteger(value.id) || value.id <= 0) throw new Error(`BigBuy ${label}.id is invalid`);
  if (typeof value.sku !== 'string' || !value.sku.trim()) throw new Error(`BigBuy ${label}.sku is invalid`);
  if (typeof value.wholesalePrice !== 'number' || !Number.isFinite(value.wholesalePrice) || value.wholesalePrice < 0) {
    throw new Error(`BigBuy ${label}.wholesalePrice is invalid`);
  }
  return value;
}

function assertStockItemShape(value, label) {
  if (!isRecord(value)) throw new Error(`BigBuy ${label} item must be an object`);
  if (!Number.isSafeInteger(value.id) || value.id <= 0) throw new Error(`BigBuy ${label}.id is invalid`);
  if (typeof value.sku !== 'string' || !value.sku.trim()) throw new Error(`BigBuy ${label}.sku is invalid`);
  if (!Array.isArray(value.stocks)) throw new Error(`BigBuy ${label}.stocks must be an array`);
  for (const [index, bucket] of value.stocks.entries()) {
    if (!isRecord(bucket)) throw new Error(`BigBuy ${label}.stocks[${index}] must be an object`);
    for (const field of ['quantity', 'minHandlingDays', 'maxHandlingDays', 'warehouse']) {
      if (!Number.isSafeInteger(bucket[field]) || bucket[field] < 0) {
        throw new Error(`BigBuy ${label}.stocks[${index}].${field} is invalid`);
      }
    }
    if (bucket.maxHandlingDays < bucket.minHandlingDays) {
      throw new Error(`BigBuy ${label}.stocks[${index}] handling-day range is invalid`);
    }
  }
  return value;
}

function describeShape(value, depth = 0) {
  if (value === null) return { kind: 'null' };
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      length: value.length,
      item: value.length > 0 && depth < 2 ? describeShape(value[0], depth + 1) : null,
    };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return {
      kind: 'object',
      keys,
      fields: depth < 2
        ? Object.fromEntries(keys.map(key => [key, describeShape(value[key], depth + 1)]))
        : undefined,
    };
  }
  if (typeof value === 'number') return { kind: Number.isInteger(value) ? 'integer' : 'number' };
  return { kind: typeof value };
}

async function responseJson(response, label) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`BigBuy ${label} response was not JSON`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`BigBuy ${label} response contained invalid JSON`);
  }
}

async function getReadOnly(path, apiKey, authenticated, label) {
  const headers = { Accept: 'application/json' };
  if (authenticated) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${SANDBOX_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    redirect: 'error',
  });

  if (!authenticated) return { status: response.status, ok: response.ok };

  if (!response.ok) {
    throw new Error(`BigBuy ${label} authenticated request failed with HTTP ${response.status}`);
  }
  return { status: response.status, ok: true, payload: await responseJson(response, label) };
}

function findControlledItem(items, id, sku, label) {
  const matches = items.filter(item => isRecord(item) && item.id === id && item.sku === sku);
  if (matches.length !== 1) {
    throw new Error(`BigBuy ${label} did not contain exactly one controlled id/SKU match`);
  }
  return matches[0];
}

export async function runBigBuySandboxReadOnlyProbe() {
  requireSandboxOnly();
  for (const name of REQUIRED_ENV) requiredEnv(name);

  const apiKey = requiredEnv('BIGBUY_API_KEY');
  const parentTaxonomy = positiveSafeIntegerEnv('BIGBUY_PROBE_PARENT_TAXONOMY');
  const productId = positiveSafeIntegerEnv('BIGBUY_PROBE_PRODUCT_ID');
  const productSku = requiredEnv('BIGBUY_PROBE_PRODUCT_SKU');
  const variationId = positiveSafeIntegerEnv('BIGBUY_PROBE_VARIATION_ID');
  const variationSku = requiredEnv('BIGBUY_PROBE_VARIATION_SKU');

  const paths = {
    products: buildParentTaxonomyPath(READONLY_ENDPOINTS.products, parentTaxonomy),
    variations: buildParentTaxonomyPath(READONLY_ENDPOINTS.variations, parentTaxonomy),
    productStock: buildParentTaxonomyPath(READONLY_ENDPOINTS.productStock, parentTaxonomy),
    variationStock: buildParentTaxonomyPath(READONLY_ENDPOINTS.variationStock, parentTaxonomy),
  };

  const negativeControl = await getReadOnly(paths.products, apiKey, false, 'negative control');
  if (negativeControl.status !== 401 && negativeControl.status !== 403) {
    throw new Error(`BigBuy negative authentication control was not rejected with 401/403 (HTTP ${negativeControl.status})`);
  }

  const productsResponse = await getReadOnly(paths.products, apiKey, true, 'products');
  const products = assertJsonArray(productsResponse.payload, 'products');
  const product = assertProductShape(
    findControlledItem(products, productId, productSku, 'products'),
    'products',
  );
  if (product.active !== 0 && product.active !== 1) throw new Error('BigBuy products.active is invalid');

  const variationsResponse = await getReadOnly(paths.variations, apiKey, true, 'variations');
  const variations = assertJsonArray(variationsResponse.payload, 'variations');
  const variation = assertProductShape(
    findControlledItem(variations, variationId, variationSku, 'variations'),
    'variations',
  );
  if (!Number.isSafeInteger(variation.product) || variation.product !== productId) {
    throw new Error('BigBuy controlled variation is not bound to the controlled product');
  }

  const productStockResponse = await getReadOnly(paths.productStock, apiKey, true, 'product stock');
  const productStockItems = assertJsonArray(productStockResponse.payload, 'product stock');
  const productStock = assertStockItemShape(
    findControlledItem(productStockItems, productId, productSku, 'product stock'),
    'product stock',
  );

  const variationStockResponse = await getReadOnly(paths.variationStock, apiKey, true, 'variation stock');
  const variationStockItems = assertJsonArray(variationStockResponse.payload, 'variation stock');
  const variationStock = assertStockItemShape(
    findControlledItem(variationStockItems, variationId, variationSku, 'variation stock'),
    'variation stock',
  );

  return {
    gate: 'bigbuy-sandbox-readonly-contract-probe',
    environment: 'sandbox',
    host: SANDBOX_BASE_URL,
    authentication: {
      negativeControlStatus: negativeControl.status,
      bearerAuthenticated: true,
    },
    controlledScope: {
      parentTaxonomy,
      product: { id: productId, skuMatched: true },
      variation: { id: variationId, skuMatched: true, productBindingMatched: true },
    },
    verifiedReadContracts: {
      products: {
        matched: true,
        wholesalePriceNumeric: true,
        activeFlagValid: true,
        shape: describeShape(product),
      },
      variations: {
        matched: true,
        wholesalePriceNumeric: true,
        productBindingMatched: true,
        shape: describeShape(variation),
      },
      productStock: {
        matched: true,
        stockBucketsValid: true,
        shape: describeShape(productStock),
      },
      variationStock: {
        matched: true,
        stockBucketsValid: true,
        shape: describeShape(variationStock),
      },
    },
    safety: {
      ordersCalled: false,
      piiProcessed: false,
      capabilityPromotionPerformed: false,
      fullProviderPayloadLogged: false,
    },
  };
}

const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (invokedDirectly) {
  runBigBuySandboxReadOnlyProbe()
    .then(evidence => console.log(JSON.stringify(evidence, null, 2)))
    .catch(error => {
      console.error(error instanceof Error ? error.message : 'BigBuy sandbox read-only probe failed');
      process.exitCode = 1;
    });
}
