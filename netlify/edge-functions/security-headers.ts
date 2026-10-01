/**
 * Netlify Edge Function: security-headers
 *
 * Dormant helper retained for future request-context security work such as
 * CSP nonce injection. It is intentionally not registered globally because
 * the current HSTS and Permissions-Policy headers are emitted statically from
 * netlify.toml, avoiding an unnecessary Edge Function hop on HTML requests.
 *
 * @see https://docs.netlify.com/edge-functions/overview/
 */
import type { Context } from '@netlify/edge-functions';

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
