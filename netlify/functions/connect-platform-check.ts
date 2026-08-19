import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';

/**
 * POST /.netlify/functions/connect-platform-check
 *
 * Admin-only endpoint that verifies whether the platform Stripe account has
 * enrolled in Stripe Connect. No secret-key material is returned to the client.
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase, ['admin']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Admin access required' }),
    };
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

  try {
    await stripe.accounts.list({ limit: 1 });

    let platformAccountId: string | null = null;
    try {
      const platformAccount = await stripe.account.retrieve();
      platformAccountId = platformAccount.id;
    } catch {
      // Non-fatal — account ID is diagnostic only.
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ platformConfigured: true, platformAccountId }),
    };
  } catch (error) {
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
