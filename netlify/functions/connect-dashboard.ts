import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /.netlify/functions/connect-dashboard
 *
 * Returns { url } — a short-lived Stripe Express dashboard login link for
 * the authenticated seller. Opens the seller's Stripe Express dashboard in
 * a new tab where they can view payouts, balance, and account settings.
 *
 * Requires: Authorization: Bearer <supabase-jwt>
 * Seller must have already completed Connect onboarding (stripeAccountId set).
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
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No Stripe account connected. Please complete onboarding first.' }),
      };
    }

    const loginLink = await stripe.accounts.createLoginLink(profile.stripeAccountId);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: loginLink.url }),
    };
  } catch (error) {
    console.error('connect-dashboard error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create dashboard link',
      }),
    };
  }
};
