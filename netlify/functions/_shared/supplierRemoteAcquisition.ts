import { createHash, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { Agent, request as httpsRequest } from 'node:https';
import { Buffer } from 'node:buffer';
import * as ipaddr from 'ipaddr.js';
import SftpClient from 'ssh2-sftp-client';
import type {
  HttpSupplierAcquisitionConfig,
  SftpSupplierAcquisitionConfig,
  SupplierAcquisitionConfig,
} from './supplierAcquisitionConfig';

export interface SupplierAcquisitionPayload {
  rawPayload: string;
  payloadBytes: number;
  sourceDigest: string;
  generatedAt: string;
  remoteEtag?: string;
  remoteLastModified?: string;
}

export type SupplierAcquisitionFetchResult =
  | { ok: true; payload: SupplierAcquisitionPayload }
  | { ok: false; code: string; error: string };

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

class SupplierAcquisitionTimeoutError extends Error {}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new SupplierAcquisitionTimeoutError('operation timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function digest(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
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

function safeHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value.slice(0, 512);
  if (Array.isArray(value) && value.length > 0) return value.join(',').slice(0, 512);
  return undefined;
}

function generatedAtFromHeader(lastModified: string | undefined, now: Date): string {
  if (!lastModified) return now.toISOString();
  const parsed = Date.parse(lastModified);
  if (!Number.isFinite(parsed)) return now.toISOString();
  const value = new Date(parsed);
  if (value.getTime() > now.getTime() + 5 * 60 * 1000) return now.toISOString();
  return value.toISOString();
}

async function acquireHttp(
  config: HttpSupplierAcquisitionConfig,
  now: Date,
): Promise<SupplierAcquisitionFetchResult> {
  let url: URL;
  try {
    url = new URL(config.url);
  } catch {
    return { ok: false, code: 'HTTP_URL_INVALID', error: 'Supplier HTTP acquisition URL is invalid' };
  }

  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !config.allowedHosts.includes(host)) {
    return { ok: false, code: 'HTTP_HOST_BLOCKED', error: 'Supplier HTTP acquisition host is not allowed' };
  }

  const addresses = await resolvePublicHost(host);
  if (!addresses) {
    return { ok: false, code: 'HTTP_DNS_BLOCKED', error: 'Supplier HTTP acquisition host did not resolve to public addresses' };
  }
  const selected = addresses[0];
  const timeoutMs = config.timeoutMs ?? 10000;
  const maxBytes = config.maxBytes ?? 2 * 1024 * 1024;

  return await new Promise<SupplierAcquisitionFetchResult>((resolve) => {
    let settled = false;
    const finish = (result: SupplierAcquisitionFetchResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const agent = new Agent({
      keepAlive: false,
      maxSockets: 1,
      lookup: (_hostname, _options, callback) => {
        callback(null, selected.address, selected.family);
      },
    });

    const request = httpsRequest(url, {
      method: 'GET',
      headers: {
        accept: 'application/json,text/csv,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.1',
        'accept-encoding': 'identity',
        'user-agent': 'Loadify-Supplier-Acquisition/1.0',
        ...(config.headers ?? {}),
      },
      agent,
      rejectUnauthorized: true,
      servername: host,
    }, (response) => {
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        response.resume();
        finish({ ok: false, code: 'HTTP_REDIRECT_BLOCKED', error: 'Supplier HTTP acquisition redirects are disabled' });
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        finish({ ok: false, code: 'HTTP_STATUS_REJECTED', error: 'Supplier HTTP acquisition returned a non-success status' });
        return;
      }

      const encoding = safeHeader(response.headers['content-encoding'])?.toLowerCase();
      if (encoding && encoding !== 'identity') {
        response.resume();
        finish({ ok: false, code: 'HTTP_ENCODING_REJECTED', error: 'Compressed supplier HTTP payloads are not accepted' });
        return;
      }

      const declaredLength = Number(response.headers['content-length'] ?? 0);
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        response.resume();
        finish({ ok: false, code: 'HTTP_PAYLOAD_TOO_LARGE', error: 'Supplier HTTP payload exceeds the configured limit' });
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.length;
        if (received > maxBytes) {
          request.destroy();
          finish({ ok: false, code: 'HTTP_PAYLOAD_TOO_LARGE', error: 'Supplier HTTP payload exceeds the configured limit' });
          return;
        }
        chunks.push(buffer);
      });
      response.on('end', () => {
        if (settled) return;
        const body = Buffer.concat(chunks);
        const lastModified = safeHeader(response.headers['last-modified']);
        finish({
          ok: true,
          payload: {
            rawPayload: body.toString('utf8'),
            payloadBytes: body.length,
            sourceDigest: digest(body),
            generatedAt: generatedAtFromHeader(lastModified, now),
            remoteEtag: safeHeader(response.headers.etag),
            remoteLastModified: lastModified,
          },
        });
      });
      response.on('error', () => {
        finish({ ok: false, code: 'HTTP_RESPONSE_ERROR', error: 'Supplier HTTP response failed' });
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      finish({ ok: false, code: 'HTTP_TIMEOUT', error: 'Supplier HTTP acquisition timed out' });
    });
    request.on('error', () => {
      finish({ ok: false, code: 'HTTP_REQUEST_ERROR', error: 'Supplier HTTP acquisition failed' });
    });
    request.end();
  });
}

