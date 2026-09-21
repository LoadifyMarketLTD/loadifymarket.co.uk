import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import type {
  DirectSupplierFeedTransport,
  DirectSupplierSourceFormat,
} from './_shared/directSupplierContract';
import {
  normalizeDirectSupplierSource,
  type DirectSupplierFieldMapV1,
} from './_shared/directSupplierTransportNormalizer';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const MAX_BODY_BYTES = 2300 * 1024;
const TRANSPORTS = new Set<DirectSupplierFeedTransport>([
  'json_api','json_feed','feed_url','csv','xml','sftp','manual_catalog',
]);
const FORMATS = new Set<DirectSupplierSourceFormat>(['json','csv','xml','canonical_json']);
const FORBIDDEN_KEYS = /^(password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|credential|private[_-]?key|card(number)?)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => FORBIDDEN_KEYS.test(key) || containsForbiddenKey(child));
}

function parseFieldMap(value: unknown): DirectSupplierFieldMapV1 | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error('fieldMap must be an object');
  const required = ['externalProductRef','externalVariantRef','title','currency','amount','warehouseCountry'] as const;
  const optional = ['sku','gtin','stockQuantity','imageUrls','attributes'] as const;
  const map: Partial<DirectSupplierFieldMapV1> = {};
  for (const key of required) {
    if (typeof value[key] !== 'string' || !(value[key] as string).trim()) {
      throw new Error('fieldMap.' + key + ' is required');
    }
    map[key] = (value[key] as string).trim();
  }
  for (const key of optional) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== 'string' || !(value[key] as string).trim()) {
        throw new Error('fieldMap.' + key + ' must be a non-empty string when provided');
      }
      map[key] = (value[key] as string).trim();
    }
  }
  return map as DirectSupplierFieldMapV1;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  if (Buffer.byteLength(event.body || '', 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: 'Normalization preview request is too large' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || '{}') as unknown;
    if (!isRecord(parsed)) throw new Error('body must be an object');
    body = parsed;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  if (containsForbiddenKey(body)) {
    return jsonResponse(400, { error: 'Secrets and provider credentials are not accepted in normalization preview payloads' }, METHODS);
  }

  const supplierKey = typeof body.supplierKey === 'string' ? body.supplierKey.trim().toLowerCase() : '';
  const transport = typeof body.transport === 'string' ? body.transport.trim().toLowerCase() as DirectSupplierFeedTransport : null;
  const sourceFormat = typeof body.sourceFormat === 'string' ? body.sourceFormat.trim().toLowerCase() as DirectSupplierSourceFormat : null;
  const rawPayload = typeof body.rawPayload === 'string' ? body.rawPayload : '';
  if (!supplierKey || !transport || !TRANSPORTS.has(transport) || !sourceFormat || !FORMATS.has(sourceFormat) || !rawPayload) {
    return jsonResponse(400, { error: 'supplierKey, supported transport, sourceFormat and rawPayload are required' }, METHODS);
  }

  let fieldMap: DirectSupplierFieldMapV1 | undefined;
  try {
    fieldMap = parseFieldMap(body.fieldMap);
  } catch (error) {
    return jsonResponse(400, { error: error instanceof Error ? error.message : 'Invalid fieldMap' }, METHODS);
  }

  const amountUnit = body.amountUnit === 'major' ? 'major' : 'minor';
  const digits = typeof body.minorUnitDigits === 'number' && [0,1,2,3].includes(body.minorUnitDigits)
    ? body.minorUnitDigits as 0 | 1 | 2 | 3
    : 2;

  const result = normalizeDirectSupplierSource({
    supplierKey,
    generatedAt: typeof body.generatedAt === 'string' && body.generatedAt.trim()
      ? body.generatedAt
      : new Date().toISOString(),
    transport,
    sourceFormat,
    rawPayload,
    fieldMap,
    amountUnit,
    minorUnitDigits: digits,
    xmlRecordElement: typeof body.xmlRecordElement === 'string' ? body.xmlRecordElement : undefined,
  });

  if (!result.ok) {
    return jsonResponse(400, {
      ok: false,
      errors: result.errors,
      externalAccessPerformed: false,
      persistencePerformed: false,
      marketplaceListingPerformed: false,
    }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    normalization: result,
    nextStep: 'review_canonical_batch_before_staging',
  }, METHODS);
};
