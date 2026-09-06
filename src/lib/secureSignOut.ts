import { PushNotifications } from '@capacitor/push-notifications';
import { isCapacitorNative } from './capacitorUtils';

export const PUSH_TOKEN_STORAGE_KEY = 'loadify:push-token:last-registered';
export const PUSH_TOKEN_USER_STORAGE_KEY = 'loadify:push-token:last-user';
export const PUSH_TOKEN_REGISTRATION_VERSION_KEY = 'loadify:push-token:registration-version';
export const PUSH_TOKEN_REGISTRATION_VERSION = '3';

export interface PushRegistrationCache {
  token: string | null;
  userId: string | null;
  version: string | null;
}

const NETLIFY_BASE = (
  (() => {
    const envBase = import.meta.env.VITE_APP_URL as string | undefined;
    const trimmed = typeof envBase === 'string' ? envBase.trim() : '';
    return trimmed || 'https://loadifymarket.co.uk';
  })()
).replace(/\/$/, '');

const nativePushEnabled = import.meta.env.VITE_NATIVE_PUSH_ENABLED === 'true';

function readLegacyLocalStorage(): PushRegistrationCache {
  if (typeof window === 'undefined') {
    return { token: null, userId: null, version: null };
  }

  return {
    token: window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY),
    userId: window.localStorage.getItem(PUSH_TOKEN_USER_STORAGE_KEY),
    version: window.localStorage.getItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY),
  };
}

function hasLegacyCache(cache: PushRegistrationCache): boolean {
  return cache.token != null || cache.userId != null || cache.version != null;
}

function clearLegacyLocalStorage(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(PUSH_TOKEN_USER_STORAGE_KEY);
  window.localStorage.removeItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY);
}

async function removePreferenceCacheBestEffort(): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Promise.allSettled([
      Preferences.remove({ key: PUSH_TOKEN_STORAGE_KEY }),
      Preferences.remove({ key: PUSH_TOKEN_USER_STORAGE_KEY }),
      Preferences.remove({ key: PUSH_TOKEN_REGISTRATION_VERSION_KEY }),
    ]);
  } catch {
    // The caller retains/falls back to legacy localStorage when Preferences is
    // unavailable, so cleanup failure here must not destroy the recovery copy.
  }
}

/**
 * Native auth already uses Capacitor Preferences because WebView localStorage can
 * be cleared independently of the installed app. Push ownership metadata must
 * have the same durability; otherwise logout can lose the only server token
 * reference while the native registration remains active.
 *
 * Existing installations are migrated lazily from the legacy localStorage keys.
 */
export async function getPushRegistrationCache(): Promise<PushRegistrationCache> {
  const legacy = readLegacyLocalStorage();

  try {
    const { Preferences } = await import('@capacitor/preferences');
    const [tokenResult, userResult, versionResult] = await Promise.all([
      Preferences.get({ key: PUSH_TOKEN_STORAGE_KEY }),
      Preferences.get({ key: PUSH_TOKEN_USER_STORAGE_KEY }),
      Preferences.get({ key: PUSH_TOKEN_REGISTRATION_VERSION_KEY }),
    ]);

    const cache: PushRegistrationCache = {
      token: tokenResult.value ?? legacy.token,
      userId: userResult.value ?? legacy.userId,
      version: versionResult.value ?? legacy.version,
    };

    const migrations: Promise<void>[] = [];
    if (tokenResult.value == null && legacy.token != null) {
      migrations.push(Preferences.set({ key: PUSH_TOKEN_STORAGE_KEY, value: legacy.token }));
    }
    if (userResult.value == null && legacy.userId != null) {
      migrations.push(Preferences.set({ key: PUSH_TOKEN_USER_STORAGE_KEY, value: legacy.userId }));
    }
    if (versionResult.value == null && legacy.version != null) {
      migrations.push(Preferences.set({ key: PUSH_TOKEN_REGISTRATION_VERSION_KEY, value: legacy.version }));
    }

    if (migrations.length > 0) {
      await Promise.all(migrations);
    }

    // Once durable Preferences are readable and any missing values were copied,
    // remove every legacy copy. Leaving stale localStorage behind would become a
    // dangerous fallback if Preferences were temporarily unavailable later.
    if (hasLegacyCache(legacy)) {
      clearLegacyLocalStorage();
    }

    return cache;
  } catch (error) {
    // A legacy fallback is retained for older/native environments where the
    // Preferences plugin is temporarily unavailable. Do not erase it here.
    console.warn('push-token: Preferences read/migration failed, using legacy cache:', error);
    return legacy;
  }
}

