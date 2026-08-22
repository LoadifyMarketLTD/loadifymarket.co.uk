import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { getFeatureFlagsStrict } from './_shared/platformFlags';
import {
  buildStoreSlug,
  legacyAccountTypeForSellerType,
  parseSellerType,
} from './_shared/sellerOnboarding';

type SellerOnboardingAction = 'seller_type' | 'store_identity';

/**
 * POST /.netlify/functions/set-seller-onboarding
 *
 * Trusted Stage 3 mutation boundary for fields that must not be directly
 * client-governed. It does not modify sellerStatus, Stripe readiness, Supplier
 * Commerce, or Admin state.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase, ['seller']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({
        error: auth.status === 401 ? 'Authentication required' : 'Active Marketplace Seller account required',
      }),
    };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const action = body.action as SellerOnboardingAction | undefined;
  const sellerId = auth.actor.id;

  if (action === 'seller_type') {
    const sellerType = parseSellerType(body.sellerType);
    if (!sellerType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'sellerType must be individual, sole_trader, or company' }),
      };
    }

    const { data: current, error: currentError } = await supabase
      .from('seller_profiles')
      .select('sellerType, sellerStatus, requiresAdminApproval, isApproved')
      .eq('userId', sellerId)
      .maybeSingle<{
        sellerType: string | null;
        sellerStatus: string | null;
        requiresAdminApproval: boolean | null;
        isApproved: boolean | null;
      }>();

    if (currentError || !current) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Seller profile is not available' }) };
    }
    if (current.sellerStatus === 'suspended') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Suspended Seller accounts cannot change onboarding identity' }) };
    }
    if (
      current.sellerStatus === 'active' &&
      current.sellerType &&
      current.sellerType !== sellerType
    ) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Active Sellers must contact support to change their legal seller type' }),
      };
    }

    let requireCompanyApproval = false;
    if (current.sellerStatus !== 'active') {
      try {
        const flags = await getFeatureFlagsStrict(supabase);
        requireCompanyApproval = sellerType === 'company' && flags.requireCompanyApproval;
      } catch (error) {
        console.error('set-seller-onboarding: feature flags unavailable:', error);
        return {
          statusCode: 503,
          body: JSON.stringify({ error: 'Seller approval policy could not be verified. Please try again later.' }),
        };
      }
    }

    const update: Record<string, unknown> = {
      sellerType,
      accountType: legacyAccountTypeForSellerType(sellerType),
    };

    // Do not retroactively change approval policy for historical active sellers.
    if (current.sellerStatus !== 'active') {
      update.requiresAdminApproval = requireCompanyApproval;
      if (requireCompanyApproval) update.isApproved = false;
    }

    const { error } = await supabase
      .from('seller_profiles')
      .update(update)
      .eq('userId', sellerId);

    if (error) {
      console.error('set-seller-onboarding seller_type:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to save Seller type' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        sellerType,
        requiresAdminApproval:
          current.sellerStatus === 'active'
            ? Boolean(current.requiresAdminApproval)
            : requireCompanyApproval,
      }),
    };
  }

  if (action === 'store_identity') {
    const storeName = typeof body.storeName === 'string' ? body.storeName.trim() : '';
    const storeDescription = typeof body.storeDescription === 'string'
      ? body.storeDescription.trim()
      : '';

    if (storeName.length < 2 || storeName.length > 80) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Store name must be between 2 and 80 characters' }),
      };
    }
    if (storeDescription.length > 1000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Store description must be 1000 characters or fewer' }),
      };
    }

    const { data: existing, error: existingError } = await supabase
      .from('seller_stores')
      .select('storeSlug')
      .eq('userId', sellerId)
      .maybeSingle<{ storeSlug: string | null }>();

    if (existingError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to load store identity' }) };
    }

    const storeSlug = existing?.storeSlug?.trim() || buildStoreSlug(storeName, sellerId);

    const { error } = await supabase
      .from('seller_stores')
      .upsert(
        {
          userId: sellerId,
          storeName,
          storeSlug,
          storeDescription,
        },
        { onConflict: 'userId' },
      );

    if (error) {
      console.error('set-seller-onboarding store_identity:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to save store identity' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, storeName, storeSlug, storeDescription }),
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'Unsupported onboarding action' }),
  };
};
