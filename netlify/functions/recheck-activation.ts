import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /.netlify/functions/recheck-activation
 *
 * Re-evaluates a seller's activation status using only data already persisted
 * in the database — no live Stripe API call is made. This makes it suitable
 * as a fast, reliable trigger after a profile save (where stripeConnectStatus
 * is already known) or as a fallback when connect-status cannot reach Stripe.
 *
 * Use-cases:
 *   - Called by SellerProfile after every profile save (replaces the previous
 *     fire-and-forget connect-status call).
 *   - Called by SellerSetupPage when the DB already shows stripeConnectStatus
 *     = 'active' — avoids a redundant Stripe API round-trip.
 *
 * Returns:
 *   { sellerStatus, profileComplete }
 *
 * Requires: Authorization: Bearer <supabase-jwt>
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
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

  // Only sellers may trigger activation re-evaluation.
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();
  if (userRow?.role !== 'seller') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Seller account required' }) };
  }

  try {
    const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
    // No liveStripeConnectStatus passed — uses the persisted DB value.
    // This is intentional: stripeConnectStatus was already set by either the
    // Stripe webhook (account.updated) or a prior connect-status call. We are
    // only re-evaluating whether all conditions are simultaneously met NOW
    // (e.g., profile was just completed while Stripe was already active).
    const result = await tryAutoActivateSeller(supabase, user.id);
    if (!result) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Seller profile not found' }),
      };
    }

    if (result.firstActivation) {
      // Send notifications fire-and-forget — same as connect-status/stripe-webhook.
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
      const activatedAt = new Date().toLocaleString('en-GB');
      const internalHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
      };

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
          console.warn('recheck-activation: admin notification failed (non-fatal):', err),
        );
      }

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
          console.warn('recheck-activation: seller activation email failed (non-fatal):', err),
        );
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        sellerStatus: result.sellerStatus,
        profileComplete: result.profileComplete,
        stripeActive: result.stripeActive,
        changed: result.changed,
      }),
    };
  } catch (error) {
    console.error('recheck-activation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Activation check failed',
      }),
    };
  }
};
