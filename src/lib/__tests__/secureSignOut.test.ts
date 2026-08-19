import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  native: true,
  unregister: vi.fn<() => Promise<void>>(),
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    unregister: state.unregister,
  },
}));

vi.mock('../capacitorUtils', () => ({
  isCapacitorNative: () => state.native,
}));

import {
  protectCurrentDevicePushBeforeSignOut,
  PUSH_TOKEN_REGISTRATION_VERSION_KEY,
  PUSH_TOKEN_STORAGE_KEY,
  PUSH_TOKEN_USER_STORAGE_KEY,
} from '../secureSignOut';

const DEVICE_TOKEN = 'device-token-1';

function seedRegistrationCache() {
  window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, DEVICE_TOKEN);
  window.localStorage.setItem(PUSH_TOKEN_USER_STORAGE_KEY, 'user-a');
  window.localStorage.setItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY, '2');
}

describe('protectCurrentDevicePushBeforeSignOut', () => {
  beforeEach(() => {
    state.native = true;
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
    expect(window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBe(DEVICE_TOKEN);
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
    expect(window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(PUSH_TOKEN_USER_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY)).toBeNull();
  });

  it('allows sign-out when the server path fails but native unregister succeeds', async () => {
    seedRegistrationCache();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).resolves.toBeUndefined();

    expect(state.unregister).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('allows sign-out when native unregister fails but the server deactivation succeeds', async () => {
    seedRegistrationCache();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    state.unregister.mockRejectedValue(new Error('native unavailable'));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).resolves.toBeUndefined();

    expect(window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('fails closed when both server deactivation and native unregister fail', async () => {
    seedRegistrationCache();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));
    state.unregister.mockRejectedValue(new Error('native unavailable'));

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).rejects.toThrow(
      'Unable to protect this device from account notifications before sign out.',
    );

    expect(window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)).toBe(DEVICE_TOKEN);
    expect(window.localStorage.getItem(PUSH_TOKEN_USER_STORAGE_KEY)).toBe('user-a');
  });

  it('does not require a server call when there is no cached device token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(protectCurrentDevicePushBeforeSignOut('access-token')).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.unregister).toHaveBeenCalledTimes(1);
  });
});
