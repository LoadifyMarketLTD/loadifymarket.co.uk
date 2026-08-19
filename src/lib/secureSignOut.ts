import { PushNotifications } from '@capacitor/push-notifications';
import { authorizedFetch } from './authorizedFetch';
import { isCapacitorNative } from './capacitorUtils';
import { supabase } from './supabase';

export const PUSH_TOKEN_STORAGE_KEY = 'loadify:push-token:last-registered';
export const PUSH_TOKEN_USER_STORAGE_KEY = 'loadify:push-token:last-user';
export const PUSH_TOKEN_REGISTRATION_VERSION_KEY = 'loadify:push-token:registration-version';
export const PUSH_TOKEN_REGISTRATION_VERSION = '2';

export function clearPushRegistrationCache(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(PUSH_TOKEN_USER_STORAGE_KEY);
  window.localStorage.removeItem(PUSH_TOKEN_REGISTRATION_VERSION_KEY);
}

async function deactivateCurrentDevicePushBeforeSignOut(): Promise<void> {
  if (!isCapacitorNative() || typeof window === 'undefined') return;

  const token = window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)?.trim() ?? '';
  let serverProtected = false;
  let nativeProtected = false;

  if (token) {
    try {
      const response = await authorizedFetch('/.netlify/functions/push-token', {
        method: 'POST',
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

/**
 * Canonical user-initiated sign-out boundary.
 *
 * On native mobile, protect push privacy while the Supabase JWT is still valid:
 * deactivate the current device token server-side and invalidate the native
 * registration. Only then destroy the authentication session.
 */
export async function secureSignOut(): Promise<void> {
  await deactivateCurrentDevicePushBeforeSignOut();

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
