import { lookup } from 'node:dns/promises';
import { Agent, request as httpsRequest } from 'node:https';
import { Buffer } from 'node:buffer';
import * as ipaddr from 'ipaddr.js';
import type { SupplierAdapterErrorClass } from './supplierAdapter';

export interface SupplierRuntimeHttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs: number;
  maxBytes: number;
}

export type SupplierRuntimeHttpResult =
  | { ok: true; body: string; status: number }
  | { ok: false; errorClass: SupplierAdapterErrorClass; message: string };

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

function isPublicAddress(address: string): boolean {
  try {
    let parsed = ipaddr.parse(address);
    if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
      parsed = parsed.toIPv4Address();
    }
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

async function resolvePublicHost(hostname: string): Promise<ResolvedAddress[] | null> {
  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return null;
    const resolved = records.map((record) => ({
      address: record.address,
      family: record.family as 4 | 6,
    }));
    if (resolved.some((record) => !isPublicAddress(record.address))) return null;
    return resolved;
  } catch {
    return null;
  }
}

function errorForStatus(status: number): SupplierRuntimeHttpResult {
  if (status === 401 || status === 403) {
    return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Supplier runtime authentication was rejected' };
  }
  if (status === 429) {
    return { ok: false, errorClass: 'RATE_LIMITED', message: 'Supplier runtime rate limit reached' };
  }
  if (status >= 300 && status < 400) {
    return { ok: false, errorClass: 'PERMANENT_REJECTION', message: 'Supplier runtime redirects are disabled' };
  }
  if (status >= 400 && status < 500) {
    return { ok: false, errorClass: 'PERMANENT_REJECTION', message: 'Supplier runtime rejected the request' };
  }
  return { ok: false, errorClass: 'RETRYABLE_FAILURE', message: 'Supplier runtime request failed' };
}

export async function executeSupplierRuntimeHttp(
  input: SupplierRuntimeHttpRequest,
): Promise<SupplierRuntimeHttpResult> {
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return { ok: false, errorClass: 'AUTH_CONFIGURATION_FAILURE', message: 'Supplier runtime URL is invalid' };
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    return {
      ok: false,
      errorClass: 'AUTH_CONFIGURATION_FAILURE',
      message: 'Supplier runtime URL must be credential-free HTTPS without fragments',
    };
  }

  const host = url.hostname.toLowerCase();
  const addresses = await resolvePublicHost(host);
  if (!addresses) {
    return {
      ok: false,
      errorClass: 'AUTH_CONFIGURATION_FAILURE',
      message: 'Supplier runtime host did not resolve exclusively to public addresses',
    };
  }
  const selected = addresses[0];

  if (input.body && Buffer.byteLength(input.body, 'utf8') > input.maxBytes) {
    return { ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier runtime request exceeds configured limit' };
  }

  return await new Promise<SupplierRuntimeHttpResult>((resolve) => {
    let settled = false;
    const agent = new Agent({
      keepAlive: false,
      maxSockets: 1,
      lookup: (_hostname, _options, callback) => callback(null, selected.address, selected.family),
    });
    const finish = (result: SupplierRuntimeHttpResult) => {
      if (settled) return;
      settled = true;
      agent.destroy();
      resolve(result);
    };

    const request = httpsRequest(url, {
      method: input.method,
      headers: {
        accept: 'application/json',
        'accept-encoding': 'identity',
        'user-agent': 'Loadify-Direct-Supplier-Runtime/1.0',
        ...(input.headers ?? {}),
      },
      agent,
      rejectUnauthorized: true,
      servername: host,
    }, (response) => {
      const status = response.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        response.resume();
        finish(errorForStatus(status));
        return;
      }

      const encoding = typeof response.headers['content-encoding'] === 'string'
        ? response.headers['content-encoding'].toLowerCase()
        : '';
      if (encoding && encoding !== 'identity') {
        response.resume();
        finish({ ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Compressed supplier runtime responses are not accepted' });
        return;
      }

      const declared = Number(response.headers['content-length'] ?? 0);
      if (Number.isFinite(declared) && declared > input.maxBytes) {
        response.resume();
        finish({ ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier runtime response exceeds configured limit' });
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.length;
        if (received > input.maxBytes) {
          request.destroy();
          finish({ ok: false, errorClass: 'MALFORMED_RESPONSE', message: 'Supplier runtime response exceeds configured limit' });
          return;
        }
        chunks.push(buffer);
      });
      response.on('end', () => {
        if (settled) return;
        finish({ ok: true, body: Buffer.concat(chunks).toString('utf8'), status });
      });
      response.on('error', () => {
        finish({ ok: false, errorClass: 'RETRYABLE_FAILURE', message: 'Supplier runtime response failed' });
      });
    });

    request.setTimeout(input.timeoutMs, () => {
      request.destroy();
      finish({ ok: false, errorClass: 'RETRYABLE_FAILURE', message: 'Supplier runtime request timed out' });
    });
    request.on('error', () => {
      finish({ ok: false, errorClass: 'UNKNOWN_OUTCOME', message: 'Supplier runtime request failed before a trusted response was received' });
    });

    if (input.body) request.write(input.body);
    request.end();
  });
}
