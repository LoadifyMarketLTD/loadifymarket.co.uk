import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { jsonResponse, optionsResponse } from './_shared/http';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';

const METHODS = 'POST, OPTIONS';
const SELLER_INITIAL_STEP = 1;
const BUYER_ONBOARDING_STEP = 0;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse(METHODS);
  }
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

  // This endpoint writes through service_role. A still-valid access token from a
  // suspended account must never be sufficient to change role/onboarding state.
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

  // public.users remains the canonical database source of truth for role and
  // onboarding state. The authenticated active user can only update their own
  // account through this service-role endpoint, never an attacker-supplied id.
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      role,
      onboardingCompleted: role === 'buyer',
      onboardingStep: role === 'seller' ? SELLER_INITIAL_STEP : BUYER_ONBOARDING_STEP,
    })
    .eq('id', userId);

  if (userUpdateError) {
    console.error('set-account-role: users update failed:', userUpdateError.message);
    return jsonResponse(500, { error: 'Failed to update account role' }, METHODS);
  }

  if (role === 'seller') {
    const [{ error: sellerProfileError }, { error: sellerStoreError }] = await Promise.all([
      supabase
        .from('seller_profiles')
        .upsert(
          {
            userId,
            sellerStatus: 'draft',
            isApproved: false,
          },
          { onConflict: 'userId' },
        ),
      supabase
        .from('seller_stores')
        .upsert(
          {
            userId,
            isActive: false,
          },
          { onConflict: 'userId' },
        ),
    ]);

    if (sellerProfileError || sellerStoreError) {
      console.error(
        'set-account-role: seller init failed:',
        sellerProfileError?.message || sellerStoreError?.message,
      );
      return jsonResponse(500, { error: 'Failed to initialize seller account' }, METHODS);
    }
  } else {
    const { error: buyerProfileError } = await supabase
      .from('buyer_profiles')
      .upsert({ userId }, { onConflict: 'userId' });

    if (buyerProfileError) {
      console.error('set-account-role: buyer init failed:', buyerProfileError.message);
      return jsonResponse(500, { error: 'Failed to initialize buyer account' }, METHODS);
    }
  }

  // Mirror the server-validated role into app_metadata so session consumers can
  // observe the current role. Authorization still re-checks the live DB account.
  const { error: appMetadataError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...auth.actor.appMetadata,
      role,
    },
  });

  if (appMetadataError) {
    console.error('set-account-role: app_metadata sync failed:', appMetadataError.message);
    return jsonResponse(
      500,
      { error: 'Account role was saved but session authorization could not be synchronized. Please try again.' },
      METHODS,
    );
  }

  return jsonResponse(200, { ok: true, role }, METHODS);
};
