/**
 * Shared Expo push-notification helper.
 *
 * Used by stripe-webhook.ts and escrow-release.ts to deliver real-time push
 * notifications to mobile (Android / iOS) users via the Expo Push API.
 *
 * Non-fatal: a push failure never throws — it is logged and the caller's main
 * flow continues unaffected.
 *
 * Invalid/stale tokens reported by the Expo API are automatically marked
 * inactive in the push_tokens table so dead tokens don't grow unbounded.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload {
  title: string;
  body: string;
  /** Extra data forwarded to the mobile app's notification handler. */
  data?: Record<string, unknown>;
}

/** Expo push ticket response shape (subset). */
interface ExpoPushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
  id?: string;
}

/**
 * Delivers a push notification to all active devices registered for `userId`.
 *
 * Looks up `push_tokens` (populated by the `push-token` function) and fans out
 * to the Expo Push API in a single batched request.  Tokens that Expo reports
 * as invalid (DeviceNotRegistered or InvalidCredentials) are marked inactive
 * so they are excluded from future batches.
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  notification: PushPayload,
): Promise<void> {
  try {
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('id, token')
      .eq('userId', userId)
      .eq('isActive', true);

    if (!tokenRows?.length) return;

    const messages = tokenRows.map((t: { id: string; token: string }) => ({
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
      return;
    }

    // Parse tickets and deactivate any tokens Expo flagged as invalid.
    // Expo returns one ticket per message in the same order as the request.
    let tickets: ExpoPushTicket[] = [];
    try {
      const json = await res.json() as { data?: ExpoPushTicket[] };
      tickets = json.data ?? [];
    } catch {
      // Non-fatal — if we can't parse the response we skip cleanup
      return;
    }

    const INVALID_ERRORS = new Set(['DeviceNotRegistered', 'InvalidCredentials']);
    const invalidTokenIds: string[] = [];

    tickets.forEach((ticket, idx) => {
      if (
        ticket.status === 'error' &&
        ticket.details?.error &&
        INVALID_ERRORS.has(ticket.details.error)
      ) {
        const tokenRow = tokenRows[idx];
        if (tokenRow) {
          invalidTokenIds.push(tokenRow.id);
        }
      }
    });

    if (invalidTokenIds.length > 0) {
      await supabase
        .from('push_tokens')
        .update({ isActive: false })
        .in('id', invalidTokenIds)
        .catch((err: unknown) =>
          console.warn('sendPushToUser: failed to deactivate stale tokens (non-fatal):', err),
        );
    }
  } catch (err) {
    // Non-fatal — push failure must never break the caller's main flow.
    console.warn('sendPushToUser: error sending push notification (non-fatal):', err);
  }
}
