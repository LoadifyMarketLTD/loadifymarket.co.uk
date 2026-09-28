import { createHash } from 'node:crypto';
import type { SupplierRuntimeHttpConfig } from './supplierRuntimeConfig';

export type SupplierRuntimeAuthResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function applySupplierRuntimeAuth(input: {
  config: SupplierRuntimeHttpConfig;
  url: string;
  body?: string;
}): SupplierRuntimeAuthResult {
  const auth = input.config.auth;
  if (!auth) return { ok: true, url: input.url };

  if (auth.mode !== 'inkthreadable_sha1') {
    return { ok: false, error: 'Unsupported supplier runtime authentication mode' };
  }

  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return { ok: false, error: 'Supplier runtime authentication URL is invalid' };
  }

  const appIdParam = auth.appIdParam || 'AppId';
  const signatureParam = auth.signatureParam || 'Signature';
  url.searchParams.set(appIdParam, auth.appId);

  const method = (input.config.method || 'GET').toUpperCase();
  const signingInput = method === 'POST' || method === 'PUT' || method === 'PATCH'
    ? (input.body || '')
    : url.searchParams.toString();

  const signature = createHash('sha1')
    .update(signingInput + auth.secretKey, 'utf8')
    .digest('hex');

  url.searchParams.set(signatureParam, signature);
  return { ok: true, url: url.toString() };
}
