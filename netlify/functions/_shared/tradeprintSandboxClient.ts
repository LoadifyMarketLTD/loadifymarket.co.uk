import type { SupplierAdapterErrorClass } from './supplierAdapter';
import { executeSupplierRuntimeHttp } from './supplierRuntimeHttp';

type JsonRecord = Record<string, unknown>;

export interface TradeprintSandboxCredentials {
  username: string;
  password: string;
}

export type TradeprintSandboxResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; errorClass: SupplierAdapterErrorClass; message: string };

const TRADEPRINT_SANDBOX_BASE_URL = 'https://sandbox.orders.tradeprint.io/v2';

function cleanCredentials(
  input: TradeprintSandboxCredentials,
): TradeprintSandboxCredentials | null {
  const username = input.username.trim();
  const password = input.password.trim();
  if (username.length < 4 || password.length < 8) return null;
  return { username, password };
}

function parseJsonObject(body: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as JsonRecord
      : null;
  } catch {
    return null;
  }
}
async function loginTradeprintSandbox(
  credentials: TradeprintSandboxCredentials,
): Promise<TradeprintSandboxResult<string>> {
  const creds = cleanCredentials(credentials);
  if (!creds) {
    return {
      ok: false,
      errorClass: 'AUTH_CONFIGURATION_FAILURE',
      message: 'Tradeprint sandbox credentials are not configured',
    };
  }

  const response = await executeSupplierRuntimeHttp({
    url: `${TRADEPRINT_SANDBOX_BASE_URL}/login`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
    timeoutMs: 10000,
    maxBytes: 512 * 1024,
  });
  if (!response.ok) return response;

  const payload = parseJsonObject(response.body);
  const result = payload?.result;
  const token = result && typeof result === 'object' && !Array.isArray(result)
    ? (result as JsonRecord).token
    : null;
  if (payload?.success !== true || typeof token !== 'string' || token.length < 16) {
    return {
      ok: false,
      errorClass: 'MALFORMED_RESPONSE',
      message: 'Tradeprint sandbox login response did not contain a trusted token',
    };
  }

  return { ok: true, status: response.status, data: token };
}
export async function fetchTradeprintSandboxProductAttributes(
  credentials: TradeprintSandboxCredentials,
): Promise<TradeprintSandboxResult<JsonRecord>> {
  const login = await loginTradeprintSandbox(credentials);
  if (!login.ok) return login;

  const response = await executeSupplierRuntimeHttp({
    url: `${TRADEPRINT_SANDBOX_BASE_URL}/products-v2/attributes-v2`,
    method: 'GET',
    headers: { authorization: `Bearer ${login.data}` },
    timeoutMs: 10000,
    maxBytes: 4 * 1024 * 1024,
  });
  if (!response.ok) return response;

  const payload = parseJsonObject(response.body);
  if (payload?.success !== true || !payload.result || typeof payload.result !== 'object') {
    return {
      ok: false,
      errorClass: 'MALFORMED_RESPONSE',
      message: 'Tradeprint product discovery response was malformed',
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload.result as JsonRecord,
  };
}

export function tradeprintSandboxCredentialsFromEnv(): TradeprintSandboxCredentials | null {
  return cleanCredentials({
    username: process.env.TRADEPRINT_SANDBOX_USERNAME ?? '',
    password: process.env.TRADEPRINT_SANDBOX_PASSWORD ?? '',
  });
}

export function tradeprintSandboxBaseUrl(): string {
  return TRADEPRINT_SANDBOX_BASE_URL;
}
