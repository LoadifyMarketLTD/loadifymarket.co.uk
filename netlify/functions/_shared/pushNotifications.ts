/**
 * Shared mobile push-notification helper.
 *
 * Supports:
 * - legacy Expo push tokens through the Expo Push API;
 * - native Android FCM registration tokens through the FCM HTTP v1 API.
 *
 * Push delivery is intentionally non-fatal: a provider/configuration failure
 * must never break the caller's primary order/payment flow.
 */

import { createSign } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload {
  title: string;
  body: string;
  /** Extra data forwarded to the mobile app's notification handler. */
  data?: Record<string, unknown>;
}

interface PushTokenRow {
  id: string;
  token: string;
  platform: 'android' | 'ios' | 'web' | string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
  id?: string;
}

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface FcmOAuthToken {
  access_token: string;
  expires_in?: number;
}

interface FcmErrorResponse {
  error?: {
    status?: string;
    message?: string;
    details?: Array<{
      '@type'?: string;
      errorCode?: string;
    }>;
  };
}

let cachedFcmAccessToken: {
  token: string;
  projectId: string;
  expiresAt: number;
} | null = null;

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function isExpoPushToken(token: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token.trim());
}

function toFcmData(data?: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value === undefined || value === null) continue;
    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return result;
}

function readFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<FirebaseServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.warn('sendPushToUser: FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields; FCM skipped');
      return null;
    }
    return parsed as FirebaseServiceAccount;
  } catch (error) {
    console.warn('sendPushToUser: FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON; FCM skipped', error);
    return null;
  }
}

async function getFcmAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string | null> {
  const now = Date.now();
  if (
    cachedFcmAccessToken &&
    cachedFcmAccessToken.projectId === serviceAccount.project_id &&
    cachedFcmAccessToken.expiresAt > now + 60_000
  ) {
    return cachedFcmAccessToken.token;
  }

  const issuedAt = Math.floor(now / 1000);
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const claims = base64UrlJson({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  });
  const unsignedJwt = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const assertion = `${unsignedJwt}.${signer.sign(serviceAccount.private_key, 'base64url')}`;

  const tokenEndpoint = serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn(`sendPushToUser: Firebase OAuth token request failed (${response.status}): ${text}`);
    return null;
  }

  const payload = await response.json() as Partial<FcmOAuthToken>;
  if (!payload.access_token) {
    console.warn('sendPushToUser: Firebase OAuth response did not include access_token');
    return null;
  }

  const expiresInSeconds = Math.max(60, Number(payload.expires_in ?? 3600));
  cachedFcmAccessToken = {
    token: payload.access_token,
    projectId: serviceAccount.project_id,
    expiresAt: now + expiresInSeconds * 1000,
  };
  return payload.access_token;
}

async function sendExpoPushes(
  tokenRows: PushTokenRow[],
  notification: PushPayload,
): Promise<string[]> {
  if (tokenRows.length === 0) return [];

  const messages = tokenRows.map((row) => ({
    to: row.token,
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
    sound: 'default',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn(`sendPushToUser: Expo push API ${response.status}: ${text}`);
    return [];
  }

  let tickets: ExpoPushTicket[] = [];
  try {
    const json = await response.json() as { data?: ExpoPushTicket[] };
    tickets = json.data ?? [];
  } catch {
    return [];
  }

  const invalidErrors = new Set(['DeviceNotRegistered', 'InvalidCredentials']);
  const invalidIds: string[] = [];
  tickets.forEach((ticket, index) => {
    if (ticket.status === 'error' && ticket.details?.error && invalidErrors.has(ticket.details.error)) {
      const row = tokenRows[index];
      if (row) invalidIds.push(row.id);
    }
  });
  return invalidIds;
}

async function sendAndroidFcmPushes(
  tokenRows: PushTokenRow[],
  notification: PushPayload,
): Promise<string[]> {
  if (tokenRows.length === 0) return [];

  const serviceAccount = readFirebaseServiceAccount();
  if (!serviceAccount) {
    console.warn('sendPushToUser: native Android tokens exist but Firebase service-account configuration is missing');
    return [];
  }

  const accessToken = await getFcmAccessToken(serviceAccount);
  if (!accessToken) return [];

  const invalidIds: string[] = [];
  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount.project_id)}/messages:send`;

  for (const row of tokenRows) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: row.token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: toFcmData(notification.data),
          android: {
            priority: 'high',
          },
        },
      }),
    });

    if (response.ok) continue;

    let errorPayload: FcmErrorResponse | null = null;
    try {
      errorPayload = await response.json() as FcmErrorResponse;
    } catch {
      const text = await response.text().catch(() => '');
      console.warn(`sendPushToUser: FCM ${response.status} for token row ${row.id}: ${text}`);
      continue;
    }

    const fcmErrorCode = errorPayload.error?.details?.find(
      (detail) => detail['@type']?.includes('google.firebase.fcm.v1.FcmError'),
    )?.errorCode;

    if (fcmErrorCode === 'UNREGISTERED') {
      invalidIds.push(row.id);
    } else {
      console.warn(
        `sendPushToUser: FCM ${response.status} for token row ${row.id}: ${fcmErrorCode ?? errorPayload.error?.status ?? errorPayload.error?.message ?? 'unknown error'}`,
      );
    }
  }

  return invalidIds;
}

/**
 * Delivers a push notification to all active devices registered for `userId`.
 * Legacy Expo tokens continue to use Expo. Native Android registration tokens
 * use Firebase Cloud Messaging HTTP v1. Raw iOS/APNs delivery is not enabled by
 * this Android-focused implementation and is skipped rather than misrouted.
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  notification: PushPayload,
): Promise<void> {
  try {
    const { data: rows } = await supabase
      .from('push_tokens')
      .select('id, token, platform')
      .eq('userId', userId)
      .eq('isActive', true);

    const tokenRows = (rows ?? []) as PushTokenRow[];
    if (tokenRows.length === 0) return;

    const expoRows = tokenRows.filter((row) => isExpoPushToken(row.token));
    const androidFcmRows = tokenRows.filter(
      (row) => row.platform === 'android' && !isExpoPushToken(row.token),
    );
    const unsupportedRows = tokenRows.filter(
      (row) => row.platform !== 'android' && !isExpoPushToken(row.token),
    );

    if (unsupportedRows.length > 0) {
      console.warn(`sendPushToUser: skipping ${unsupportedRows.length} unsupported non-Expo native push token(s)`);
    }

    const invalidIds = [
      ...(await sendExpoPushes(expoRows, notification)),
      ...(await sendAndroidFcmPushes(androidFcmRows, notification)),
    ];

    if (invalidIds.length > 0) {
      const { error } = await supabase
        .from('push_tokens')
        .update({ isActive: false })
        .in('id', invalidIds);

      if (error) {
        console.warn('sendPushToUser: failed to deactivate stale tokens (non-fatal):', error.message);
      }
    }
  } catch (error) {
    console.warn('sendPushToUser: error sending push notification (non-fatal):', error);
  }
}
