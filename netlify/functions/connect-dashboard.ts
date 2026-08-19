import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';

/**
 * POST /.netlify/functions/connect-dashboard
 *
 * Returns { url } — a short-lived Stripe Express dashboard login link for the
 * authenticated active seller.
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
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

  const auth = await authenticateActiveAccount(event, supabase, ['seller']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Active seller account required' }),
    };
  }

  const sellerId = auth.actor.id;

  try {
    const { data: profile } = await supabase
      .from('seller_profiles')
      .select('stripeAccountId')
      .eq('userId', sellerId)
      .single<{ stripeAccountId: string | null }>();

    if (!profile?.stripeAccountId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No Stripe account connected. Please complete onboarding first.' }),
      };
    }

    try {
      await stripe.accounts.retrieve(profile.stripeAccountId);
    } catch (retrieveError) {
      if (
        retrieveError instanceof Stripe.errors.StripeInvalidRequestError &&
        /no such account/i.test(retrieveError.message)
      ) {
        console.warn(`connect-dashboard: stored Stripe account is not on current platform; clearing stale record for user ${sellerId}`);
        const { error: clearError } = await supabase
          .from('seller_profiles')
          .update({ stripeAccountId: null, stripeConnectStatus: null })
          .eq('userId', sellerId);
        if (clearError) throw clearError;
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'No Stripe account connected. Please complete onboarding first.' }),
        };
      }
      throw retrieveError;
    }

    const loginLink = await stripe.accounts.createLoginLink(profile.stripeAccountId);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: loginLink.url }),
    };
  } catch (error) {
    console.error('connect-dashboard error:', error);

    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      (/signed up for connect/i.test(error.message) ||
        /not.*connect platform/i.test(error.message) ||
        /connect.*not.*enabled/i.test(error.message))
    ) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'Stripe Connect is not yet enabled on this platform.',
          platformNotConfigured: true,
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create dashboard link',
      }),
    };
  }
};
