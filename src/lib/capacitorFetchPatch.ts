/**
 * capacitorFetchPatch
 *
 * On Capacitor Android APK, relative URLs such as `/.netlify/functions/...`
 * are resolved against the WebView's base origin (`https://localhost`).  The
 * local Capacitor file server has no knowledge of Netlify functions and
 * responds with the bundled `index.html` (HTTP 200, Content-Type: text/html),
 * which causes every `res.json()` call in the app to throw and surfaces as
 * "Empty or non-JSON response from server (200)".
 *
 * This patch wraps `window.fetch` before React mounts and rewrites any
 * relative `/.netlify/functions/` path to an absolute URL pointing at the
 * live Netlify deployment.  The rewrite is a no-op on the web (where
 * `isCapacitorNative()` returns false) so the production website is
 * completely unaffected.
 *
 * Call `patchCapacitorFetch()` once, as early as possible in `main.tsx`,
 * before any component or hook runs.
 */

import { isCapacitorContext } from './capacitorUtils';

/**
 * The production Netlify deployment URL.  Sourced from the VITE_APP_URL env
 * variable (set at APK build time in the GitHub Actions workflow) so the same
 * patch logic works for staging builds too.  The hard-coded fallback is safe
 * because `patchCapacitorFetch()` is a no-op on the web — it only runs inside
 * the Android APK where loadifymarket.co.uk is always the correct backend.
 */
const NETLIFY_BASE: string = (
  (() => {
    const envBase = import.meta.env.VITE_APP_URL as string | undefined;
    const trimmed = typeof envBase === 'string' ? envBase.trim() : '';
    return trimmed || 'https://loadifymarket.co.uk';
  })()
).replace(/\/$/, '');

/**
 * Rewrite a single URL string: if it is a relative `/.netlify/functions/`
 * path, prepend the Netlify deployment base URL.
 */
function rewriteUrl(url: string): string {
  if (url.startsWith('/.netlify/functions/')) {
    return `${NETLIFY_BASE}${url}`;
  }
  return url;
}

/**
 * Patch `window.fetch` to resolve relative Netlify function URLs to absolute
 * URLs when running inside the Capacitor native APK.
 *
 * Must be called before React renders so every subsequent `fetch()` call in
 * any component or hook goes through the rewrite.
 */
export function patchCapacitorFetch(): void {
  // Only patch inside the native APK; leave the web browser untouched.
  if (!isCapacitorContext()) return;
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  const originalFetch: typeof fetch = window.fetch.bind(window);

  window.fetch = function capacitorApiFetch(
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): ReturnType<typeof fetch> {
    // Rewrite relative /.netlify/functions/ URLs to absolute.
    // In practice every call in this codebase uses a plain string URL, so the
    // URL-object and Request-object branches are purely defensive.
    if (typeof input === 'string') {
      input = rewriteUrl(input);
    } else if (input instanceof URL) {
      const rewritten = rewriteUrl(input.toString());
      if (rewritten !== input.toString()) {
        input = new URL(rewritten);
      }
    } else if (input instanceof Request && input.url.startsWith('/.netlify/functions/')) {
      // Clone the Request with the rewritten URL by extracting all serialisable
      // init properties explicitly (Request.url is read-only).
      input = new Request(rewriteUrl(input.url), {
        method: input.method,
        headers: input.headers,
        // body cannot be read from an already-constructed Request without
        // consuming its stream, so we omit it here.  GET/HEAD have no body
        // and POST bodies are passed via `init` in all callers of this app.
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity,
        keepalive: input.keepalive,
        signal: input.signal,
      });
    }

    return originalFetch(input, init);
  };
}
