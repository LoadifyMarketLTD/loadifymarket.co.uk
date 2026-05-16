import { useEffect } from 'react';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { isCapacitorNative } from '@/lib/capacitorUtils';

type PushPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | string;

interface PushPermissionResult {
  receive?: PushPermissionState;
}

interface PushToken {
  value?: string;
}

interface PushRegistrationError {
  error?: string;
}

interface PushListenerHandle {
  remove: () => void | Promise<void>;
}

interface PushNotificationsPlugin {
  checkPermissions?: () => Promise<PushPermissionResult>;
  requestPermissions: () => Promise<PushPermissionResult>;
  register: () => Promise<void>;
  addListener: (
    eventName: 'registration' | 'registrationError',
    listener: (payload: PushToken | PushRegistrationError) => void,
  ) => Promise<PushListenerHandle> | PushListenerHandle;
}

const PUSH_TOKEN_STORAGE_KEY = 'loadify:push-token:last-registered';
const PUSH_TOKEN_USER_STORAGE_KEY = 'loadify:push-token:last-user';

function getPushNotificationsPlugin(): PushNotificationsPlugin | null {
  if (typeof window === 'undefined') return null;

  const plugin = (
    window as Window & {
      Capacitor?: {
        Plugins?: {
          PushNotifications?: PushNotificationsPlugin;
        };
      };
    }
  ).Capacitor?.Plugins?.PushNotifications;

  if (!plugin?.requestPermissions || !plugin.register || !plugin.addListener) {
    return null;
  }

  return plugin;
}

function getPushPlatform(): 'android' | 'ios' {
  const platform = (
    window as Window & {
      Capacitor?: {
        getPlatform?: () => string;
      };
    }
  ).Capacitor?.getPlatform?.();

  return platform === 'ios' ? 'ios' : 'android';
}

async function persistTokenRegistration(userId: string, token: string): Promise<void> {
  const response = await authorizedFetch('/.netlify/functions/push-token', {
    method: 'POST',
    body: JSON.stringify({
      op: 'register',
      token,
      platform: getPushPlatform(),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` })) as { error?: string };
    throw new Error(errorBody.error ?? `HTTP ${response.status}`);
  }

  window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(PUSH_TOKEN_USER_STORAGE_KEY, userId);
}

export function usePushTokenRegistration(userId?: string): void {
  useEffect(() => {
    if (!userId || !isCapacitorNative() || typeof window === 'undefined') {
      return;
    }

    const plugin = getPushNotificationsPlugin();
    if (!plugin) {
      console.warn('push-token: PushNotifications plugin unavailable; skipping token registration');
      return;
    }

    let active = true;
    const handles: PushListenerHandle[] = [];

    const registerHandle = async (
      maybeHandle: Promise<PushListenerHandle> | PushListenerHandle,
    ): Promise<void> => {
      const resolved = await maybeHandle;
      if (!active) {
        await resolved.remove();
        return;
      }
      handles.push(resolved);
    };

    const syncToken = async (tokenValue?: string) => {
      const token = tokenValue?.trim();
      if (!active || !token) return;

      const previousToken = window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      const previousUserId = window.localStorage.getItem(PUSH_TOKEN_USER_STORAGE_KEY);
      if (previousToken === token && previousUserId === userId) {
        return;
      }

      try {
        await persistTokenRegistration(userId, token);
      } catch (error) {
        console.warn('push-token: failed to register device token (non-fatal):', error);
      }
    };

    const setup = async () => {
      await registerHandle(
        plugin.addListener('registration', (payload) => {
          void syncToken((payload as PushToken).value);
        }),
      );

      await registerHandle(
        plugin.addListener('registrationError', (payload) => {
          console.warn('push-token: native registration failed (non-fatal):', (payload as PushRegistrationError).error ?? payload);
        }),
      );

      let permission = await plugin.checkPermissions?.();
      if (!permission || (permission.receive !== 'granted' && permission.receive !== 'denied')) {
        permission = await plugin.requestPermissions();
      }

      if (permission.receive !== 'granted') {
        return;
      }

      await plugin.register();
    };

    void setup().catch((error) => {
      console.warn('push-token: setup failed (non-fatal):', error);
    });

    return () => {
      active = false;
      handles.forEach((handle) => {
        void handle.remove();
      });
    };
  }, [userId]);
}
