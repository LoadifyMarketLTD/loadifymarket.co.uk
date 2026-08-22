import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { jsonResponse, optionsResponse } from './_shared/http';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { getFeatureFlagsStrict } from './_shared/platformFlags';

const METHODS = 'POST, OPTIONS';
const BUYER_ONBOARDING_STEP = 0;

/**
 * Legacy compatibility boundary.
 *
 * Buyer/Seller is no longer a destructive public account-type toggle. New UI
 * must use start-seller-activation for Buyer -> Marketplace Seller activation.
 * This endpoint remains temporarily for legacy callers while preventing a
 * Seller relationship from being silently replaced with Buyer-only state.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) {
    return jsonResponse(auth.status, { error: 'Authentication required' }, METHODS);
  }

  const userId = auth.actor.id;
  if (auth.actor.role === 'admin') {
    return jsonResponse(403, { error: 'Admin role cannot be changed through self-service onboarding' }, METHODS);
  }

  let parsedBody: { role?: unknown } = {};
  try {
    parsedBody = JSON.parse(event.body || '{}') as { role?: unknown };
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const role = typeof parsedBody.role === 'string' ? parsedBody.role : '';
  if (role !== 'buyer' && role !== 'seller') {
    return jsonResponse(400, { error: 'Invalid role. Allowed values: buyer, seller.' }, METHODS);
  }

  // Never use a role change to erase an established Seller relationship. A
  // Seller can navigate to Buyer Space under the same identity; workspace
  // switching is navigation, not authorization mutation.
  if (role === 'buyer' && auth.actor.role === 'seller') {
    return jsonResponse(409, {
      error: 'Seller accounts already include Buyer access. Open Buyer Space instead of changing account type.',
    }, METHODS);
  }

  if (role === 'seller') {
    // Legacy callers must obey the same strict server-side registration control
    // as the canonical start-seller-activation endpoint. An unavailable settings
    // row fails closed rather than silently reopening Seller registration.
    try {
      const flags = await getFeatureFlagsStrict(supabase);
      if (flags.sellerRegistration === false) {
        return jsonResponse(403, {
          error: 'Seller registration is temporarily disabled. Please try again later.',
        }, METHODS);
      }
    } catch (error) {
      console.error('set-account-role: seller registration flag lookup failed:', error instanceof Error ? error.message : error);
      return jsonResponse(503, {
        error: 'Seller registration availability could not be verified. Please try again later.',
      }, METHODS);
    }

    const { data, error } = await supabase.rpc('server_start_seller_activation_v1', {
      p_user_id: userId,
    });

    if (error) {
      console.error('set-account-role: seller activation compatibility call failed:', error.message);
      return jsonResponse(error.code === '42501' ? 403 : 500, {
        error: 'Failed to start Seller activation',
      }, METHODS);
    }

    const result = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
    return jsonResponse(200, {
      ok: true,
      role: 'seller',
      sellerStatus: typeof result.sellerStatus === 'string' ? result.sellerStatus : 'draft',
      compatibilityEndpoint: true,
    }, METHODS);
  }

  // Buyer -> Buyer is idempotent. Updating role explicitly keeps legacy
  // environments in sync and migration 669's trigger guarantees Buyer capability.
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      role: 'buyer',
      onboardingCompleted: true,
      onboardingStep: BUYER_ONBOARDING_STEP,
    })
    .eq('id', userId);

  if (userUpdateError) {
    console.error('set-account-role: buyer users update failed:', userUpdateError.message);
    return jsonResponse(500, { error: 'Failed to update Buyer account state' }, METHODS);
  }

  const { error: buyerProfileError } = await supabase
    .from('buyer_profiles')
    .upsert({ userId }, { onConflict: 'userId' });

  if (buyerProfileError) {
    console.error('set-account-role: buyer profile init failed:', buyerProfileError.message);
    return jsonResponse(500, { error: 'Failed to initialize Buyer account' }, METHODS);
  }

  return jsonResponse(200, { ok: true, role: 'buyer', compatibilityEndpoint: true }, METHODS);
};