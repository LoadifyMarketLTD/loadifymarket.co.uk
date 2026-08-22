import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { jsonResponse, optionsResponse } from './_shared/http';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { getFeatureFlags } from './_shared/platformFlags';

const METHODS = 'POST, OPTIONS';

/**
 * POST /.netlify/functions/start-seller-activation
 *
 * Starts Marketplace Seller activation for the currently authenticated Loadify
 * identity without replacing/deleting its Buyer capability or Buyer data.
 *
 * The database RPC is service-role only and performs the capability grant,
 * seller-profile/store initialization and compatibility role update atomically.
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
    return jsonResponse(auth.status, {
      error: auth.status === 401 ? 'Authentication required' : 'Active account required',
    }, METHODS);
  }

  if (auth.actor.role === 'admin') {
    return jsonResponse(403, {
      error: 'Admin accounts cannot start Seller activation through self-service onboarding',
    }, METHODS);
  }

  try {
    const flags = await getFeatureFlags(supabase);
    if (flags.sellerRegistration === false) {
      return jsonResponse(403, {
        error: 'Seller registration is temporarily disabled. Please try again later.',
      }, METHODS);
    }
  } catch (error) {
    console.error('start-seller-activation: seller registration flag lookup failed:', error instanceof Error ? error.message : error);
    return jsonResponse(503, {
      error: 'Seller registration availability could not be verified. Please try again later.',
    }, METHODS);
  }

  const { data, error } = await supabase.rpc('server_start_seller_activation_v1', {
    p_user_id: auth.actor.id,
  });

  if (error) {
    console.error('start-seller-activation: DB activation start failed:', error.message);
    const forbidden = error.code === '42501';
    return jsonResponse(forbidden ? 403 : 500, {
      error: forbidden ? 'Seller activation is not available for this account' : 'Failed to start Seller activation',
    }, METHODS);
  }

  // Migration 340 mirrors the compatibility users.role update into Auth app
  // metadata. Refreshing it here as well keeps the current session-facing role
  // deterministic even when a deployment has trigger lag/version skew.
  const { error: metadataError } = await supabase.auth.admin.updateUserById(auth.actor.id, {
    app_metadata: {
      ...auth.actor.appMetadata,
      role: 'seller',
    },
  });

  if (metadataError) {
    console.error('start-seller-activation: app_metadata sync failed:', metadataError.message);
    return jsonResponse(500, {
      error: 'Seller activation started but session authorization could not be synchronized. Please sign in again.',
    }, METHODS);
  }

  const result = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
  return jsonResponse(200, {
    ok: true,
    role: 'seller',
    sellerStatus: typeof result.sellerStatus === 'string' ? result.sellerStatus : 'draft',
    createdSellerProfile: result.createdSellerProfile === true,
  }, METHODS);
};
