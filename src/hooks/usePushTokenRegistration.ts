import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type RegistrationError,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { isCapacitorNative } from '@/lib/capacitorUtils';
import { toast } from '@/hooks/use-toast';
import {
  PUSH_TOKEN_REGISTRATION_VERSION,
  clearPushRegistrationCache,
  getPushRegistrationCache,
  persistPushRegistrationCache,
} from '@/lib/secureSignOut';

const nativePushEnabled = import.meta.env.VITE_NATIVE_PUSH_ENABLED === 'true';
const PUSH_CONSENT_KEY = 'loadify.nativePush.userConsent.v1';
const PUSH_CONSENT_EVENT = 'loadify:native-push-consent';

export async function enableNativePushNotifications(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!nativePushEnabled || !isCapacitorNative()) return 'unsupported';
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== 'granted') return 'denied';
  window.localStorage.setItem(PUSH_CONSENT_KEY, 'true');
  window.dispatchEvent(new Event(PUSH_CONSENT_EVENT));
  return 'granted';
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

  await persistPushRegistrationCache(userId, token);
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

  return '/profile/notifications';
}

export function usePushTokenRegistration(userId?: string): void {
  const navigate = useNavigate();
  const previousUserIdRef = useRef<string | undefined>(userId);
  const [hasPushConsent, setHasPushConsent] = useState(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(PUSH_CONSENT_KEY) === 'true',
  );

  useEffect(() => {
    const syncConsent = () => setHasPushConsent(window.localStorage.getItem(PUSH_CONSENT_KEY) === 'true');
    window.addEventListener(PUSH_CONSENT_EVENT, syncConsent);
    return () => window.removeEventListener(PUSH_CONSENT_EVENT, syncConsent);
  }, []);

  // Native push must only be enabled in Android/iOS builds that actually bundle
  // their Firebase/APNs configuration. Calling register() without Firebase on
  // Android is process-fatal inside the native plugin and cannot be recovered by
  // a JavaScript promise catch. Debug/local APKs therefore fail closed here.
  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId;

    if (
      !nativePushEnabled ||
      !previousUserId ||
      userId ||
      !isCapacitorNative() ||
      typeof window === 'undefined'
    ) {
      return;
    }

    void (async () => {
      try {
        await PushNotifications.unregister();
        await clearPushRegistrationCache();
      } catch (error) {
        console.warn('push-token: native unregister after session loss failed:', error);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!nativePushEnabled || !hasPushConsent || !userId || !isCapacitorNative() || typeof window === 'undefined') {
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

      const previousRegistration = await getPushRegistrationCache();
      if (!active) return;

      if (
        previousRegistration.token === token &&
        previousRegistration.userId === userId &&
        previousRegistration.version === PUSH_TOKEN_REGISTRATION_VERSION
      ) {
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
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          if (!active) return;
          toast({
            title: notification.title || 'Loadify Market',
            description: notification.body || 'You have a new marketplace update.',
          });
          window.dispatchEvent(new CustomEvent('loadify:push-received', { detail: notification.data ?? {} }));
        }),
      );

      await registerHandle(
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          if (!active) return;
          navigate(routeFromPushAction(action));
        }),
      );

      const permission = await PushNotifications.checkPermissions();
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
  }, [hasPushConsent, navigate, userId]);
}
