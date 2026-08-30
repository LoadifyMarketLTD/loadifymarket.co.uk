import type { SupplierAdapterResult } from './supplierAdapter';
import type { AvasamTokenResponse } from './avasamClient';

export interface AvasamTokenRequester {
  requestToken(): Promise<SupplierAdapterResult<AvasamTokenResponse>>;
}

/**
 * Server-memory token lifecycle for the verified Avasam request-token contract.
 *
 * Avasam documents that access_token should be stored for repeated calls until
 * expires_at and a new token requested after expiry. This manager intentionally
 * does not persist the token to the database, filesystem, logs, or client state.
 */
export class AvasamTokenManager {
  private cached: AvasamTokenResponse | null = null;

  constructor(private readonly requester: AvasamTokenRequester) {}

  peek(nowMs = Date.now()): AvasamTokenResponse | null {
    if (!this.cached) return null;
    const expiresAtMs = Date.parse(this.cached.expires_at);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
      this.cached = null;
      return null;
    }
    return { ...this.cached };
  }

  async getValidToken(nowMs = Date.now()): Promise<SupplierAdapterResult<AvasamTokenResponse>> {
    const existing = this.peek(nowMs);
    if (existing) return { ok: true, data: existing };

    const result = await this.requester.requestToken();
    if (!result.ok) return result;

    const expiresAtMs = Date.parse(result.data.expires_at);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
      return {
        ok: false,
        errorClass: 'MALFORMED_RESPONSE',
        message: 'Avasam authentication returned an already-expired token',
      };
    }

    this.cached = {
      access_token: result.data.access_token,
      expires_at: result.data.expires_at,
    };
    return { ok: true, data: { ...this.cached } };
  }

  invalidate(): void {
    this.cached = null;
  }
}
