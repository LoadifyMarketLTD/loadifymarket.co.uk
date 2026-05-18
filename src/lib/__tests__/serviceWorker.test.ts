// @vitest-environment node

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const serviceWorkerPath = '/home/runner/work/loadifymarket.co.uk/loadifymarket.co.uk/public/sw.js';

type FetchListener = (event: { request: Request; respondWith: (value: Promise<Response> | Response) => void }) => void;

describe('public/sw.js', () => {
  let listeners: Map<string, FetchListener>;

  beforeEach(() => {
    listeners = new Map();

    vi.stubGlobal('self', {
      addEventListener: vi.fn((type: string, listener: FetchListener) => {
        listeners.set(type, listener);
      }),
      skipWaiting: vi.fn(),
      clients: {
        claim: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
      }),
      match: vi.fn().mockResolvedValue(undefined),
    });

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function loadServiceWorker() {
    const moduleUrl = `${pathToFileURL(path.resolve(serviceWorkerPath)).href}?t=${Date.now()}`;
    await import(moduleUrl);
  }

  it('returns a valid fallback Response when network-first navigation has no cache hit', async () => {
    await loadServiceWorker();

    const fetchListener = listeners.get('fetch');
    expect(fetchListener).toBeTypeOf('function');

    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));

    let responsePromise: Promise<Response> | undefined;
    fetchListener?.({
      request: new Request('https://loadifymarket.co.uk/inbox/seller/messages'),
      respondWith: (value) => {
        responsePromise = Promise.resolve(value);
      },
    });

    const response = await responsePromise;
    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(503);
  });
});
