import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, jsonResponse, optionsResponse } from './_shared/http';

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

  const token = getBearerToken(event);
  if (!token) {
    return jsonResponse(401, { error: 'Authentication required' }, METHODS);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return jsonResponse(401, { error: 'Invalid or expired token' }, METHODS);
  }
  const userId = authData.user.id;

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
  // onboarding state. The authenticated user can only update their own account
  // through this service-role endpoint, never an attacker-supplied user id.
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

  // Mirror the server-validated role into app_metadata so an auth-session
  // fallback never has to trust user-editable user_metadata for authorization.
  // Preserve provider/custom metadata already maintained by Supabase.
  const { error: appMetadataError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(authData.user.app_metadata ?? {}),
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
