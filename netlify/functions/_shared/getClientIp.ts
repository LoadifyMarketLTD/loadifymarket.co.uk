import type { HandlerEvent } from '@netlify/functions';

/**
 * Extract the real client IP from a Netlify Function event.
 * Uses the first value of x-forwarded-for (set by Netlify's CDN) and falls
 * back to the direct client-ip header.  Returns undefined when neither is
 * present (e.g. in unit tests without network context).
 */
export function getClientIp(event: HandlerEvent): string | undefined {
  return (
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['client-ip'] ||
    undefined
  );
}