function fingerprintMatches(expectedHex: string, actualHex: string): boolean {
  try {
    const expected = Buffer.from(expectedHex.toLowerCase(), 'hex');
    const actual = Buffer.from(actualHex.toLowerCase(), 'hex');
    return expected.length === 32 && actual.length === 32 && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function acquireSftp(
  config: SftpSupplierAcquisitionConfig,
  now: Date,
): Promise<SupplierAcquisitionFetchResult> {
  const addresses = await resolvePublicHost(config.host);
  if (!addresses) {
    return { ok: false, code: 'SFTP_DNS_BLOCKED', error: 'Supplier SFTP host did not resolve to public addresses' };
  }
  const selected = addresses[0];
  const timeoutMs = config.timeoutMs ?? 10000;
  const maxBytes = config.maxBytes ?? 2 * 1024 * 1024;
  const client = new SftpClient('loadify-supplier-acquisition');

  try {
    await withTimeout(client.connect({
      host: selected.address,
      port: config.port ?? 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      passphrase: config.passphrase,
      readyTimeout: timeoutMs,
      retries: 0,
      hostHash: 'sha256',
      hostVerifier: (fingerprint: string) => fingerprintMatches(config.hostKeySha256, fingerprint),
    }), timeoutMs);

    const stat = await withTimeout(client.stat(config.remotePath), timeoutMs);
    if (!stat.isFile || stat.size < 0 || stat.size > maxBytes) {
      return { ok: false, code: 'SFTP_FILE_REJECTED', error: 'Supplier SFTP file is missing or exceeds the configured limit' };
    }

    const result = await withTimeout(client.get(config.remotePath), timeoutMs);
    if (!Buffer.isBuffer(result)) {
      return { ok: false, code: 'SFTP_READ_INVALID', error: 'Supplier SFTP file could not be read as a buffer' };
    }
    if (result.length > maxBytes) {
      return { ok: false, code: 'SFTP_PAYLOAD_TOO_LARGE', error: 'Supplier SFTP payload exceeds the configured limit' };
    }

    const modified = Number.isFinite(stat.modifyTime) && stat.modifyTime > 0
      ? new Date(stat.modifyTime)
      : now;
    const generatedAt = Number.isFinite(modified.getTime()) && modified.getTime() <= now.getTime() + 5 * 60 * 1000
      ? modified.toISOString()
      : now.toISOString();

    return {
      ok: true,
      payload: {
        rawPayload: result.toString('utf8'),
        payloadBytes: result.length,
        sourceDigest: digest(result),
        generatedAt,
        remoteLastModified: generatedAt,
      },
    };
  } catch (error) {
    if (error instanceof SupplierAcquisitionTimeoutError) {
      return { ok: false, code: 'SFTP_TIMEOUT', error: 'Supplier SFTP acquisition timed out' };
    }
    return { ok: false, code: 'SFTP_ACQUISITION_FAILED', error: 'Supplier SFTP acquisition failed' };
  } finally {
    try {
      await withTimeout(client.end(), 3000);
    } catch {
      // Connection cleanup must not replace the acquisition result.
    }
  }
}

export async function acquireSupplierPayload(
  config: SupplierAcquisitionConfig,
  now = new Date(),
): Promise<SupplierAcquisitionFetchResult> {
  return config.kind === 'http'
    ? await acquireHttp(config, now)
    : await acquireSftp(config, now);
}
