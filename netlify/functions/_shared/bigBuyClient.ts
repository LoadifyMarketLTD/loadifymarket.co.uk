import type { SupplierAdapterResult } from './supplierAdapter';

export type BigBuyEnvironment = 'sandbox' | 'production';

const BIGBUY_BASE_URLS: Record<BigBuyEnvironment, string> = {
  sandbox: 'https://api.sandbox.bigbuy.eu',
  production: 'https://api.bigbuy.eu',
};

export interface BigBuyClientConfig {
  environment?: BigBuyEnvironment | string;
  apiKey?: string;
}

export interface BigBuyRequestContext {
  correlationId: string;
}

const RESERVED_HEADERS = new Set([
  'authorization',
  'x-correlation-id',
]);

function normalizeEnvironment(value: string | undefined): BigBuyEnvironment | null {
  const normalized = (value ?? 'sandbox').trim().toLowerCase();
  if (normalized === 'sandbox' || normalized === 'production') return normalized;
  return null;
}

function mapFailure(status: number, message: string): SupplierAdapterResult<never> {
  if (status === 401 || status === 403) {
    return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message };
  }
  if (status === 429) {
    return { ok: false, errorClass: 'RATE_LIMITED', message };
  }
  if (status >= 500) {
    return { ok: false, errorClass: 'RETRYABLE_FAILURE', message };
  }
  return { ok: false, errorClass: 'PERMANENT_REJECTION', message };
}

/**
 * BigBuy transport scaffold restricted to read-only GET requests.
 *
 * The official BigBuy guide documents Bearer API-key authentication and fixed
 * sandbox/production hosts. This client owns those values so callers cannot
 * replace the trusted host or authentication transport. Write requests are
 * deliberately rejected until a separate commercial/PII order gate exists.
 */
export class BigBuyClient {
  private readonly environment: string;
  private readonly apiKey: string;

  constructor(config: BigBuyClientConfig = {}) {
    this.environment = config.environment ?? 'sandbox';
    this.apiKey = config.apiKey?.trim() ?? '';
  }

  async request<T>(
    context: BigBuyRequestContext,
    path: string,
    init: RequestInit = {},
  ): Promise<SupplierAdapterResult<T>> {
    if (!context.correlationId.trim()) {
      return {
        ok: false,
        errorClass: 'AUTH_CONFIGURATION_FAILURE',
        message: 'BigBuy requests require a correlation id',
      };
    }

    const environment = normalizeEnvironment(this.environment);
    if (!environment) {
      return {
        ok: false,
        errorClass: 'AUTH_CONFIGURATION_FAILURE',
        message: 'BIGBUY_API_ENVIRONMENT must be sandbox or production',
      };
    }

    if (!this.apiKey) {
      return {
        ok: false,
        errorClass: 'AUTH_CONFIGURATION_FAILURE',
        message: 'BigBuy API key is not configured',
      };
    }

    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /^https?:/i.test(path)) {
      return {
        ok: false,
        errorClass: 'AUTH_CONFIGURATION_FAILURE',
        message: 'BigBuy endpoint path must be a trusted relative API path',
      };
    }

    const method = (init.method ?? 'GET').toUpperCase();
    if (method !== 'GET') {
      return {
        ok: false,
        errorClass: 'CAPABILITY_UNAVAILABLE',
        message: 'BigBuy write requests are not enabled in the read-only scaffold',
      };
    }

    const callerHeaders = new Headers(init.headers);
    for (const name of RESERVED_HEADERS) {
      if (callerHeaders.has(name)) {
        return {
          ok: false,
          errorClass: 'AUTH_CONFIGURATION_FAILURE',
          message: `BigBuy callers cannot override reserved header '${name}'`,
        };
      }
    }

    const headers = new Headers(callerHeaders);
    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('X-Correlation-Id', context.correlationId.trim());

    try {
      const response = await fetch(`${BIGBUY_BASE_URLS[environment]}${path}`, {
        ...init,
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return mapFailure(response.status, `BigBuy request failed with HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        return {
          ok: false,
          errorClass: 'MALFORMED_RESPONSE',
          message: 'BigBuy successful response was not JSON',
        };
      }

      try {
        return { ok: true, data: await response.json() as T };
      } catch {
        return {
          ok: false,
          errorClass: 'MALFORMED_RESPONSE',
          message: 'BigBuy returned invalid JSON',
        };
      }
    } catch (error) {
      return {
        ok: false,
        errorClass: 'RETRYABLE_FAILURE',
        message: error instanceof Error ? error.message : 'BigBuy network request failed',
      };
    }
  }
}

export function bigBuyClientFromEnvironment(): BigBuyClient {
  return new BigBuyClient({
    environment: process.env.BIGBUY_API_ENVIRONMENT ?? 'sandbox',
    apiKey: process.env.BIGBUY_API_KEY,
  });
}