export async function persistPushRegistrationCache(userId: string, token: string): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Promise.all([
      Preferences.set({ key: PUSH_TOKEN_STORAGE_KEY, value: token }),
      Preferences.set({ key: PUSH_TOKEN_USER_STORAGE_KEY, value: userId }),
      Preferences.set({ key: PUSH_TOKEN_REGISTRATION_VERSION_KEY, value: PUSH_TOKEN_REGISTRATION_VERSION }),
    ]);
    clearLegacyLocalStorage();
  } catch (error) {
    console.warn('push-token: Preferences persistence failed, using legacy cache:', error);
    if (typeof window === 'undefined') throw error;

    // A Promise.all write can fail after one key has already been persisted.
    // Remove partial durable state before writing the complete fallback cache so
    // a stale Preference value cannot override the fallback on the next read.
    await removePreferenceCacheBestEffort();
    window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    window.localStorage.setItem(PUSH_TOKEN_USER_STORAGE_KEY, userId);
    window.localStorage.setItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY, PUSH_TOKEN_REGISTRATION_VERSION);
  }
}

export async function clearPushRegistrationCache(): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Promise.all([
      Preferences.remove({ key: PUSH_TOKEN_STORAGE_KEY }),
      Preferences.remove({ key: PUSH_TOKEN_USER_STORAGE_KEY }),
      Preferences.remove({ key: PUSH_TOKEN_REGISTRATION_VERSION_KEY }),
    ]);
  } catch (error) {
    console.warn('push-token: Preferences cache cleanup failed:', error);
  } finally {
    clearLegacyLocalStorage();
  }
}

/**
 * Protect the current native device from receiving account-scoped push after
 * the current Supabase session is destroyed. This is deliberately independent
 * of the Supabase client so it can run inside the canonical auth sign-out
 * boundary without creating an import cycle.
 */
export async function protectCurrentDevicePushBeforeSignOut(accessToken?: string): Promise<void> {
  if (!isCapacitorNative() || typeof window === 'undefined') return;

  // Debug/local APKs deliberately fail closed when native push is disabled.
  // Calling PushNotifications.unregister() without Firebase/APNs configuration
  // is process-fatal on Android, just like register(). With push disabled there
  // is no active native registration to revoke, so only clear stale local cache.
  if (!nativePushEnabled) {
    await clearPushRegistrationCache();
    return;
  }

  const cache = await getPushRegistrationCache();
  const token = cache.token?.trim() ?? '';
  let serverProtected = false;
  let nativeProtected = false;

  if (token && accessToken) {
    try {
      const response = await fetch(`${NETLIFY_BASE}/.netlify/functions/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ op: 'unregister', token }),
      });
      serverProtected = response.ok;
    } catch (error) {
      console.warn('secure-sign-out: server push-token deactivation failed:', error);
    }
  }

  try {
    await PushNotifications.unregister();
    nativeProtected = true;
  } catch (error) {
    console.warn('secure-sign-out: native push unregister failed:', error);
  }

  if (serverProtected || nativeProtected) {
    await clearPushRegistrationCache();
    return;
  }

  // If the durable cache was unavailable/empty, native unregister is the only
  // remaining protection boundary. Failing it must not silently destroy the auth
  // session: an unknown still-active device token could continue receiving the
  // previous account's notifications.
  throw new Error('Unable to protect this device from account notifications before sign out. Please try again.');
}
