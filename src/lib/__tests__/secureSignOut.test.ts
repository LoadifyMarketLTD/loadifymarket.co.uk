import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  native: true,
  unregister: vi.fn<() => Promise<void>>(),
  preferenceValues: new Map<string, string>(),
  preferencesFail: false,
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    unregister: state.unregister,
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => {
      if (state.preferencesFail) throw new Error('preferences unavailable');
      return { value: state.preferenceValues.get(key) ?? null };
    }),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      if (state.preferencesFail) throw new Error('preferences unavailable');
      state.preferenceValues.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      if (state.preferencesFail) throw new Error('preferences unavailable');
      state.preferenceValues.delete(key);
    }),
  },
}));

vi.mock('../capacitorUtils', () => ({
  isCapacitorNative: () => state.native,
}));

import {
  getPushRegistrationCache,
  protectCurrentDevicePushBeforeSignOut,
  PUSH_TOKEN_REGISTRATION_VERSION_KEY,
  PUSH_TOKEN_STORAGE_KEY,
  PUSH_TOKEN_USER_STORAGE_KEY,
} from '../secureSignOut';

const DEVICE_TOKEN = 'device-token-1';

function seedRegistrationCache() {
  state.preferenceValues.set(PUSH_TOKEN_STORAGE_KEY, DEVICE_TOKEN);
  state.preferenceValues.set(PUSH_TOKEN_USER_STORAGE_KEY, 'user-a');
  state.preferenceValues.set(PUSH_TOKEN_REGISTRATION_VERSION_KEY, '2');
}

function seedLegacyRegistrationCache() {
  window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, DEVICE_TOKEN);
  window.localStorage.setItem(PUSH_TOKEN_USER_STORAGE_KEY, 'user-a');
  window.localStorage.setItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY, '2');
}

describe('protectCurrentDevicePushBeforeSignOut', () => {
  beforeEach(() => {
    state.native = true;
    state.preferencesFail = false;
    state.preferenceValues.clear();
    state.unregister.mockReset().mockResolvedValue(undefined);
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('is a no-op outside the native runtime', async () => {
    state.native = false;
    seedRegistrationCache();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await protectCurrentDevicePushBeforeSignOut('access-token');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.unregister).not.toHaveBeenCalled();
    expect(state.preferenceValues.get(PUSH_TOKEN_STORAGE_KEY)).toBe(DEVICE_TOKEN);
  });

  it('migrates a legacy localStorage registration into durable Preferences', async () => {
    seedLegacyRegistrationCache();

    const cache = await getPushRegistrationCache();

    expect(cache).toEqual({ token: DEVICE_TOKEN, userId: 'user-a', version: '2' });
    expect(state.preferenceValues.get(PUSH_TOKEN_STORAGE_KEY)).toBe(DEVICE_TOKEN);
    expect(state.preferenceValues.get(PUSH_TOKEN_USER_STORAGE_KEY)).toBe('user-a');
    expect(state.preferenceValues.get(PUSH_TOKEN_REGISTRATION_VERSION_KEY)).toBe('2');
    expect(window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('deactivates the current device token server-side before sign-out', async () => {
    seedRegistrationCache();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    await protectCurrentDevicePushBeforeSignOut('access-token');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/.netlify/functions/push-token');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer access-token' });
    expect(JSON.parse(String(init?.body))).toEqual({ op: 'unregister', token: DEVICE_TOKEN });
    expect(state.unregister).toHaveBeenCalledTimes(1);
    expect(state.preferenceValues.has(PUSH_TOKEN_STORAGE_KEY)).toBe(false);
    expect(state.preferenceValues.has(PUSH_TOKEN_USER_STORAGE_KEY)).toBe(false);
    expect(state.preferenceValues.has(PUSH_TOKEN_REGISTRATION_VERSION_KEY)).toBe(false);
  });

  it('allows sign-out when the server path fails but native unregister succeeds', async () => {
    seedRegistrationCache();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).resolves.toBeUndefined();

    expect(state.unregister).toHaveBeenCalledTimes(1);
    expect(state.preferenceValues.has(PUSH_TOKEN_STORAGE_KEY)).toBe(false);
  });

  it('allows sign-out when native unregister fails but the server deactivation succeeds', async () => {
    seedRegistrationCache();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    state.unregister.mockRejectedValue(new Error('native unavailable'));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).resolves.toBeUndefined();

    expect(state.preferenceValues.has(PUSH_TOKEN_STORAGE_KEY)).toBe(false);
  });

  it('fails closed when both server deactivation and native unregister fail', async () => {
    seedRegistrationCache();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));
    state.unregister.mockRejectedValue(new Error('native unavailable'));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).rejects.toThrow(
      'Unable to protect this device from account notifications before sign out.',
    );

    expect(state.preferenceValues.get(PUSH_TOKEN_STORAGE_KEY)).toBe(DEVICE_TOKEN);
    expect(state.preferenceValues.get(PUSH_TOKEN_USER_STORAGE_KEY)).toBe('user-a');
  });

  it('allows sign-out with no cached token only when native unregister succeeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.unregister).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the durable token cache is empty and native unregister fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    state.unregister.mockRejectedValue(new Error('native unavailable'));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).rejects.toThrow(
      'Unable to protect this device from account notifications before sign out.',
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to the legacy cache if Preferences is temporarily unavailable', async () => {
    state.preferencesFail = true;
    seedLegacyRegistrationCache();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).resolves.toBeUndefined();

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ op: 'unregister', token: DEVICE_TOKEN });
    expect(window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
