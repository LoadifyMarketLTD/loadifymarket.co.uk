import type { Handler } from '@netlify/functions';

/**
 * Legacy public registration endpoint.
 *
 * Retired by the signup-intent Auth cutover.
 *
 * Public account creation must use:
 *   1. POST /.netlify/functions/register-intent
 *   2. supabase.auth.signUp(...) in the client
 *
 * Passwords must never be sent to this Netlify endpoint and public callers
 * must never assign marketplace roles through Auth app_metadata.
 */
export const handler: Handler = async () => ({
  statusCode: 410,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify({
    error:
      'This registration endpoint has been retired. Please use the current account creation flow.',
  }),
});
