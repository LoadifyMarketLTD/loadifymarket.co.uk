import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { jsonResponse, optionsResponse } from './_shared/http';
import { resolveSupplierWebhookConfig, verifySupplierWebhookRequest } from './_shared/supplierWebhookRuntime';

const METHODS = 'POST, OPTIONS';
const MAX_BODY_BYTES = 512 * 1024;
const CAPABILITIES = new Set(['acknowledgement','tracking','returns','reimbursement']);

type JsonRecord = Record<string, unknown>;

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getPath(value: unknown, path: string): unknown {
  if (!path.trim()) return value;
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, value);
}

function mappingText(mapping: JsonRecord, key: string): string {
  return typeof mapping[key] === 'string' ? String(mapping[key]).trim() : '';
}

function readMapped(payload: unknown, mapping: JsonRecord, key: string): unknown {
  const fields = isRecord(mapping.fields) ? mapping.fields : {};
  const path = typeof fields[key] === 'string' ? String(fields[key]).trim() : '';
  return path ? getPath(payload, path) : undefined;
}

function mapState(value: unknown, mapping: JsonRecord): string {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const stateMap = isRecord(mapping.stateMap) ? mapping.stateMap : {};
  const mapped = typeof stateMap[raw] === 'string' ? String(stateMap[raw]) : raw;
  return mapped.trim().toLowerCase();
}

