import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';

/**
 * POST /.netlify/functions/connect-onboard
 *
 * Creates (or resumes) a Stripe Connect Express onboarding session for the
 * authenticated seller. Returns { url } — the caller should redirect the
 * seller's browser to that URL to complete Stripe's hosted onboarding flow.
 *
 * After completion Stripe redirects to:
 *   return_url  → /seller/setup?connect=success
 *   refresh_url → /seller/setup?connect=refresh  (link expired / back btn)
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

  // Log which Stripe account is active (key prefix only — never log the full secret).
  console.log(`connect-onboard: using Stripe key ${stripeSecretKey.slice(0, 12)}…`);

  // Verify the JWT and derive the seller's user ID from it.
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // Only sellers may initiate Connect onboarding.
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();
  if (userRow?.role !== 'seller') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Seller account required' }) };
  }

  const sellerId = user.id;

  // ── Rate limiting: 5 onboarding link requests per seller per hour ─────────
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
  // ─────────────────────────────────────────────────────────────────────────

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

    // ── Stale-account guard ─────────────────────────────────────────────────
    // If the platform migrated to a new Stripe account, any Express accounts
    // created on the old platform will return "No such account" on the new
    // API key. Detect this and clear the stale ID so the seller can re-onboard
    // from scratch on the current platform.
    if (stripeAccountId) {
      try {
        await stripe.accounts.retrieve(stripeAccountId);
      } catch (retrieveError) {
        if (
          retrieveError instanceof Stripe.errors.StripeInvalidRequestError &&
          /no such account/i.test(retrieveError.message)
        ) {
          console.warn(
            `connect-onboard: stripeAccountId ${stripeAccountId} not found on current platform — clearing stale record for seller ${sellerId}`
          );
          stripeAccountId = null;
          await supabase
            .from('seller_profiles')
            .update({ stripeAccountId: null, stripeConnectStatus: null })
            .eq('userId', sellerId);
        } else {
          throw retrieveError;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

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

    // Detect when the platform Stripe account has not enrolled in Connect.
    // Stripe returns an InvalidRequestError with a message containing
    // "signed up for Connect" or similar variants in this case.
    // This fires when either accounts.create() or accountLinks.create() is
    // rejected because the STRIPE_SECRET_KEY belongs to an account that is
    // not a Connect platform.
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      (/signed up for connect/i.test(error.message) ||
        /not.*connect platform/i.test(error.message) ||
        /connect.*not.*enabled/i.test(error.message))
    ) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error:
            'Stripe Connect is not yet enabled on this platform. ' +
            'The marketplace owner must activate Stripe Connect by visiting ' +
            'https://dashboard.stripe.com/connect/accounts/overview and completing ' +
            'the platform onboarding before sellers can connect their accounts.',
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
