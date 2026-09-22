import type { SupplierAdapterCapability } from './supplierAdapter';
import type { SupplierIntegrationTransport } from './supplierIntegrationRuntime';

export interface SupplierRuntimeHttpConfig {
  kind: 'http_rest' | 'graphql';
  supplierKey: string;
  capability: SupplierAdapterCapability;
  url: string;
  allowedHosts: string[];
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  graphqlDocument?: string;
  graphqlOperationName?: string;
}

export type SupplierRuntimeConfigResult =
  | { ok: true; envName: string; config: SupplierRuntimeHttpConfig }
  | { ok: false; code: string; error: string };

const CONFIG_REF_RE = /^env:([A-Z][A-Z0-9_]{2,127})$/;
const HOST_RE = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const CAPABILITIES = new Set<SupplierAdapterCapability>([
  'supplier_identity','catalog','variants','stock','price','shipping',
  'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement',
]);
const FORBIDDEN_HEADERS = new Set([
  'connection','content-length','cookie','host','proxy-authorization',
  'te','trailer','transfer-encoding','upgrade',
]);
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 15000;
const MIN_BYTES = 1024;
const MAX_BYTES = 2 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function resolveSupplierRuntimeConfig(
  configRef: string,
  expected: {
    supplierKey: string;
    capability: SupplierAdapterCapability;
    transport: SupplierIntegrationTransport;
  },
): SupplierRuntimeConfigResult {
  const match = CONFIG_REF_RE.exec(configRef.trim());
  if (!match) return { ok: false, code: 'CONFIG_REF_INVALID', error: 'Supplier runtime config reference is invalid' };
  const envName = match[1];
  const raw = process.env[envName];
  if (!raw) return { ok: false, code: 'CONFIG_NOT_PROVISIONED', error: 'Supplier runtime config is not provisioned' };

  let value: unknown;
  try { value = JSON.parse(raw) as unknown; }
  catch { return { ok: false, code: 'CONFIG_INVALID_JSON', error: 'Supplier runtime config is invalid JSON' }; }
  if (!isRecord(value)) return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime config must be an object' };

  const kind = stringValue(value.kind) as 'http_rest' | 'graphql' | undefined;
  const supplierKey = stringValue(value.supplierKey)?.toLowerCase();
  const capability = stringValue(value.capability) as SupplierAdapterCapability | undefined;
  const url = stringValue(value.url);
  if ((kind !== 'http_rest' && kind !== 'graphql') || kind !== expected.transport) {
    return { ok: false, code: 'CONFIG_BINDING_MISMATCH', error: 'Supplier runtime transport does not match binding' };
  }
  if (!supplierKey || supplierKey !== expected.supplierKey.toLowerCase()) {
    return { ok: false, code: 'CONFIG_BINDING_MISMATCH', error: 'Supplier runtime supplier key does not match binding' };
  }
  if (!capability || !CAPABILITIES.has(capability) || capability !== expected.capability) {
    return { ok: false, code: 'CONFIG_BINDING_MISMATCH', error: 'Supplier runtime capability does not match binding' };
  }
  if (!url) return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime URL is required' };

  let host = '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
      return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime URL must be credential-free HTTPS without fragments' };
    }
    host = parsed.hostname.toLowerCase();
  } catch {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime URL is invalid' };
  }

  const allowedHosts = Array.isArray(value.allowedHosts)
    ? value.allowedHosts.filter((item): item is string => typeof item === 'string').map(item => item.trim().toLowerCase()).filter(Boolean)
    : [];
  if (allowedHosts.length < 1 || allowedHosts.length > 16 || allowedHosts.some(item => !HOST_RE.test(item)) || !allowedHosts.includes(host)) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime host allowlist is invalid' };
  }

  const methodRaw = stringValue(value.method)?.toUpperCase();
  const method = (methodRaw ?? (kind === 'graphql' ? 'POST' : 'GET')) as SupplierRuntimeHttpConfig['method'];
  if (!['GET','POST','PUT','PATCH','DELETE'].includes(method)) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime HTTP method is invalid' };
  }
  if (kind === 'graphql' && method !== 'POST') {
    return { ok: false, code: 'CONFIG_INVALID', error: 'GraphQL runtime requires POST' };
  }

  const timeoutMs = numberValue(value.timeoutMs) ?? 10000;
  const maxBytes = numberValue(value.maxBytes) ?? MAX_BYTES;
  if (!Number.isInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime timeout is outside the allowed range' };
  }
  if (!Number.isInteger(maxBytes) || maxBytes < MIN_BYTES || maxBytes > MAX_BYTES) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime maxBytes is outside the allowed range' };
  }

  const headers: Record<string, string> = {};
  if (value.headers !== undefined) {
    if (!isRecord(value.headers) || Object.keys(value.headers).length > 24) {
      return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime headers are invalid' };
    }
    for (const [rawName, rawValue] of Object.entries(value.headers)) {
      const name = rawName.trim().toLowerCase();
      if (!/^[a-z0-9!#$%&'*+.^_`|~-]{1,64}$/.test(name) || FORBIDDEN_HEADERS.has(name)) {
        return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime header name is not allowed' };
      }
      if (typeof rawValue !== 'string' || rawValue.length > 4096 || /[\r\n]/.test(rawValue)) {
        return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier runtime header value is invalid' };
      }
      headers[name] = rawValue;
    }
  }

  const graphqlDocument = kind === 'graphql' ? stringValue(value.graphqlDocument) : undefined;
  if (kind === 'graphql' && (!graphqlDocument || graphqlDocument.length > 20000)) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'GraphQL document is required and must be bounded' };
  }

  return {
    ok: true,
    envName,
    config: {
      kind,
      supplierKey,
      capability,
      url,
      allowedHosts,
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      timeoutMs,
      maxBytes,
      graphqlDocument,
      graphqlOperationName: kind === 'graphql' ? stringValue(value.graphqlOperationName) : undefined,
    },
  };
}
