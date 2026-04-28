import type { HandlerEvent } from '@netlify/functions';

/**
 * Extract the real client IP from a Netlify Function event.
 *
 * Priority order:
 *   1. CF-Connecting-IP  — set by Cloudflare with the original visitor IP
 *      when the site is proxied through Cloudflare (most accurate in that setup)
 *   2. x-forwarded-for   — first entry set by Netlify's CDN / other proxies
 *   3. client-ip         — direct connection fallback
 *
 * Returns undefined when none of the headers are present (e.g. unit tests).
 */
export function getClientIp(event: HandlerEvent): string | undefined {
  return (
    event.headers['cf-connecting-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['client-ip'] ||
    undefined
  );
}
