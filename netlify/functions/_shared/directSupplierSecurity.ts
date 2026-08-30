import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TOLERANCE_SECONDS = 300;
const SIGNATURE_PREFIX = 'v1=';

export type DirectSupplierWebhookVerificationResult =
  | { ok: true; timestampSeconds: number }
  | { ok: false; reason: 'MISSING_SECRET' | 'INVALID_TIMESTAMP' | 'STALE_TIMESTAMP' | 'INVALID_SIGNATURE' };

export interface DirectSupplierReplayStore {
  /**
   * Atomically records an event id until expiresAt. Returns false when the event
   * id was already claimed. Production implementations must use durable shared
   * storage; process memory alone is not a sufficient replay boundary.
   */
  claim(eventId: string, expiresAt: Date): Promise<boolean>;
}

function parseTimestampSeconds(value: string): number | null {
  if (!/^\d{10}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function signatureHex(value: string): string | null {
  if (!value.startsWith(SIGNATURE_PREFIX)) return null;
  const hex = value.slice(SIGNATURE_PREFIX.length).trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(hex) ? hex : null;
}

export function computeDirectSupplierWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');
  return `${SIGNATURE_PREFIX}${digest}`;
}

/**
 * Verifies a Direct Supplier webhook signature over the exact raw request body.
 *
 * The signature format is `v1=<hex HMAC-SHA256>` over `<timestamp>.<rawBody>`.
 * This verifier does not parse JSON and therefore cannot accidentally verify a
 * re-serialized body that differs from the bytes sent by the supplier.
 */
export function verifyDirectSupplierWebhookSignature(input: {
  secret: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  now?: Date;
  toleranceSeconds?: number;
}): DirectSupplierWebhookVerificationResult {
  const secret = input.secret?.trim() ?? '';
  if (secret.length < 32) return { ok: false, reason: 'MISSING_SECRET' };

  const timestampText = input.timestamp?.trim() ?? '';
  const timestampSeconds = parseTimestampSeconds(timestampText);
  if (timestampSeconds === null) return { ok: false, reason: 'INVALID_TIMESTAMP' };

  const tolerance = input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (!Number.isSafeInteger(tolerance) || tolerance < 1 || tolerance > 3600) {
    return { ok: false, reason: 'INVALID_TIMESTAMP' };
  }

  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
    return { ok: false, reason: 'STALE_TIMESTAMP' };
  }

  const suppliedHex = signatureHex(input.signature?.trim() ?? '');
  if (!suppliedHex) return { ok: false, reason: 'INVALID_SIGNATURE' };

  const expected = computeDirectSupplierWebhookSignature(secret, timestampText, input.rawBody)
    .slice(SIGNATURE_PREFIX.length);
  const suppliedBuffer = Buffer.from(suppliedHex, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return { ok: false, reason: 'INVALID_SIGNATURE' };
  }

  return { ok: true, timestampSeconds };
}

export type DirectSupplierWebhookClaimResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID_EVENT_ID' | 'REPLAYED_EVENT' };

/**
 * Claims the provider event id in durable storage after signature verification.
 * Callers must verify the signature first and must not perform business side
 * effects until this claim succeeds.
 */
export async function claimDirectSupplierWebhookEvent(input: {
  eventId: string;
  timestampSeconds: number;
  replayStore: DirectSupplierReplayStore;
  retentionSeconds?: number;
}): Promise<DirectSupplierWebhookClaimResult> {
  const eventId = input.eventId.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(eventId)) {
    return { ok: false, reason: 'INVALID_EVENT_ID' };
  }

  const retentionSeconds = input.retentionSeconds ?? 86400;
  if (!Number.isSafeInteger(retentionSeconds) || retentionSeconds < 300 || retentionSeconds > 604800) {
    return { ok: false, reason: 'INVALID_EVENT_ID' };
  }

  const expiresAt = new Date((input.timestampSeconds + retentionSeconds) * 1000);
  const claimed = await input.replayStore.claim(eventId, expiresAt);
  return claimed ? { ok: true } : { ok: false, reason: 'REPLAYED_EVENT' };
}
