import { Buffer } from 'node:buffer';
import {
  DIRECT_SUPPLIER_CONTRACT_VERSION,
  DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH,
  validateDirectSupplierFeedBatch,
  type DirectSupplierFeedBatchV1,
  type DirectSupplierFeedTransport,
  type DirectSupplierVariantRecord,
  type DirectSupplierSourceFormat,
} from './directSupplierContract';

export interface DirectSupplierFieldMapV1 {
  externalProductRef: string;
  externalVariantRef: string;
  title: string;
  currency: string;
  amount: string;
  warehouseCountry: string;
  sku?: string;
  gtin?: string;
  stockQuantity?: string;
  imageUrls?: string;
  attributes?: string;
}

export interface DirectSupplierNormalizationInputV1 {
  supplierKey: string;
  generatedAt: string;
  transport: DirectSupplierFeedTransport;
  sourceFormat: DirectSupplierSourceFormat;
  rawPayload: string;
  fieldMap?: DirectSupplierFieldMapV1;
  amountUnit?: 'minor' | 'major';
  minorUnitDigits?: 0 | 1 | 2 | 3;
  xmlRecordElement?: string;
}

export type DirectSupplierNormalizationResultV1 =
  | {
      ok: true;
      batch: DirectSupplierFeedBatchV1;
      recordCount: number;
      normalizationOnly: true;
      externalAccessPerformed: false;
      persistencePerformed: false;
      marketplaceListingPerformed: false;
    }
  | {
      ok: false;
      errors: string[];
      normalizationOnly: true;
      externalAccessPerformed: false;
      persistencePerformed: false;
      marketplaceListingPerformed: false;
    };

type SourceRecord = Record<string, unknown>;

const DEFAULT_FIELD_MAP: DirectSupplierFieldMapV1 = {
  externalProductRef: 'externalProductRef',
  externalVariantRef: 'externalVariantRef',
  title: 'title',
  currency: 'currency',
  amount: 'amountMinor',
  warehouseCountry: 'warehouseCountry',
  sku: 'sku',
  gtin: 'gtin',
  stockQuantity: 'stockQuantity',
  imageUrls: 'imageUrls',
  attributes: 'attributes',
};

const MAX_RAW_PAYLOAD_BYTES = 2 * 1024 * 1024;
const SAFE_XML_NAME = /^[A-Za-z_][A-Za-z0-9_.:-]{0,63}$/;

function fail(errors: string[]): DirectSupplierNormalizationResultV1 {
  return {
    ok: false,
    errors: [...new Set(errors)],
    normalizationOnly: true,
    externalAccessPerformed: false,
    persistencePerformed: false,
    marketplaceListingPerformed: false,
  };
}

function isRecord(value: unknown): value is SourceRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPath(record: SourceRecord, path: string | undefined): unknown {
  if (!path) return undefined;
  let current: unknown = record;
  for (const part of path.split('.').map((item) => item.trim()).filter(Boolean)) {
    if (!isRecord(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function requiredString(value: unknown, label: string, errors: string[]): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    errors.push(label + ' is required');
    return '';
  }
  const normalized = String(value).trim();
  if (!normalized) errors.push(label + ' is required');
  return normalized;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function parseInteger(value: unknown, label: string, errors: string[], optional = false): number | undefined {
  if ((value === undefined || value === null || value === '') && optional) return undefined;
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^-?\d+$/.test(raw)) {
    errors.push(label + ' must be an integer');
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    errors.push(label + ' must be a safe integer');
    return undefined;
  }
  return parsed;
}

function parseAmount(
  value: unknown,
  amountUnit: 'minor' | 'major',
  minorUnitDigits: 0 | 1 | 2 | 3,
  errors: string[],
): number {
  if (amountUnit === 'minor') return parseInteger(value, 'amount', errors) ?? -1;
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
    errors.push('amount must be numeric');
    return -1;
  }
  const minor = Math.round(Number(raw) * (10 ** minorUnitDigits));
  if (!Number.isSafeInteger(minor)) {
    errors.push('amount cannot be represented safely in minor units');
    return -1;
  }
  return minor;
}

function parseImageUrls(value: unknown, errors: string[]): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === 'string')) {
      errors.push('imageUrls must contain only strings');
      return undefined;
    }
    return value.map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === 'string') return value.split('|').map((item) => item.trim()).filter(Boolean);
  errors.push('imageUrls must be an array or pipe-delimited string');
  return undefined;
}

function parseAttributes(value: unknown, errors: string[]): Record<string, string> | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (!entries.every(([, child]) => ['string', 'number', 'boolean'].includes(typeof child))) {
      errors.push('attributes values must be scalar');
      return undefined;
    }
    return Object.fromEntries(entries.map(([key, child]) => [key.trim(), String(child).trim()]));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!isRecord(parsed)) throw new Error('attributes must be an object');
      return parseAttributes(parsed, errors);
    } catch {
      errors.push('attributes must be a JSON object when supplied as text');
      return undefined;
    }
  }
  errors.push('attributes must be an object or JSON object string');
  return undefined;
}

