import type { SupplierAdapterErrorClass, SupplierAdapterResult } from './supplierAdapter';
import { AVASAM_VERIFIED_ENDPOINTS } from './avasamContracts';

export interface AvasamClientConfig {
  baseUrl?: string;
  consumerKey?: string;
  secretKey?: string;
}

export interface AvasamRequestContext {
  correlationId: string;
  idempotencyKey?: string;
}

export interface AvasamTokenResponse {
  access_token: string;
  expires_at: string;
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
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://') || path.includes('\\')) {
    throw new AvasamClientConfigurationError(`${name} must be a relative API path`);
  }
  return path;
}

function buildUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:') {
    throw new AvasamClientConfigurationError('AVASAM_API_BASE_URL must use HTTPS');
  }
  if (base.username || base.password) {
    throw new AvasamClientConfigurationError('AVASAM_API_BASE_URL must not contain embedded credentials');
  }
  return new URL(path, base).toString();
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isValidTokenResponse(value: unknown): value is AvasamTokenResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AvasamTokenResponse>;
  return typeof candidate.access_token === 'string'
    && candidate.access_token.trim().length > 0
    && typeof candidate.expires_at === 'string'
    && candidate.expires_at.trim().length > 0
    && Number.isFinite(Date.parse(candidate.expires_at));
}

const UNVERIFIED_PROVIDER_AUTH_HEADERS = new Set([
  'authorization',
  'authkey',
  'token',
  'x-api-key',
  'api-key',
  'clientid',
  'client-id',
  'consumer_key',
  'secret_key',
]);

function assertNoUnverifiedProviderAuthHeaders(headersInit: HeadersInit | undefined): void {
  if (!headersInit) return;
  const headers = new Headers(headersInit);
  for (const [name] of headers.entries()) {
    if (UNVERIFIED_PROVIDER_AUTH_HEADERS.has(name.toLowerCase())) {
      throw new AvasamClientConfigurationError(
        `Avasam provider auth header '${name}' is blocked until the token transport contract is verified`,
      );
    }
  }
}

export class AvasamClient {
  private readonly config: AvasamClientConfig;

  constructor(config: AvasamClientConfig = {}) {
    this.config = { ...config };
  }

  /**
   * Verified Avasam Seller API authentication contract.
   *
   * Source: Avasam Seller API -> Request-token.
   * POST /api/auth/request-token with JSON consumer_key + secret_key and receive
   * access_token + expires_at. The credentials are never placed in headers,
   * URLs, logs, or provider-facing error messages.
   */
  async requestToken(): Promise<SupplierAdapterResult<AvasamTokenResponse>> {
    try {
      const baseUrl = required(this.config.baseUrl, 'AVASAM_API_BASE_URL');
      const consumerKey = required(this.config.consumerKey, 'AVASAM_CONSUMER_KEY');
      const secretKey = required(this.config.secretKey, 'AVASAM_SECRET_KEY');
      const response = await fetch(buildUrl(baseUrl, AVASAM_VERIFIED_ENDPOINTS.requestToken), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consumer_key: consumerKey,
          secret_key: secretKey,
        }),
      });

      const body = parseJson(await response.text());
      if (response.status === 401 || response.status === 403) {
        return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: `Avasam authentication rejected (${response.status})` };
      }
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'));
        return { ok: false, errorClass: 'RATE_LIMITED', message: 'Avasam authentication rate limited', retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined };
      }
      if (response.status >= 500) {
        return { ok: false, errorClass: 'RETRYABLE_FAILURE', message: `Avasam authentication server failure (${response.status})` };
      }
      if (!response.ok) {
        return { ok: false, errorClass: 'PERMANENT_REJECTION', message: `Avasam authentication request rejected (${response.status})` };
      }
      if (!isValidTokenResponse(body)) {
        return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Avasam authentication returned an invalid token response' };
      }

      return {
        ok: true,
        data: {
          access_token: body.access_token.trim(),
          expires_at: body.expires_at.trim(),
        },
      };
    } catch (error) {
      if (error instanceof AvasamClientConfigurationError) return { ok: false, errorClass: error.errorClass, message: error.message };
      return { ok: false, errorClass: 'RETRYABLE_FAILURE', message: error instanceof Error ? error.message : 'Avasam authentication request failed' };
    }
  }

  private headers(context: AvasamRequestContext): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Correlation-Id': required(context.correlationId, 'correlationId'),
    };
    if (context.idempotencyKey?.trim()) headers['Idempotency-Key'] = context.idempotencyKey.trim();
    return headers;
  }

  /**
   * Generic transport remains intentionally unauthenticated. It may be used for
   * contract/unit testing, but any attempt by a caller to inject a guessed
   * provider auth header is rejected before network access. Once Avasam's exact
   * token transport is verified, that transport must be implemented inside this
   * trusted boundary rather than supplied by callers.
   */
  async request<T>(context: AvasamRequestContext, path: string | undefined, init: RequestInit = {}): Promise<SupplierAdapterResult<T>> {
    try {
      const baseUrl = required(this.config.baseUrl, 'AVASAM_API_BASE_URL');
      const resolvedPath = requiredRelativePath(path, 'Avasam endpoint path configuration');
      assertNoUnverifiedProviderAuthHeaders(init.headers);
      const response = await fetch(buildUrl(baseUrl, resolvedPath), {
        ...init,
        headers: { ...(init.headers || {}), ...this.headers(context) },
      });
      const body = parseJson(await response.text());
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
 * Creates only the verified server-side Avasam authentication boundary.
 * Consumer/secret credentials are used only by requestToken(). Concrete
 * catalog/stock/price token transport remains fail-closed until the documented
 * provider token header/transport contract is verified.
 */
export function avasamClientFromEnvironment(): AvasamClient {
  return new AvasamClient({
    baseUrl: process.env.AVASAM_API_BASE_URL,
    consumerKey: process.env.AVASAM_CONSUMER_KEY,
    secretKey: process.env.AVASAM_SECRET_KEY,
  });
}
