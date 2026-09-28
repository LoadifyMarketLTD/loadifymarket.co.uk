import { createHash } from 'node:crypto';
import { executeSupplierRuntimeHttp } from './supplierRuntimeHttp';

type JsonRecord = Record<string, unknown>;

export interface InkthreadableCredentials {
  appId: string;
  signingKey: string;
}

export interface InkthreadableRequestInput {
  method: 'GET' | 'POST' | 'DELETE';
  endpoint: '/api/order.php' | '/api/orders.php';
  query?: Record<string, string | number | undefined>;
  body?: JsonRecord;
}

export type InkthreadableResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; errorClass: 'AUTH_CONFIGURATION_FAILURE' | 'RATE_LIMITED' | 'RETRYABLE_FAILURE' | 'PERMANENT_REJECTION' | 'UNKNOWN_OUTCOME' | 'MALFORMED_RESPONSE'; message: string };

const BASE_URL = 'https://www.inkthreadable.co.uk';

function cleanCredentials(input: InkthreadableCredentials): InkthreadableCredentials | null {
  const appId = input.appId.trim();
  const signingKey = input.signingKey.trim();
  if (!/^APP-[A-Za-z0-9]+$/i.test(appId) || signingKey.length < 16) return null;
  return { appId, signingKey };
}

function signatureFor(method: InkthreadableRequestInput['method'], body: string, queryString: string, signingKey: string): string {
  const signingInput = method === 'POST' ? body : queryString;
  return createHash('sha1').update(signingInput + signingKey, 'utf8').digest('hex');
}

export function buildInkthreadableRequest(
  credentials: InkthreadableCredentials,
  input: InkthreadableRequestInput,
): { url: string; body?: string; headers: Record<string, string> } | null {
  const creds = cleanCredentials(credentials);
  if (!creds) return null;

  const url = new URL(input.endpoint, BASE_URL);
  const supplied = input.query ?? {};
  for (const [key, value] of Object.entries(supplied)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  if (input.method !== 'POST' && !url.searchParams.has('format')) url.searchParams.set('format', 'JSON');

  // Inkthreadable signs GET/DELETE using the complete query string excluding
  // Signature, so AppId must be present before the digest is calculated.
  url.searchParams.set('AppId', creds.appId);

  const body = input.method === 'POST' ? JSON.stringify(input.body ?? {}) : undefined;
  const queryForSignature = url.searchParams.toString();
  const signature = signatureFor(input.method, body ?? '', queryForSignature, creds.signingKey);

  url.searchParams.set('Signature', signature);

  return {
    url: url.toString(),
    ...(body ? { body } : {}),
    headers: input.method === 'POST'
      ? { 'content-type': 'application/json' }
      : {},
  };
}

export async function executeInkthreadableRequest(
  credentials: InkthreadableCredentials,
  input: InkthreadableRequestInput,
): Promise<InkthreadableResult> {
  const built = buildInkthreadableRequest(credentials, input);
  if (!built) return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Inkthreadable credentials are not configured' };

  const response = await executeSupplierRuntimeHttp({
    url: built.url,
    method: input.method,
    headers: built.headers,
    body: built.body,
    timeoutMs: 10000,
    maxBytes: 2 * 1024 * 1024,
  });
  if (!response.ok) return response;

  let data: unknown;
  try { data = response.body ? JSON.parse(response.body) : {}; }
  catch { return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Inkthreadable response is not valid JSON' }; }

  return { ok: true, status: response.status, data };
}

export function inkthreadableCredentialsFromEnv(): InkthreadableCredentials | null {
  const appId = process.env.INKTHREADABLE_APP_ID?.trim() ?? '';
  const signingKey = process.env.INKTHREADABLE_SIGNING_KEY?.trim() ?? '';
  return cleanCredentials({ appId, signingKey });
}
