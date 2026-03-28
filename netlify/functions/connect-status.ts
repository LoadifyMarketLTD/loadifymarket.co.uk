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

  // Log which Stripe account is active (key prefix only — never log the full secret).
  console.log(`connect-status: using Stripe key ${stripeSecretKey.slice(0, 12)}…`);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // Only sellers may poll their own Connect status.
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();
  if (userRow?.role !== 'seller') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Seller account required' }) };
  }

  try {
    const { data: profile } = await supabase
      .from('seller_profiles')
      .select('stripeAccountId')
      .eq('userId', user.id)
      .single<{ stripeAccountId: string | null }>();

    if (!profile?.stripeAccountId) {
      // No Stripe account yet — check profile completeness and return current status.
      let sellerStatus: string | null = null;
      let profileComplete = false;
      try {
        const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
        const result = await tryAutoActivateSeller(supabase, user.id);
        if (result) {
          sellerStatus = result.sellerStatus;
          profileComplete = result.profileComplete;
        }
      } catch (err) {
        console.warn('connect-status: activation check failed (non-fatal):', err);
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ stripeConnectStatus: null, sellerStatus, profileComplete }),
      };
    }

    let account: Stripe.Account;
    try {
      account = await stripe.accounts.retrieve(profile.stripeAccountId);
    } catch (retrieveError) {
      // If the account doesn't exist on THIS platform (e.g. after a platform
      // migration to a new Stripe account), clear the stale record so the
      // seller can re-onboard from scratch.
      if (
        retrieveError instanceof Stripe.errors.StripeInvalidRequestError &&
        /no such account/i.test(retrieveError.message)
      ) {
        console.warn(
          `connect-status: stripeAccountId ${profile.stripeAccountId} not found on current platform — clearing stale record for user ${user.id}`
        );
        await supabase
          .from('seller_profiles')
          .update({ stripeAccountId: null, stripeConnectStatus: null })
          .eq('userId', user.id);
        return {
          statusCode: 200,
          body: JSON.stringify({ stripeConnectStatus: null }),
        };
      }
      throw retrieveError;
    }

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

    // ── Auto-activation check ──────────────────────────────────────────────
    // After updating stripeConnectStatus, re-evaluate whether the seller now
    // meets all activation conditions.  tryAutoActivateSeller only writes to
    // the DB when the derived status differs from the stored one.
    let sellerStatus: string | null = null;
    let profileComplete = false;
    try {
      const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
      const result = await tryAutoActivateSeller(supabase, user.id);
      if (result) {
        sellerStatus = result.sellerStatus;
        profileComplete = result.profileComplete;

        // Send notifications if seller just became active for the first time
        if (result.firstActivation) {
          const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
          const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
          const activatedAt = new Date().toLocaleString('en-GB');
          const internalHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
          };

          // Notify admin
          if (adminEmail) {
            fetch(`${appUrl}/.netlify/functions/send-email`, {
              method: 'POST',
              headers: internalHeaders,
              body: JSON.stringify({
                to: adminEmail,
                subject: 'Loadify: Seller Account Now Active',
                template: 'admin_seller_active',
                data: { activatedAt },
              }),
            }).catch((err: unknown) =>
              console.warn('connect-status: admin notification failed (non-fatal):', err),
            );
          }

          // Notify the seller themselves
          if (user.email) {
            fetch(`${appUrl}/.netlify/functions/send-email`, {
              method: 'POST',
              headers: internalHeaders,
              body: JSON.stringify({
                to: user.email,
                subject: 'Your Loadify Market store is now live!',
                template: 'seller_account_active',
                data: { activatedAt },
              }),
            }).catch((err: unknown) =>
              console.warn('connect-status: seller activation email failed (non-fatal):', err),
            );
          }
        }
      }
    } catch (activationError) {
      // Non-fatal: Stripe status was already updated above.
      console.warn('connect-status: auto-activation check failed (non-fatal):', activationError);
    }
    // ──────────────────────────────────────────────────────────────────────

    return {
      statusCode: 200,
      body: JSON.stringify({
        stripeConnectStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        sellerStatus,
        profileComplete,
      }),
    };
  } catch (error) {
    console.error('connect-status error:', error);

    // Detect when the platform Stripe account has not enrolled in Connect.
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
