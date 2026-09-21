import type {
  DirectSupplierFeedTransport,
  DirectSupplierSourceFormat,
} from './directSupplierContract';
import type { DirectSupplierFieldMapV1 } from './directSupplierTransportNormalizer';

export interface SupplierAcquisitionNormalizationConfig {
  fieldMap?: DirectSupplierFieldMapV1;
  amountUnit?: 'minor' | 'major';
  minorUnitDigits?: 0 | 1 | 2 | 3;
  xmlRecordElement?: string;
}

export interface HttpSupplierAcquisitionConfig extends SupplierAcquisitionNormalizationConfig {
  kind: 'http';
  supplierKey: string;
  transport: 'json_api' | 'json_feed' | 'feed_url';
  sourceFormat: DirectSupplierSourceFormat;
  url: string;
  allowedHosts: string[];
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
}

export interface SftpSupplierAcquisitionConfig extends SupplierAcquisitionNormalizationConfig {
  kind: 'sftp';
  supplierKey: string;
  transport: 'sftp';
  sourceFormat: DirectSupplierSourceFormat;
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  hostKeySha256: string;
  remotePath: string;
  timeoutMs?: number;
  maxBytes?: number;
}

export type SupplierAcquisitionConfig =
  | HttpSupplierAcquisitionConfig
  | SftpSupplierAcquisitionConfig;

export type SupplierAcquisitionConfigResult =
  | { ok: true; envName: string; config: SupplierAcquisitionConfig }
  | { ok: false; code: string; error: string };

const CONFIG_REF_RE = /^env:([A-Z][A-Z0-9_]{2,127})$/;
const HOST_RE = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const SOURCE_FORMATS = new Set<DirectSupplierSourceFormat>(['json','csv','xml','canonical_json']);
const HTTP_TRANSPORTS = new Set<DirectSupplierFeedTransport>(['json_api','json_feed','feed_url']);
const FORBIDDEN_HEADERS = new Set([
  'connection','content-length','cookie','host','proxy-authorization',
  'te','trailer','transfer-encoding','upgrade',
]);
const MAX_HEADERS = 24;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 15000;
const MIN_BYTES = 1024;
const MAX_BYTES = 2 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseNormalization(value: Record<string, unknown>, errors: string[]): SupplierAcquisitionNormalizationConfig {
  const result: SupplierAcquisitionNormalizationConfig = {};
  if (value.amountUnit !== undefined) {
    if (value.amountUnit !== 'minor' && value.amountUnit !== 'major') errors.push('amountUnit is invalid');
    else result.amountUnit = value.amountUnit;
  }
  if (value.minorUnitDigits !== undefined) {
    if (![0,1,2,3].includes(Number(value.minorUnitDigits))) errors.push('minorUnitDigits is invalid');
    else result.minorUnitDigits = Number(value.minorUnitDigits) as 0 | 1 | 2 | 3;
  }
  if (value.xmlRecordElement !== undefined) {
    const element = stringValue(value.xmlRecordElement);
    if (!element || !/^[A-Za-z_][A-Za-z0-9_.:-]{0,63}$/.test(element)) errors.push('xmlRecordElement is invalid');
    else result.xmlRecordElement = element;
  }
  if (value.fieldMap !== undefined) {
    if (!isRecord(value.fieldMap)) {
      errors.push('fieldMap must be an object');
    } else {
      const required = ['externalProductRef','externalVariantRef','title','currency','amount','warehouseCountry'] as const;
      const optional = ['sku','gtin','stockQuantity','imageUrls','attributes'] as const;
      const map: Partial<DirectSupplierFieldMapV1> = {};
      for (const key of required) {
        const item = stringValue(value.fieldMap[key]);
        if (!item) errors.push('fieldMap.' + key + ' is required');
        else map[key] = item;
      }
      for (const key of optional) {
        if (value.fieldMap[key] !== undefined) {
          const item = stringValue(value.fieldMap[key]);
          if (!item) errors.push('fieldMap.' + key + ' must be a non-empty string');
          else map[key] = item;
        }
      }
      if (errors.length === 0) result.fieldMap = map as DirectSupplierFieldMapV1;
    }
  }
  return result;
}

function parseCommon(value: Record<string, unknown>, errors: string[]) {
  const supplierKey = stringValue(value.supplierKey)?.toLowerCase();
  const transport = stringValue(value.transport)?.toLowerCase() as DirectSupplierFeedTransport | undefined;
  const sourceFormat = stringValue(value.sourceFormat)?.toLowerCase() as DirectSupplierSourceFormat | undefined;
  if (!supplierKey || !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(supplierKey)) errors.push('supplierKey is invalid');
  if (!transport) errors.push('transport is required');
  if (!sourceFormat || !SOURCE_FORMATS.has(sourceFormat)) errors.push('sourceFormat is invalid');
  const timeout = numberValue(value.timeoutMs);
  const maxBytes = numberValue(value.maxBytes);
  if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < MIN_TIMEOUT_MS || timeout > MAX_TIMEOUT_MS)) {
    errors.push('timeoutMs is outside the allowed range');
  }
  if (maxBytes !== undefined && (!Number.isInteger(maxBytes) || maxBytes < MIN_BYTES || maxBytes > MAX_BYTES)) {
    errors.push('maxBytes is outside the allowed range');
  }
  return {
    supplierKey,
    transport,
    sourceFormat,
    timeoutMs: timeout ?? 10000,
    maxBytes: maxBytes ?? MAX_BYTES,
    ...parseNormalization(value, errors),
  };
}

