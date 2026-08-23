import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: authMocks,
  },
}));

vi.mock('./capacitorUtils', () => ({
  isCapacitorContext: () => false,
}));

import {
  AUTHORIZED_FETCH_TIMEOUT_MS,
  authorizedFetch,
} from './authorizedFetch';

function installAbortableNeverFetch() {
  const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => (
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const rejectAbort = () => {
        const error = new Error('The operation was aborted.');
        error.name = 'AbortError';
        reject(error);
      };

      if (signal?.aborted) {
        rejectAbort();
        return;
      }

      signal?.addEventListener('abort', rejectAbort, { once: true });
    })
  ));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('authorizedFetch timeout and abort contract', () => {
  beforeEach(() => {
    authMocks.getSession.mockReset();
    authMocks.refreshSession.mockReset();
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'not-a-decodable-jwt',
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fails a stalled authorized request after the finite deadline', async () => {
    vi.useFakeTimers();
    installAbortableNeverFetch();

    const request = authorizedFetch('/.netlify/functions/seller-onboarding-status', {
      method: 'POST',
    });
    const rejection = expect(request).rejects.toThrow('Request timed out. Please try again.');

    await vi.advanceTimersByTimeAsync(AUTHORIZED_FETCH_TIMEOUT_MS);
    await rejection;
  });

  it('bounds a stalled Supabase session lookup as part of the same deadline', async () => {
    vi.useFakeTimers();
    authMocks.getSession.mockReturnValue(new Promise(() => {}));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const request = authorizedFetch('/.netlify/functions/seller-onboarding-status', {
      method: 'POST',
    });
    const rejection = expect(request).rejects.toThrow('Request timed out. Please try again.');

    await vi.advanceTimersByTimeAsync(AUTHORIZED_FETCH_TIMEOUT_MS);
    await rejection;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves a caller abort instead of reporting it as an internal timeout', async () => {
    installAbortableNeverFetch();
    const caller = new AbortController();

    const request = authorizedFetch('/.netlify/functions/seller-onboarding-status', {
      method: 'POST',
      signal: caller.signal,
    });

    await Promise.resolve();
    caller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});