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
    ProductType: [], Supplier: sku, Sortby: 'SKU', SortStatus: 'down', limit: 1,
    PriceDelimeter: '0', PriceValue: 0, StockValue: '0', Stock: 0,
    Category: '', CategoryName: '', IsMapped: '', PriceMaxValue: 0,
    PriceMaxDelimeter: '0', page: 0,
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

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function findSkuRecord(value, sku, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSkuRecord(item, sku, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  if (typeof value.SKU === 'string' && value.SKU.trim() === sku) return value;
  for (const child of Object.values(value)) {
    const found = findSkuRecord(child, sku, depth + 1);
    if (found) return found;
  }
  return null;
}

function numericString(value) {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}

async function main() {
  const consumerKey = required('AVASAM_CONSUMER_KEY');
  const secretKey = required('AVASAM_SECRET_KEY');
  const sku = required('AVASAM_PROBE_SKU');
  const gate = (process.env.AVASAM_PARSER_GATE || 'full-current-parser').trim();

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

  const payload = live.payload;
  const record = isRecord(payload);
  const data = record ? payload.data : undefined;
  const result = record ? payload.result : undefined;
  const Result = record ? payload.Result : undefined;
  const items = record ? payload.items : undefined;
  const Items = record ? payload.Items : undefined;
  const products = record ? payload.products : undefined;
  const Products = record ? payload.Products : undefined;
  const value = record ? payload.value : undefined;
  const Value = record ? payload.Value : undefined;
  const dataRecord = isRecord(data);
  const resultRecord = isRecord(result);
  const ResultRecord = isRecord(Result);
  const dataArray = record && Array.isArray(data);
  const totalNumber = record && typeof payload.total === 'number' && Number.isFinite(payload.total) && payload.total >= 0;
  const totalInteger = totalNumber && Number.isInteger(payload.total);
  const totalNumericString = record && numericString(payload.total) && Number(payload.total) >= 0;
  const rowAnywhere = findSkuRecord(payload, sku);
  const rowInData = dataArray ? data.find(item => item && typeof item === 'object'
    && typeof item.SKU === 'string' && item.SKU.trim() === sku) : null;

  const knownTopList = [result, Result, items, Items, products, Products, value, Value].some(Array.isArray);
  const skuInKnownTop = [result, Result, items, Items, products, Products, value, Value]
    .some(candidate => Boolean(findSkuRecord(candidate, sku)));

  const facts = {
    'envelope-record': record,
    'data-array': dataArray,
    'data-object': dataRecord,
    'sku-under-data': Boolean(findSkuRecord(data, sku)),
    'data-data-array': dataRecord && Array.isArray(data.data),
    'data-Data-array': dataRecord && Array.isArray(data.Data),
    'data-items-array': dataRecord && Array.isArray(data.items),
    'data-Items-array': dataRecord && Array.isArray(data.Items),
    'data-result-array': dataRecord && Array.isArray(data.result),
    'data-Result-array': dataRecord && Array.isArray(data.Result),
    'data-products-array': dataRecord && Array.isArray(data.products),
    'data-Products-array': dataRecord && Array.isArray(data.Products),
    'result-object': resultRecord,
    'Result-object': ResultRecord,
    'result-array': Array.isArray(result),
    'Result-array': Array.isArray(Result),
    'items-array': Array.isArray(items),
    'Items-array': Array.isArray(Items),
    'products-array': Array.isArray(products),
    'Products-array': Array.isArray(Products),
    'value-array': Array.isArray(value),
    'Value-array': Array.isArray(Value),
    'known-top-list': knownTopList,
    'sku-in-known-top': skuInKnownTop,
    'sku-under-result': Boolean(findSkuRecord(result, sku)),
    'sku-under-Result': Boolean(findSkuRecord(Result, sku)),
    'sku-under-items': Boolean(findSkuRecord(items, sku)),
    'sku-under-Items': Boolean(findSkuRecord(Items, sku)),
    'sku-under-products': Boolean(findSkuRecord(products, sku)),
    'sku-under-Products': Boolean(findSkuRecord(Products, sku)),
    'sku-under-value': Boolean(findSkuRecord(value, sku)),
    'sku-under-Value': Boolean(findSkuRecord(Value, sku)),
    'result-data-array': resultRecord && Array.isArray(result.data),
    'result-items-array': resultRecord && Array.isArray(result.items),
    'Result-Data-array': ResultRecord && Array.isArray(Result.Data),
    'Result-Items-array': ResultRecord && Array.isArray(Result.Items),
    'total-number': totalNumber,
    'total-integer': totalInteger,
    'total-numeric-string': totalNumericString,
    'sku-anywhere': Boolean(rowAnywhere),
    'sku-in-data': Boolean(rowInData),
    'price-number-anywhere': Boolean(rowAnywhere && typeof rowAnywhere.Price === 'number' && Number.isFinite(rowAnywhere.Price)),
    'price-numeric-string-anywhere': Boolean(rowAnywhere && numericString(rowAnywhere.Price)),
    'stock-number-anywhere': Boolean(rowAnywhere && typeof rowAnywhere.Stock === 'number' && Number.isFinite(rowAnywhere.Stock)),
    'stock-integer-anywhere': Boolean(rowAnywhere && typeof rowAnywhere.Stock === 'number' && Number.isInteger(rowAnywhere.Stock)),
    'stock-numeric-string-anywhere': Boolean(rowAnywhere && numericString(rowAnywhere.Stock)),
    'full-current-parser': Boolean(dataArray && totalInteger && rowInData
      && typeof rowInData.Price === 'number' && Number.isFinite(rowInData.Price)
      && typeof rowInData.Stock === 'number' && Number.isInteger(rowInData.Stock)),
  };

  if (!Object.prototype.hasOwnProperty.call(facts, gate)) throw new Error('Unsupported parser gate');
  if (!facts[gate]) throw new Error(`Avasam sourced SKU parser gate failed: ${gate}`);
  console.log(`Avasam sourced SKU parser gate: ${gate}: PASS`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Avasam sourced SKU parser gate failed');
  process.exitCode = 1;
});
