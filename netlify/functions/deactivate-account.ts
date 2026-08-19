import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';
const METHODS = 'POST, OPTIONS';
const LONG_BAN_DURATION = '876000h';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': METHODS,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * Self-service reversible account deactivation.
 *
 * This is intentionally distinct from delete-account: deactivation preserves
 * account data so support can restore the account later. The security boundary
 * still has to revoke Auth authority, public.users authority and notification
 * delivery together instead of relying on a client-side isActive update.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Deactivation is available only to the live active account that owns the
  // current token. Suspended/stale sessions cannot use this endpoint as a way to
  // mutate account state through service_role.
  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: corsHeaders,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Account access denied' }),
    };
  }

  // Admin accounts require the protected recovery/administration process and
  // must never be disabled through an ordinary self-service screen.
  if (auth.actor.role === 'admin') {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Admin accounts cannot be deactivated through self-service' }),
    };
  }

  const rateLimit = await checkRateLimit({
    supabase,
    tableName: 'delete_account_rate_limits',
    identifier: auth.actor.id,
    windowMinutes: 60,
    maxAttempts: 3,
    policy: 'fail-closed',
  });
  if (rateLimit.exceeded) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Too many deactivation requests. Please try again later.' }),
    };
  }

  // Revoke authentication first. If a later write fails, the account remains
  // blocked from creating/refreshing sessions rather than being silently open.
  const { error: banError } = await supabase.auth.admin.updateUserById(auth.actor.id, {
    ban_duration: LONG_BAN_DURATION,
  });
  if (banError) {
    console.error('deactivate-account: Auth ban failed:', banError.message);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Account deactivation could not be secured in authentication' }),
    };
  }

  // The database flag is the stale-JWT backstop used by migration 608. It must
  // be written before any best-effort cleanup is considered successful.
  const { error: userError } = await supabase
    .from('users')
    .update({ isActive: false })
    .eq('id', auth.actor.id);
  if (userError) {
    console.error('deactivate-account: users.isActive update failed:', userError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        deactivated: false,
        error: 'Authentication is blocked but account deactivation requires support intervention',
      }),
    };
  }

  if (auth.actor.role === 'seller') {
    const { error: sellerError } = await supabase
      .from('seller_profiles')
      .update({ sellerStatus: 'suspended', isPaused: true })
      .eq('userId', auth.actor.id);
    if (sellerError) {
      console.error('deactivate-account: seller suspension sync failed:', sellerError.message);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          deactivated: true,
          error: 'Account is deactivated but seller-state synchronization requires support intervention',
        }),
      };
    }

    // Self-deactivation promises that the storefront stops advertising the
    // seller's inventory. Keep listings inactive after a later account restore;
    // the seller can explicitly Resume when ready, rather than silently
    // republishing everything during admin reactivation.
    const { error: productsError } = await supabase
      .from('products')
      .update({ isActive: false })
      .eq('sellerId', auth.actor.id)
      .eq('isActive', true);
    if (productsError) {
      console.error('deactivate-account: seller listing hide failed:', productsError.message);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          deactivated: true,
          error: 'Account is deactivated but listing visibility cleanup requires support intervention',
        }),
      };
    }
  }

  const { error: pushError } = await supabase
    .from('push_tokens')
    .update({ isActive: false })
    .eq('userId', auth.actor.id)
    .eq('isActive', true);
  if (pushError) {
    console.error('deactivate-account: push token cleanup failed:', pushError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        deactivated: true,
        error: 'Account is deactivated but notification cleanup requires support intervention',
      }),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      deactivated: true,
      message: 'Account deactivated. Contact support if you want to restore access.',
    }),
  };
};