function parseHttp(value: Record<string, unknown>, errors: string[]): HttpSupplierAcquisitionConfig | undefined {
  const common = parseCommon(value, errors);
  if (!common.transport || !HTTP_TRANSPORTS.has(common.transport)) errors.push('HTTP config transport is invalid');
  const url = stringValue(value.url);
  if (!url) errors.push('url is required');
  let hostname = '';
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
        errors.push('url must be credential-free HTTPS without fragments');
      }
      hostname = parsed.hostname.toLowerCase();
    } catch {
      errors.push('url is invalid');
    }
  }
  const allowedHosts = Array.isArray(value.allowedHosts)
    ? value.allowedHosts.filter((item): item is string => typeof item === 'string').map(item => item.trim().toLowerCase()).filter(Boolean)
    : [];
  if (allowedHosts.length === 0 || allowedHosts.length > 16 || allowedHosts.some(host => !HOST_RE.test(host))) {
    errors.push('allowedHosts must contain 1 to 16 valid host names');
  }
  if (hostname && !allowedHosts.includes(hostname)) errors.push('url host is not allowlisted');

  const headers: Record<string, string> = {};
  if (value.headers !== undefined) {
    if (!isRecord(value.headers) || Object.keys(value.headers).length > MAX_HEADERS) {
      errors.push('headers are invalid');
    } else {
      for (const [rawName, rawValue] of Object.entries(value.headers)) {
        const name = rawName.trim().toLowerCase();
        if (!/^[a-z0-9!#$%&'*+.^_`|~-]{1,64}$/.test(name) || FORBIDDEN_HEADERS.has(name)) {
          errors.push('header name is not allowed');
          continue;
        }
        if (typeof rawValue !== 'string' || rawValue.length > 4096 || /[\r\n]/.test(rawValue)) {
          errors.push('header value is invalid');
          continue;
        }
        headers[name] = rawValue;
      }
    }
  }
  if (errors.length > 0 || !common.supplierKey || !common.transport || !common.sourceFormat || !url) return undefined;
  return {
    kind: 'http',
    supplierKey: common.supplierKey,
    transport: common.transport as HttpSupplierAcquisitionConfig['transport'],
    sourceFormat: common.sourceFormat,
    url,
    allowedHosts,
    headers: Object.keys(headers).length ? headers : undefined,
    timeoutMs: common.timeoutMs,
    maxBytes: common.maxBytes,
    fieldMap: common.fieldMap,
    amountUnit: common.amountUnit,
    minorUnitDigits: common.minorUnitDigits,
    xmlRecordElement: common.xmlRecordElement,
  };
}

function parseSftp(value: Record<string, unknown>, errors: string[]): SftpSupplierAcquisitionConfig | undefined {
  const common = parseCommon(value, errors);
  if (common.transport !== 'sftp') errors.push('SFTP config transport must be sftp');
  const host = stringValue(value.host)?.toLowerCase();
  const username = stringValue(value.username);
  const password = stringValue(value.password);
  const privateKey = stringValue(value.privateKey);
  const passphrase = stringValue(value.passphrase);
  const hostKeySha256 = stringValue(value.hostKeySha256)?.toLowerCase();
  const remotePath = stringValue(value.remotePath);
  const port = numberValue(value.port) ?? 22;

  if (!host || !HOST_RE.test(host)) errors.push('SFTP host is invalid');
  if (!username || username.length > 128) errors.push('SFTP username is invalid');
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('SFTP port is invalid');
  if ((!password && !privateKey) || (password && privateKey)) errors.push('SFTP requires exactly one authentication method');
  if (passphrase && !privateKey) errors.push('SFTP passphrase requires privateKey authentication');
  if (!hostKeySha256 || !/^[0-9a-f]{64}$/.test(hostKeySha256)) errors.push('SFTP hostKeySha256 must be a SHA-256 hex digest');
  if (!remotePath || !remotePath.startsWith('/') || remotePath.includes('..') || remotePath.length > 1024) {
    errors.push('SFTP remotePath is invalid');
  }

  if (errors.length > 0 || !common.supplierKey || common.transport !== 'sftp' || !common.sourceFormat || !host || !username || !hostKeySha256 || !remotePath) {
    return undefined;
  }
  return {
    kind: 'sftp',
    supplierKey: common.supplierKey,
    transport: 'sftp',
    sourceFormat: common.sourceFormat,
    host,
    port,
    username,
    password,
    privateKey,
    passphrase,
    hostKeySha256,
    remotePath,
    timeoutMs: common.timeoutMs,
    maxBytes: common.maxBytes,
    fieldMap: common.fieldMap,
    amountUnit: common.amountUnit,
    minorUnitDigits: common.minorUnitDigits,
    xmlRecordElement: common.xmlRecordElement,
  };
}

export function resolveSupplierAcquisitionConfig(configRef: string): SupplierAcquisitionConfigResult {
  const match = CONFIG_REF_RE.exec(configRef.trim());
  if (!match) return { ok: false, code: 'CONFIG_REF_INVALID', error: 'Server acquisition config reference is invalid' };
  const envName = match[1];
  const raw = process.env[envName];
  if (!raw) return { ok: false, code: 'CONFIG_NOT_PROVISIONED', error: 'Server acquisition config is not provisioned' };

  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, code: 'CONFIG_INVALID_JSON', error: 'Server acquisition config is invalid' };
  }
  if (!isRecord(value)) return { ok: false, code: 'CONFIG_INVALID', error: 'Server acquisition config is invalid' };

  const errors: string[] = [];
  const kind = stringValue(value.kind)?.toLowerCase();
  const config = kind === 'http'
    ? parseHttp(value, errors)
    : kind === 'sftp'
      ? parseSftp(value, errors)
      : undefined;
  if (!config || errors.length > 0) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Server acquisition config failed validation: ' + [...new Set(errors)].join('; ') };
  }
  return { ok: true, envName, config };
}
