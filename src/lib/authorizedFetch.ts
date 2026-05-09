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
import { isCapacitorContext } from './capacitorUtils';

/**
 * The live Netlify deployment base URL, used to rewrite relative
 * `/.netlify/functions/` paths to absolute URLs on the Capacitor APK.
 *
 * On APK, relative Netlify function URLs can fail in two ways:
 * 1. Without patchCapacitorFetch: resolved to https://localhost/... (file server
 *    returns index.html — "Empty or non-JSON response from server (200)").
 * 2. If CapacitorHttp's JS injection overwrites our window.fetch patch after
 *    main.tsx runs, the rewrite in patchCapacitorFetch is bypassed entirely.
 *
 * Applying the rewrite directly inside authorizedFetch removes the dependency
 * on the window.fetch patch order and guarantees correctness on every APK build.
 */
const NETLIFY_BASE = (
  (() => {
    const envBase = import.meta.env.VITE_APP_URL as string | undefined;
    const trimmed = typeof envBase === 'string' ? envBase.trim() : '';
    return trimmed || 'https://loadifymarket.co.uk';
  })()
// The hard-coded fallback is safe: this rewrite only runs on the native APK
// (isCapacitorContext() guard below) where loadifymarket.co.uk is always the
// correct backend.  Mirrors the same pattern in capacitorFetchPatch.ts.
).replace(/\/$/, '');

function resolveUrl(path: string): string {
  if (isCapacitorContext() && path.startsWith('/.netlify/functions/')) {
    return `${NETLIFY_BASE}${path}`;
  }
  return path;
}

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
 *               to absolute on APK both here and by patchCapacitorFetch in main.tsx)
 * @param init   Standard RequestInit — do NOT set Authorization (it is set here)
 */
export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  // Rewrite relative Netlify function paths to absolute URLs on Capacitor APK.
  // This is a defensive duplicate of the rewrite in patchCapacitorFetch; it
  // ensures correctness even if CapacitorHttp's own JS injection overwrites our
  // window.fetch patch after main.tsx runs.
  const url = resolveUrl(path);

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

  return fetch(url, { ...init, headers });
}
