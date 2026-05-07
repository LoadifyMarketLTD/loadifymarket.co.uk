/**
 * Netlify Edge Function: security-headers
 *
 * Runs at the Netlify edge (Deno runtime, globally distributed) and adds
 * security headers to every HTML response before it reaches the browser.
 * Edge functions run faster than regular Netlify Functions because they
 * execute at the CDN edge node closest to the visitor rather than in a
 * regional Lambda.
 *
 * This complements the static headers set in netlify.toml for cases where
 * dynamic request context is needed (e.g. future nonce injection for CSP).
 *
 * @see https://docs.netlify.com/edge-functions/overview/
 */
import type { Config, Context } from '@netlify/edge-functions';

export default async function securityHeaders(
  request: Request,
  context: Context,
): Promise<Response> {
  const response = await context.next();

  const contentType = response.headers.get('content-type') ?? '';

  // Only modify HTML responses — skip JSON, images, scripts, etc.
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Clone so we can mutate headers (Response headers are immutable).
  const headers = new Headers(response.headers);

  // Permissions Policy — restrict potentially sensitive browser APIs.
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)',
  );

  // Strict Transport Security — tell browsers to use HTTPS for 1 year.
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload',
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const config: Config = {
  // Run on every HTML page request.
  path: '/*',
};
