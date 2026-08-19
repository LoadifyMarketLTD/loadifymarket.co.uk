import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';

/**
 * POST /.netlify/functions/recheck-activation
 *
 * Re-evaluates a seller's activation status using only data already persisted
 * in the database — no live Stripe API call is made.
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase, ['seller', 'admin']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Active seller account required' }),
    };
  }

  if (auth.actor.role === 'admin') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        sellerStatus: 'active',
        profileComplete: true,
        stripeConnected: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        changed: false,
      }),
    };
  }

  const sellerId = auth.actor.id;

  try {
    const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
    const result = await tryAutoActivateSeller(supabase, sellerId);
    if (!result) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Seller profile not found' }),
      };
    }

    if (result.firstActivation) {
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

      if (auth.actor.email) {
        fetch(`${appUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            to: auth.actor.email,
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
        ok: true,
        sellerStatus: result.sellerStatus,
        profileComplete: result.profileComplete,
        stripeConnected: result.stripeConnected,
        chargesEnabled: result.stripeActive,
        payoutsEnabled: result.stripeActive,
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
