import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /.netlify/functions/connect-platform-check
 *
 * Admin-only endpoint that verifies whether the platform Stripe account has
 * enrolled in Stripe Connect. Returns { platformConfigured: boolean }.
 *
 * Called by the admin dashboard to surface a warning when Connect is not yet
 * enabled so the platform owner can take action before sellers attempt to
 * onboard and receive confusing error messages.
 *
 * Requires: Authorization: Bearer <supabase-jwt> (admin role)
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider not configured' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // Verify the caller is an admin.
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (userRow?.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) };
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

  // Safe key prefix: first 12 characters (e.g. "sk_live_XXXX") — never the full secret.
  const keyPrefix = stripeSecretKey.slice(0, 12) + '…';

  try {
    // stripe.accounts.list() is only available to Connect platforms.
    // A successful response (even with an empty list) confirms the platform
    // account has enrolled in Stripe Connect.
    await stripe.accounts.list({ limit: 1 });

    // Also retrieve the platform account ID so the admin can confirm which
    // Stripe account is active without needing to see the secret key.
    let platformAccountId: string | null = null;
    try {
      const platformAccount = await stripe.account.retrieve();
      platformAccountId = platformAccount.id;
    } catch {
      // Non-fatal — account ID is diagnostic only.
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ platformConfigured: true, keyPrefix, platformAccountId }),
    };
  } catch (error) {
    // Detect the specific "not signed up for Connect" error from Stripe.
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      (/signed up for connect/i.test(error.message) ||
        /not.*connect platform/i.test(error.message) ||
        /connect.*not.*enabled/i.test(error.message))
    ) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          platformConfigured: false,
          keyPrefix,
          setupUrl: 'https://dashboard.stripe.com/connect/accounts/overview',
        }),
      };
    }

    console.error('connect-platform-check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to check Connect platform status',
      }),
    };
  }
};
