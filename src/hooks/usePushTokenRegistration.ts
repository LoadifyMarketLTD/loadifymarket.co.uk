import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type RegistrationError,
  type Token,
} from '@capacitor/push-notifications';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { isCapacitorNative } from '@/lib/capacitorUtils';

const PUSH_TOKEN_STORAGE_KEY = 'loadify:push-token:last-registered';
const PUSH_TOKEN_USER_STORAGE_KEY = 'loadify:push-token:last-user';

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

function routeFromPushAction(action: ActionPerformed): string {
  const data = action.notification.data ?? {};
  const candidates = [data.path, data.route, data.url];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;

    try {
      const parsed = new URL(candidate, 'https://loadifymarket.co.uk');
      if (parsed.origin === 'https://loadifymarket.co.uk') {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // Ignore malformed notification routes and fall back to notifications.
    }
  }

  return '/notifications';
}

export function usePushTokenRegistration(userId?: string): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !isCapacitorNative() || typeof window === 'undefined') {
      return;
    }

    let active = true;
    const handles: PluginListenerHandle[] = [];

    const registerHandle = async (
      maybeHandle: Promise<PluginListenerHandle>,
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
        PushNotifications.addListener('registration', (token: Token) => {
          void syncToken(token.value);
        }),
      );

      await registerHandle(
        PushNotifications.addListener('registrationError', (error: RegistrationError) => {
          console.warn('push-token: native registration failed (non-fatal):', error.error ?? error);
        }),
      );

      await registerHandle(
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          if (!active) return;
          navigate(routeFromPushAction(action));
        }),
      );

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
        permission = await PushNotifications.requestPermissions();
      }

      if (permission.receive !== 'granted') {
        return;
      }

      await PushNotifications.register();
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
  }, [navigate, userId]);
}
