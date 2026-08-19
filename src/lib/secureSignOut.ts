import { PushNotifications } from '@capacitor/push-notifications';
import { isCapacitorNative } from './capacitorUtils';

export const PUSH_TOKEN_STORAGE_KEY = 'loadify:push-token:last-registered';
export const PUSH_TOKEN_USER_STORAGE_KEY = 'loadify:push-token:last-user';
export const PUSH_TOKEN_REGISTRATION_VERSION_KEY = 'loadify:push-token:registration-version';
export const PUSH_TOKEN_REGISTRATION_VERSION = '2';

const NETLIFY_BASE = (
  (() => {
    const envBase = import.meta.env.VITE_APP_URL as string | undefined;
    const trimmed = typeof envBase === 'string' ? envBase.trim() : '';
    return trimmed || 'https://loadifymarket.co.uk';
  })()
).replace(/\/$/, '');

export function clearPushRegistrationCache(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(PUSH_TOKEN_USER_STORAGE_KEY);
  window.localStorage.removeItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY);
}

/**
 * Protect the current native device from receiving account-scoped push after
 * the current Supabase session is destroyed. This is deliberately independent
 * of the Supabase client so it can run inside the canonical auth sign-out
 * boundary without creating an import cycle.
 */
export async function protectCurrentDevicePushBeforeSignOut(accessToken?: string): Promise<void> {
  if (!isCapacitorNative() || typeof window === 'undefined') return;

  const token = window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)?.trim() ?? '';
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

  if (serverProtected || nativeProtected || !token) {
    clearPushRegistrationCache();
  }

  if (token && !serverProtected && !nativeProtected) {
    throw new Error('Unable to protect this device from account notifications before sign out. Please try again.');
  }
}