function normalizeRecord(
  record: SourceRecord,
  fieldMap: DirectSupplierFieldMapV1,
  amountUnit: 'minor' | 'major',
  minorUnitDigits: 0 | 1 | 2 | 3,
  index: number,
): { variant?: DirectSupplierVariantRecord; errors: string[] } {
  const errors: string[] = [];
  const prefix = 'records[' + index + ']';
  const externalProductRef = requiredString(getPath(record, fieldMap.externalProductRef), prefix + '.externalProductRef', errors);
  const externalVariantRef = requiredString(getPath(record, fieldMap.externalVariantRef), prefix + '.externalVariantRef', errors);
  const title = requiredString(getPath(record, fieldMap.title), prefix + '.title', errors);
  const currency = requiredString(getPath(record, fieldMap.currency), prefix + '.currency', errors).toUpperCase();
  const warehouseCountry = requiredString(getPath(record, fieldMap.warehouseCountry), prefix + '.warehouseCountry', errors).toUpperCase();
  const amountMinor = parseAmount(getPath(record, fieldMap.amount), amountUnit, minorUnitDigits, errors);
  const stockQuantity = parseInteger(getPath(record, fieldMap.stockQuantity), prefix + '.stockQuantity', errors, true);
  const imageUrls = parseImageUrls(getPath(record, fieldMap.imageUrls), errors);
  const attributes = parseAttributes(getPath(record, fieldMap.attributes), errors);

  if (errors.length > 0) return { errors };
  return {
    errors: [],
    variant: {
      externalProductRef,
      externalVariantRef,
      title,
      currency,
      amountMinor,
      warehouseCountry,
      sku: optionalString(getPath(record, fieldMap.sku)),
      gtin: optionalString(getPath(record, fieldMap.gtin)),
      stockQuantity,
      imageUrls,
      attributes,
    },
  };
}

