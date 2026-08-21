import type { SupplierAdapterErrorClass, SupplierAdapterResult } from './supplierAdapter';

export interface AvasamClientConfig {
  baseUrl?: string;
  apiToken?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

export interface AvasamRequestContext {
  correlationId: string;
  idempotencyKey?: string;
}

export class AvasamClientConfigurationError extends Error {
  readonly errorClass: SupplierAdapterErrorClass = 'AUTH_CONFIGURATION_FAILURE';
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new AvasamClientConfigurationError(`Missing ${name}`);
  return value.trim();
}

function requiredRelativePath(value: string | undefined, name: string): string {
  const path = required(value, name);
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    throw new AvasamClientConfigurationError(`${name} must be a relative API path`);
  }
  return path;
}

function buildUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:') {
    throw new AvasamClientConfigurationError('AVASAM_API_BASE_URL must use HTTPS');
  }
  return new URL(path, base).toString();
}

export class AvasamClient {
  private readonly config: AvasamClientConfig;

  constructor(config: AvasamClientConfig = {}) {
    this.config = { ...config };
  }

  private headers(context: AvasamRequestContext): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Correlation-Id': required(context.correlationId, 'correlationId'),
    };
    if (context.idempotencyKey?.trim()) headers['Idempotency-Key'] = context.idempotencyKey.trim();
    if (this.config.apiToken?.trim()) headers.Authorization = `Bearer ${this.config.apiToken.trim()}`;
    if (this.config.apiKey?.trim()) headers[this.config.apiKeyHeader?.trim() || 'X-API-Key'] = this.config.apiKey.trim();
    return headers;
  }

  async request<T>(context: AvasamRequestContext, path: string | undefined, init: RequestInit = {}): Promise<SupplierAdapterResult<T>> {
    try {
      const baseUrl = required(this.config.baseUrl, 'AVASAM_API_BASE_URL');
      const resolvedPath = requiredRelativePath(path, 'Avasam endpoint path configuration');
      const response = await fetch(buildUrl(baseUrl, resolvedPath), {
        ...init,
        // Provider authentication and correlation/idempotency headers are owned
        // by this boundary and cannot be replaced by provider-callers.
        headers: { ...(init.headers || {}), ...this.headers(context) },
      });
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try { body = JSON.parse(text); } catch { body = text; }
      }
      if (response.ok) return { ok: true, data: body as T };
      if (response.status === 401 || response.status === 403) return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: `Avasam authentication rejected (${response.status})` };
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'));
        return { ok: false, errorClass: 'RATE_LIMITED', message: 'Avasam rate limit reached', retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined };
      }
      if (response.status >= 400 && response.status < 500) return { ok: false, errorClass: 'PERMANENT_REJECTION', message: `Avasam request rejected (${response.status})` };
      if (response.status >= 500) return { ok: false, errorClass: 'RETRYABLE_FAILURE', message: `Avasam server failure (${response.status})` };
      return { ok: false, errorClass: 'UNKNOWN_OUTCOME', message: 'Avasam returned an unclassified response' };
    } catch (error) {
      if (error instanceof AvasamClientConfigurationError) return { ok: false, errorClass: error.errorClass, message: error.message };
      return { ok: false, errorClass: 'RETRYABLE_FAILURE', message: error instanceof Error ? error.message : 'Avasam request failed' };
    }
  }
}

/**
 * Creates only the transport/auth boundary. Concrete catalog/order/etc. paths
 * are deliberately excluded until verified against Avasam's provider contract.
 */
export function avasamClientFromEnvironment(): AvasamClient {
  return new AvasamClient({
    baseUrl: process.env.AVASAM_API_BASE_URL,
    apiToken: process.env.AVASAM_API_TOKEN,
    apiKey: process.env.AVASAM_API_KEY,
    apiKeyHeader: process.env.AVASAM_API_KEY_HEADER,
  });
}
