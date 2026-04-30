/**
 * Shared Expo push-notification helper.
 *
 * Used by stripe-webhook.ts and escrow-release.ts to deliver real-time push
 * notifications to mobile (Android / iOS) users via the Expo Push API.
 *
 * Non-fatal: a push failure never throws — it is logged and the caller's main
 * flow continues unaffected.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload {
  title: string;
  body: string;
  /** Extra data forwarded to the mobile app's notification handler. */
  data?: Record<string, unknown>;
}

/**
 * Delivers a push notification to all active devices registered for `userId`.
 *
 * Looks up `push_tokens` (populated by the `push-token` function) and fans out
 * to the Expo Push API in a single batched request.  Tokens that Expo reports
 * as invalid are silently ignored — the app should clean them up on next launch.
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  notification: PushPayload,
): Promise<void> {
  try {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('userId', userId)
      .eq('isActive', true);

    if (!tokens?.length) return;

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      sound: 'default',
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`sendPushToUser: Expo push API ${res.status} for userId=${userId}: ${text}`);
    }
  } catch (err) {
    // Non-fatal — push failure must never break the caller's main flow.
    console.warn('sendPushToUser: error sending push notification (non-fatal):', err);
  }
}
