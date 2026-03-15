import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /.netlify/functions/connect-onboard
 *
 * Creates (or resumes) a Stripe Connect Express onboarding session for the
 * authenticated seller. Returns { url } — the caller should redirect the
 * seller's browser to that URL to complete Stripe's hosted onboarding flow.
 *
 * After completion Stripe redirects to:
 *   return_url  → /seller?tab=payouts&connect=success
 *   refresh_url → /seller?tab=payouts&connect=refresh  (link expired / back btn)
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

  // Verify the JWT and derive the seller's user ID from it.
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  const sellerId = user.id;

  try {
    // Look up any existing Stripe account stored for this seller.
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripeAccountId, stripeConnectStatus')
      .eq('userId', sellerId)
      .single<{ stripeAccountId: string | null; stripeConnectStatus: string | null }>();

    if (profileError) {
      console.error('connect-onboard: profile lookup failed:', profileError.message);
      return { statusCode: 404, body: JSON.stringify({ error: 'Seller profile not found' }) };
    }

    let stripeAccountId = profile?.stripeAccountId ?? null;

    if (!stripeAccountId) {
      // Fetch the seller's email to pre-fill the Express account.
      const { data: sellerUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', sellerId)
        .single<{ email: string }>();

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        ...(sellerUser?.email ? { email: sellerUser.email } : {}),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'friday',
            },
          },
        },
      });

      stripeAccountId = account.id;

      // Persist immediately so we can resume onboarding if the link expires.
      await supabase
        .from('seller_profiles')
        .update({ stripeAccountId, stripeConnectStatus: 'pending' })
        .eq('userId', sellerId);
    }

    const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/seller?tab=payouts&connect=refresh`,
      return_url: `${appUrl}/seller?tab=payouts&connect=success`,
      type: 'account_onboarding',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: accountLink.url }),
    };
  } catch (error) {
    console.error('connect-onboard error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create onboarding link',
      }),
    };
  }
};
