import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /.netlify/functions/connect-status
 *
 * Fetches the live Stripe Connect account status for the authenticated seller
 * and persists the result in seller_profiles.stripeConnectStatus. Called by
 * the seller dashboard when the seller returns from Stripe onboarding
 * (?connect=success | ?connect=refresh) or when they open the payouts tab.
 *
 * Returns:
 *   { stripeConnectStatus, chargesEnabled, payoutsEnabled, detailsSubmitted }
 *
 * Requires: Authorization: Bearer <supabase-jwt>
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
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  try {
    const { data: profile } = await supabase
      .from('seller_profiles')
      .select('stripeAccountId')
      .eq('userId', user.id)
      .single<{ stripeAccountId: string | null }>();

    if (!profile?.stripeAccountId) {
      // No Stripe account yet — return null status without error.
      return {
        statusCode: 200,
        body: JSON.stringify({ stripeConnectStatus: null }),
      };
    }

    const account = await stripe.accounts.retrieve(profile.stripeAccountId);

    let stripeConnectStatus: 'pending' | 'restricted' | 'active';
    if (account.charges_enabled && account.payouts_enabled) {
      stripeConnectStatus = 'active';
    } else if (account.details_submitted) {
      stripeConnectStatus = 'restricted';
    } else {
      stripeConnectStatus = 'pending';
    }

    // Persist the refreshed status so the dashboard doesn't need to poll Stripe.
    await supabase
      .from('seller_profiles')
      .update({ stripeConnectStatus })
      .eq('userId', user.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        stripeConnectStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      }),
    };
  } catch (error) {
    console.error('connect-status error:', error);

    // Detect when the platform Stripe account has not enrolled in Connect.
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      /signed up for connect/i.test(error.message)
    ) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error:
            'Stripe Connect is not yet enabled on this platform.',
          platformNotConfigured: true,
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch account status',
      }),
    };
  }
};
