/**
 * authorizedFetch — shared utility for calling Netlify functions with the
 * user's Supabase JWT in the Authorization header.
 *
 * Automatically proactively refreshes the access token when it has expired
 * or will expire within 60 seconds.  This prevents "Unauthorized" (401/403)
 * errors from Netlify functions caused by silently-expired tokens, which is
 * especially common on the mobile APK after a cold restart or a long session.
 */

import { supabase } from './supabase';

/**
 * Make an authorized fetch to a Netlify function (or any endpoint that
 * requires a Supabase JWT Bearer token).
 *
 * Handles:
 *  - Proactive token refresh (60-second window before expiry)
 *  - Sets Content-Type: application/json automatically
 *  - Throws a clear error if the session is missing or expired
 *
 * @param path   URL to fetch (relative /.netlify/functions/... is rewritten
 *               to absolute on APK by patchCapacitorFetch in main.tsx)
 * @param init   Standard RequestInit — do NOT set Authorization (it is set here)
 */
export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let { data: { session } } = await supabase.auth.getSession();

  // Decode the JWT payload to check the expiry time (no library needed — JWTs
  // are just base64url-encoded JSON).  If the token has already expired or will
  // expire within 60 s, force-refresh it before making the request so the
  // Netlify function never receives a stale token.
  if (session?.access_token) {
    try {
      const [, rawPayload] = session.access_token.split('.');
      const padded =
        rawPayload.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - (rawPayload.length % 4)) % 4);
      const payload = JSON.parse(atob(padded)) as { exp?: number };
      if (payload.exp && payload.exp * 1000 - Date.now() < 60_000) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session) session = refreshed.session;
      }
    } catch {
      /* ignore JWT parse errors */
    }
  }

  if (!session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(path, { ...init, headers });
}
