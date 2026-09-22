import { createHmac, timingSafeEqual } from 'node:crypto';

export type SupplierWebhookAuthConfig =
  | {
      mode: 'hmac_sha256';
      secret: string;
      signatureHeader?: string;
      timestampHeader?: string;
      signingInput?: 'body' | 'timestamp_dot_body';
      signaturePrefix?: string;
      toleranceSeconds?: number;
    }
  | {
      mode: 'bearer';
      secret: string;
      authorizationHeader?: string;
    };

export interface SupplierWebhookRuntimeConfig {
  kind: 'webhook';
  supplierKey: string;
  auth: SupplierWebhookAuthConfig;
}

export type SupplierWebhookConfigResult =
  | { ok: true; envName: string; config: SupplierWebhookRuntimeConfig }
  | { ok: false; code: string; error: string };

const CONFIG_REF_RE = /^env:([A-Z][A-Z0-9_]{2,127})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function resolveSupplierWebhookConfig(configRef: string, expectedSupplierKey: string): SupplierWebhookConfigResult {
  const match = CONFIG_REF_RE.exec(configRef.trim());
  if (!match) return { ok: false, code: 'CONFIG_REF_INVALID', error: 'Supplier webhook config reference is invalid' };
  const envName = match[1];
  const raw = process.env[envName];
  if (!raw) return { ok: false, code: 'CONFIG_NOT_PROVISIONED', error: 'Supplier webhook config is not provisioned' };

  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; }
  catch { return { ok: false, code: 'CONFIG_INVALID_JSON', error: 'Supplier webhook config is invalid JSON' }; }
  if (!isRecord(parsed) || parsed.kind !== 'webhook') {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook config must use kind=webhook' };
  }

  const supplierKey = text(parsed.supplierKey).toLowerCase();
  if (!supplierKey || supplierKey !== expectedSupplierKey.toLowerCase()) {
    return { ok: false, code: 'CONFIG_BINDING_MISMATCH', error: 'Supplier webhook config supplier key does not match binding' };
  }

  if (!isRecord(parsed.auth)) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook authentication config is required' };
  }
  const mode = text(parsed.auth.mode);
  const secret = text(parsed.auth.secret);
  if (secret.length < 24) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook secret is missing or too short' };
  }

  if (mode === 'bearer') {
    const authorizationHeader = text(parsed.auth.authorizationHeader).toLowerCase() || 'authorization';
    if (!/^[a-z0-9-]{1,64}$/.test(authorizationHeader)) {
      return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook authorization header is invalid' };
    }
    return {
      ok: true,
      envName,
      config: { kind: 'webhook', supplierKey, auth: { mode: 'bearer', secret, authorizationHeader } },
    };
  }

  if (mode !== 'hmac_sha256') {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Unsupported supplier webhook authentication mode' };
  }

  const signatureHeader = text(parsed.auth.signatureHeader).toLowerCase() || 'x-loadify-supplier-signature';
  const timestampHeader = text(parsed.auth.timestampHeader).toLowerCase() || 'x-loadify-supplier-timestamp';
  const signingInput = text(parsed.auth.signingInput) || 'timestamp_dot_body';
  const signaturePrefix = typeof parsed.auth.signaturePrefix === 'string' ? parsed.auth.signaturePrefix : 'v1=';
  const toleranceSeconds = typeof parsed.auth.toleranceSeconds === 'number' ? parsed.auth.toleranceSeconds : 300;

  if (!/^[a-z0-9-]{1,64}$/.test(signatureHeader) || !/^[a-z0-9-]{1,64}$/.test(timestampHeader)) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook signature headers are invalid' };
  }
  if (signingInput !== 'body' && signingInput !== 'timestamp_dot_body') {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook signingInput is invalid' };
  }
  if (!Number.isSafeInteger(toleranceSeconds) || toleranceSeconds < 30 || toleranceSeconds > 3600) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook tolerance is invalid' };
  }
  if (signaturePrefix.length > 32 || /[\r\n]/.test(signaturePrefix)) {
    return { ok: false, code: 'CONFIG_INVALID', error: 'Supplier webhook signature prefix is invalid' };
  }

  return {
    ok: true,
    envName,
    config: {
      kind: 'webhook',
      supplierKey,
      auth: {
        mode: 'hmac_sha256',
        secret,
        signatureHeader,
        timestampHeader,
        signingInput,
        signaturePrefix,
        toleranceSeconds,
      },
    },
  };
}

export function verifySupplierWebhookRequest(input: {
  config: SupplierWebhookRuntimeConfig;
  headers: Record<string, string | undefined>;
  rawBody: string;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  const auth = input.config.auth;

  if (auth.mode === 'bearer') {
    const header = input.headers[(auth.authorizationHeader || 'authorization').toLowerCase()] || '';
    const expected = 'Bearer ' + auth.secret;
    return safeEqual(header.trim(), expected)
      ? { ok: true }
      : { ok: false, reason: 'INVALID_BEARER_TOKEN' };
  }

  const signatureHeader = (auth.signatureHeader || 'x-loadify-supplier-signature').toLowerCase();
  const timestampHeader = (auth.timestampHeader || 'x-loadify-supplier-timestamp').toLowerCase();
  const supplied = (input.headers[signatureHeader] || '').trim();
  if (!supplied) return { ok: false, reason: 'MISSING_SIGNATURE' };

  let signingValue = input.rawBody;
  if (auth.signingInput === 'timestamp_dot_body') {
    const timestamp = (input.headers[timestampHeader] || '').trim();
    if (!/^\d{10}$/.test(timestamp)) return { ok: false, reason: 'INVALID_TIMESTAMP' };
    const timestampSeconds = Number(timestamp);
    const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > (auth.toleranceSeconds ?? 300)) {
      return { ok: false, reason: 'STALE_TIMESTAMP' };
    }
    signingValue = timestamp + '.' + input.rawBody;
  }

  const digest = createHmac('sha256', auth.secret).update(signingValue, 'utf8').digest('hex');
  const expected = (auth.signaturePrefix ?? 'v1=') + digest;
  return safeEqual(supplied, expected)
    ? { ok: true }
    : { ok: false, reason: 'INVALID_SIGNATURE' };
}