function canonicalPayload(capability: string, payload: unknown, mapping: JsonRecord): JsonRecord | null {
  if (capability === 'acknowledgement') {
    const handshakeId = readMapped(payload, mapping, 'handshakeId');
    const supplierOrderRef = readMapped(payload, mapping, 'supplierOrderRef');
    const state = mapState(readMapped(payload, mapping, 'state'), mapping);
    if (typeof handshakeId !== 'string' || !handshakeId.trim() || !['accepted','pending','rejected','unknown'].includes(state)) return null;
    return {
      handshakeId: handshakeId.trim(),
      state,
      ...(supplierOrderRef !== undefined ? { supplierOrderRef: String(supplierOrderRef).trim() } : {}),
    };
  }

  if (capability === 'tracking') {
    const handshakeId = readMapped(payload, mapping, 'handshakeId');
    const status = mapState(readMapped(payload, mapping, 'status'), mapping);
    if (typeof handshakeId !== 'string' || !handshakeId.trim() || !status) return null;
    const carrierRef = readMapped(payload, mapping, 'carrierRef');
    const trackingRef = readMapped(payload, mapping, 'trackingRef');
    return {
      handshakeId: handshakeId.trim(),
      status,
      ...(carrierRef !== undefined ? { carrierRef: String(carrierRef).trim() } : {}),
      ...(trackingRef !== undefined ? { trackingRef: String(trackingRef).trim() } : {}),
    };
  }

  if (capability === 'returns') {
    const returnCaseId = readMapped(payload, mapping, 'returnCaseId');
    const externalReturnRef = readMapped(payload, mapping, 'externalReturnRef');
    const authorisedRaw = readMapped(payload, mapping, 'authorised');
    const authorised = authorisedRaw === true || ['true','1','yes','approved','authorised','authorized'].includes(String(authorisedRaw ?? '').toLowerCase());
    if (typeof returnCaseId !== 'string' || !returnCaseId.trim()) return null;
    return {
      returnCaseId: returnCaseId.trim(),
      authorised,
      ...(externalReturnRef !== undefined ? { externalReturnRef: String(externalReturnRef).trim() } : {}),
    };
  }

  const returnCaseId = readMapped(payload, mapping, 'returnCaseId');
  const amountMinorRaw = readMapped(payload, mapping, 'amountMinor');
  const amountMinor = Number(amountMinorRaw);
  const currency = String(readMapped(payload, mapping, 'currency') ?? '').trim().toUpperCase();
  const state = mapState(readMapped(payload, mapping, 'state'), mapping);
  const externalRecoveryRef = readMapped(payload, mapping, 'externalRecoveryRef');
  if (typeof returnCaseId !== 'string' || !returnCaseId.trim() || !Number.isSafeInteger(amountMinor) || amountMinor < 0 || currency !== 'GBP' || !state) return null;
  return {
    returnCaseId: returnCaseId.trim(),
    amountMinor,
    currency,
    state,
    ...(externalRecoveryRef !== undefined ? { externalRecoveryRef: String(externalRecoveryRef).trim() } : {}),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  if (!enabled(process.env.DIRECT_SUPPLIER_OPERATIONAL_WEBHOOK_ENABLED)) {
    return jsonResponse(404, { error: 'Not found' }, METHODS);
  }

  const supplierKey = (event.queryStringParameters?.supplier || '').trim().toLowerCase();
  const capability = (event.queryStringParameters?.capability || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(supplierKey) || !CAPABILITIES.has(capability)) {
    return jsonResponse(404, { error: 'Not found' }, METHODS);
  }

  const rawBody = event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: 'Supplier webhook payload is too large' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(503, { error: 'Supplier webhook is unavailable' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: bindingRaw, error: bindingError } = await admin.rpc('server_direct_supplier_webhook_binding_v1', {
    p_supplier_key: supplierKey,
    p_capability: capability,
    p_territory: 'GB',
  });
  if (bindingError || !isRecord(bindingRaw) || bindingRaw.eligible !== true) {
    return jsonResponse(404, { error: 'Not found' }, METHODS);
  }

  const configRef = typeof bindingRaw.configRef === 'string' ? bindingRaw.configRef.trim() : '';
  const mapping = isRecord(bindingRaw.mapping) ? bindingRaw.mapping : {};
  const resolved = resolveSupplierWebhookConfig(configRef, supplierKey);
  if (!resolved.ok) {
    console.error('direct-supplier-operational-webhook: configuration rejected', resolved.code);
    return jsonResponse(503, { error: 'Supplier webhook is unavailable' }, METHODS);
  }

  const headers: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(event.headers)) headers[name.toLowerCase()] = value;
  const verified = verifySupplierWebhookRequest({ config: resolved.config, headers, rawBody });
  if (!verified.ok) {
    return jsonResponse(401, { error: 'Supplier webhook authentication failed' }, METHODS);
  }

  let parsed: unknown;
  try { parsed = JSON.parse(rawBody) as unknown; }
  catch { return jsonResponse(400, { error: 'Supplier webhook payload must be valid JSON' }, METHODS); }

  const eventIdPath = mappingText(mapping, 'eventIdPath');
  const occurredAtPath = mappingText(mapping, 'occurredAtPath');
  const payloadPath = mappingText(mapping, 'payloadPath');
  const eventIdValue = eventIdPath ? getPath(parsed, eventIdPath) : undefined;
  const occurredAtValue = occurredAtPath ? getPath(parsed, occurredAtPath) : undefined;
  const sourcePayload = payloadPath ? getPath(parsed, payloadPath) : parsed;

  const eventId = typeof eventIdValue === 'string' || typeof eventIdValue === 'number' ? String(eventIdValue).trim() : '';
  const occurredAt = typeof occurredAtValue === 'string' ? occurredAtValue.trim() : '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(eventId) || !Number.isFinite(Date.parse(occurredAt))) {
    return jsonResponse(400, { error: 'Supplier webhook event identity is invalid' }, METHODS);
  }

  const canonical = canonicalPayload(capability, sourcePayload, mapping);
  if (!canonical) return jsonResponse(400, { error: 'Supplier webhook payload mapping is incomplete' }, METHODS);

  try {
    const { data, error } = await admin.rpc('server_process_direct_supplier_operational_event_v1', {
      p_supplier_key: supplierKey,
      p_capability: capability,
      p_event_id: eventId,
      p_occurred_at: new Date(occurredAt).toISOString(),
      p_payload: canonical,
    });
    if (error) {
      console.error('direct-supplier-operational-webhook: canonical processing failed', error.message);
      return jsonResponse(409, { error: 'Supplier webhook event was rejected' }, METHODS);
    }
    const result = isRecord(data) ? data : {};
    return jsonResponse(202, {
      ok: result.ok === true,
      replayed: result.replayed === true,
      processed: result.processed === true,
      customerPiiStored: false,
      commerceActivationPerformed: false,
    }, METHODS);
  } catch (error) {
    console.error('direct-supplier-operational-webhook: processing unavailable', error instanceof Error ? error.message : 'unknown');
    return jsonResponse(503, { error: 'Supplier webhook processing unavailable' }, METHODS);
  }
};
