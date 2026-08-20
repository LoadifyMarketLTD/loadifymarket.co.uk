import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';

/**
 * POST /.netlify/functions/connect-onboard
 *
 * Creates (or resumes) a Stripe Connect Express onboarding session for the
 * authenticated active seller. Returns { url }.
 *
 * P1 tax evidence rule:
 * every account created here is explicitly GB and that Stripe-derived country is
 * persisted as server-only tax-country evidence together with the account id.
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

  // Stripe onboarding can create external financial accounts and persist their
  // identifiers through service_role. Require the seller to be active now, not
  // merely in possession of a still-valid access token.
  const auth = await authenticateActiveAccount(event, supabase, ['seller']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Active seller account required' }),
    };
  }

  const sellerId = auth.actor.id;

  const rl = await checkRateLimit({
    supabase,
    tableName: 'connect_onboard_rate_limits',
    identifier: sellerId,
    windowMinutes: 60,
    maxAttempts: 5,
  });
  if (rl.exceeded) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many onboarding requests. Please try again later.' }),
    };
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripeAccountId, stripeConnectStatus')
      .eq('userId', sellerId)
      .maybeSingle<{ stripeAccountId: string | null; stripeConnectStatus: string | null }>();

    if (profileError) {
      console.error('connect-onboard: profile lookup failed:', profileError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to look up seller profile. Please try again.' }) };
    }
    if (!profile) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Seller profile not found. Please contact support if you believe this is an error.' }) };
    }

    let stripeAccountId = profile.stripeAccountId ?? null;

    if (stripeAccountId) {
      try {
        await stripe.accounts.retrieve(stripeAccountId);
      } catch (retrieveError) {
        if (
          retrieveError instanceof Stripe.errors.StripeInvalidRequestError &&
          /no such account/i.test(retrieveError.message)
        ) {
          console.warn(`connect-onboard: stored Stripe account is not on current platform; clearing stale record for seller ${sellerId}`);
          stripeAccountId = null;
          const { error: clearError } = await supabase
            .from('seller_profiles')
            .update({
              stripeAccountId: null,
              stripeConnectStatus: null,
              taxCountry: null,
              taxCountrySource: null,
              taxCountryCapturedAt: null,
            })
            .eq('userId', sellerId);
          if (clearError) throw clearError;
        } else {
          throw retrieveError;
        }
      }
    }

    if (!stripeAccountId) {
      const sellerEmail = auth.actor.email;
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        ...(sellerEmail ? { email: sellerEmail } : {}),
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

      const taxCountry = account.country?.trim().toUpperCase() || 'GB';
      const { error: persistError } = await supabase
        .from('seller_profiles')
        .update({
          stripeAccountId,
          stripeConnectStatus: 'pending',
          taxCountry,
          taxCountrySource: 'stripe_connect_account_v1',
          taxCountryCapturedAt: new Date().toISOString(),
        })
        .eq('userId', sellerId);
      if (persistError) {
        throw new Error(`Failed to persist Stripe onboarding account: ${persistError.message}`);
      }
    }

    const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/seller/setup?connect=refresh`,
      return_url: `${appUrl}/seller/setup?connect=success`,
      type: 'account_onboarding',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: accountLink.url }),
    };
  } catch (error) {
    console.error('connect-onboard error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to create onboarding link',
      }),
    };
  }
};