function parseCsv(raw: string): { records?: SourceRecord[]; errors: string[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted) {
      if (char === '"') {
        if (raw[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else field += char;
      continue;
    }
    if (char === '"') {
      if (field.length > 0) return { errors: ['CSV quote must begin at the start of a field'] };
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else if (char !== '\r') field += char;
  }

  if (quoted) return { errors: ['CSV contains an unterminated quoted field'] };
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (rows.length < 2) return { errors: ['CSV must include a header row and at least one data row'] };

  const headers = rows[0].map((value) => value.trim());
  if (headers.some((header) => !header)) return { errors: ['CSV headers must not be empty'] };
  if (new Set(headers).size !== headers.length) return { errors: ['CSV headers must be unique'] };

  const records = rows.slice(1).map((values, rowIndex) => {
    const record: SourceRecord = {};
    headers.forEach((header, columnIndex) => { record[header] = values[columnIndex] ?? ''; });
    if (values.length > headers.length) record.__extraColumns = values.slice(headers.length);
    record.__sourceRow = rowIndex + 2;
    return record;
  });
  const errors = records
    .filter((record) => Array.isArray(record.__extraColumns) && record.__extraColumns.length > 0)
    .map((record) => 'CSV row ' + String(record.__sourceRow) + ' contains more columns than the header');
  return errors.length > 0 ? { errors } : { records, errors: [] };
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
}

function parseXml(raw: string, recordElement: string): { records?: SourceRecord[]; errors: string[] } {
  if (!SAFE_XML_NAME.test(recordElement)) return { errors: ['xmlRecordElement is invalid'] };
  if (/<!DOCTYPE|<!ENTITY/i.test(raw)) return { errors: ['XML DTD/entity declarations are not allowed'] };

  const escaped = escapeRegExp(recordElement);
  const recordRegex = new RegExp('<' + escaped + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + escaped + '>', 'gi');
  const records: SourceRecord[] = [];
  let match: RegExpExecArray | null;
  while ((match = recordRegex.exec(raw)) !== null) {
    const body = match[1];
    const record: SourceRecord = {};
    const childRegex = /<([A-Za-z_][A-Za-z0-9_.:-]{0,63})(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    let child: RegExpExecArray | null;
    while ((child = childRegex.exec(body)) !== null) {
      record[child[1]] = decodeXmlText(child[2].replace(/<[^>]+>/g, '').trim());
    }
    if (Object.keys(record).length > 0) records.push(record);
  }
  if (records.length === 0) return { errors: ['XML contains no <' + recordElement + '> records'] };
  return { records, errors: [] };
}

function parseJson(raw: string): { records?: SourceRecord[]; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { errors: ['JSON source is invalid'] };
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.variants)
      ? parsed.variants
      : isRecord(parsed) && Array.isArray(parsed.items)
        ? parsed.items
        : null;
  if (!rows) return { errors: ['JSON source must be an array or contain a variants/items array'] };
  if (!rows.every(isRecord)) return { errors: ['JSON source records must be objects'] };
  return { records: rows, errors: [] };
}

export function normalizeDirectSupplierSource(
  input: DirectSupplierNormalizationInputV1,
): DirectSupplierNormalizationResultV1 {
  const errors: string[] = [];
  if (!input.supplierKey.trim()) errors.push('supplierKey is required');
  if (!Number.isFinite(Date.parse(input.generatedAt))) errors.push('generatedAt must be an ISO-compatible timestamp');
  if (Buffer.byteLength(input.rawPayload, 'utf8') > MAX_RAW_PAYLOAD_BYTES) errors.push('source payload exceeds 2 MiB');

  const compatible: Record<DirectSupplierFeedTransport, readonly DirectSupplierSourceFormat[]> = {
    json_api: ['json', 'canonical_json'],
    json_feed: ['json', 'canonical_json'],
    feed_url: ['json', 'csv', 'xml', 'canonical_json'],
    csv: ['csv'],
    xml: ['xml'],
    sftp: ['json', 'csv', 'xml', 'canonical_json'],
    manual_catalog: ['json', 'canonical_json'],
  };
  if (!compatible[input.transport].includes(input.sourceFormat)) {
    errors.push('sourceFormat ' + input.sourceFormat + ' is incompatible with transport ' + input.transport);
  }
  if (errors.length > 0) return fail(errors);

  const parsed = input.sourceFormat === 'csv'
    ? parseCsv(input.rawPayload)
    : input.sourceFormat === 'xml'
      ? parseXml(input.rawPayload, input.xmlRecordElement?.trim() || 'product')
      : parseJson(input.rawPayload);

  if (!parsed.records) return fail(parsed.errors);
  if (parsed.records.length === 0) return fail(['source contains no records']);
  if (parsed.records.length > DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH) {
    return fail(['source contains more than ' + DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH + ' records']);
  }

  const fieldMap = input.fieldMap ?? DEFAULT_FIELD_MAP;
  const amountUnit = input.amountUnit ?? 'minor';
  const minorUnitDigits = input.minorUnitDigits ?? 2;
  const variants: DirectSupplierVariantRecord[] = [];
  const recordErrors: string[] = [];

  parsed.records.forEach((record, index) => {
    const normalized = normalizeRecord(record, fieldMap, amountUnit, minorUnitDigits, index);
    if (normalized.variant) variants.push(normalized.variant);
    recordErrors.push(...normalized.errors);
  });
  if (recordErrors.length > 0) return fail(recordErrors.slice(0, 100));

  const batch: DirectSupplierFeedBatchV1 = {
    contractVersion: DIRECT_SUPPLIER_CONTRACT_VERSION,
    supplierKey: input.supplierKey.trim().toLowerCase(),
    generatedAt: new Date(input.generatedAt).toISOString(),
    transport: input.transport,
    sourceFormat: input.sourceFormat,
    variants,
  };
  const batchErrors = validateDirectSupplierFeedBatch(batch);
  if (batchErrors.length > 0) return fail(batchErrors);

  return {
    ok: true,
    batch,
    recordCount: variants.length,
    normalizationOnly: true,
    externalAccessPerformed: false,
    persistencePerformed: false,
    marketplaceListingPerformed: false,
  };
}

export function evaluateDirectSupplierTransportConfiguration(input: {
  transport: DirectSupplierFeedTransport;
  sourceFormat?: DirectSupplierSourceFormat;
  configRef?: string;
}): {
  valid: boolean;
  blockers: string[];
  normalizationSupported: boolean;
  externalAcquisitionEnabled: false;
} {
  const blockers: string[] = [];
  const inferredFormat: DirectSupplierSourceFormat | undefined = input.sourceFormat
    ?? (input.transport === 'csv' ? 'csv'
      : input.transport === 'xml' ? 'xml'
        : input.transport === 'manual_catalog' ? 'canonical_json'
          : input.transport === 'json_api' || input.transport === 'json_feed' ? 'json'
            : undefined);

  if (!inferredFormat) blockers.push('source_format_required');
  if (['feed_url', 'sftp', 'json_api', 'json_feed'].includes(input.transport) && !input.configRef?.trim()) {
    blockers.push('server_config_reference_required');
  }

  return {
    valid: blockers.length === 0,
    blockers,
    normalizationSupported: inferredFormat !== undefined,
    externalAcquisitionEnabled: false,
  };
}
