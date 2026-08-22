import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { isProfileComplete, tryAutoActivateSeller } from './_shared/sellerActivation';
import { deriveSellerOnboardingReadiness } from './_shared/sellerOnboarding';

/**
 * POST /.netlify/functions/seller-onboarding-status
 *
 * Returns the canonical Marketplace Seller onboarding/readiness snapshot and
 * reconciles server-managed progress projections from persisted facts.
 *
 * This endpoint intentionally separates:
 *   - marketplace setup completion (seller type + legal profile + store + product)
 *   - commercial activation (sellerStatus + Stripe + optional admin approval)
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

  const sellerId = auth.actor.id;

  try {
    const [profileRes, storeRes, productRes] = await Promise.all([
      supabase
        .from('seller_profiles')
        .select(
          'sellerType, sellerStatus, isApproved, requiresAdminApproval, storeName, businessName, contactPhone, businessAddress, companyRegistrationNumber, vatNumber, isVatRegistered, profileCompleted, storeCreated, firstProductCreated, stripeAccountId, stripeConnectStatus, stripeChargesEnabled, stripePayoutsEnabled, stripeDetailsSubmitted',
        )
        .eq('userId', sellerId)
        .maybeSingle(),
      supabase
        .from('seller_stores')
        .select('storeName, storeSlug, storeDescription')
        .eq('userId', sellerId)
        .maybeSingle(),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('sellerId', sellerId),
    ]);

    if (profileRes.error || !profileRes.data) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Seller profile is not available' }) };
    }
    if (storeRes.error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify store identity' }) };
    }
    if (productRes.error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify catalogue readiness' }) };
    }

    const profile = profileRes.data as {
      sellerType: string | null;
      sellerStatus: string | null;
      isApproved: boolean | null;
      requiresAdminApproval: boolean | null;
      storeName: string | null;
      businessName: string | null;
      contactPhone: string | null;
      businessAddress: { postcode?: string } | null;
      companyRegistrationNumber: string | null;
      vatNumber: string | null;
      isVatRegistered: boolean | null;
      profileCompleted: boolean | null;
      storeCreated: boolean | null;
      firstProductCreated: boolean | null;
      stripeAccountId: string | null;
      stripeConnectStatus: string | null;
      stripeChargesEnabled: boolean | null;
      stripePayoutsEnabled: boolean | null;
      stripeDetailsSubmitted: boolean | null;
    };

    const store = storeRes.data as {
      storeName: string | null;
      storeSlug: string | null;
      storeDescription: string | null;
    } | null;

    const profileComplete = isProfileComplete(profile, profile.sellerType);
    const storeReady = Boolean(store?.storeName?.trim());
    const productCount = productRes.count ?? 0;
    const catalogueReady = productCount > 0;

    // Server-owned projection flags. These are compatibility fields consumed by
    // historical triggers/routes; Stage 3 UI derives readiness from the same
    // underlying facts rather than trusting browser-written booleans.
    const { error: reconcileError } = await supabase
      .from('seller_profiles')
      .update({
        profileCompleted: profileComplete,
        storeCreated: storeReady,
        firstProductCreated: catalogueReady,
      })
      .eq('userId', sellerId);

    if (reconcileError) {
      console.error('seller-onboarding-status: reconciliation failed:', reconcileError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to reconcile onboarding progress' }) };
    }

    // Re-evaluate commercial activation separately. Stripe remains a technical
    // payment/readiness signal only and never becomes a claim of Loadify KYC.
    const activation = await tryAutoActivateSeller(supabase, sellerId);
    const sellerStatus = activation?.sellerStatus ?? profile.sellerStatus ?? 'draft';

    const { data: userState, error: userStateError } = await supabase
      .from('users')
      .select('onboardingCompleted, onboardingStep')
      .eq('id', sellerId)
      .maybeSingle<{ onboardingCompleted: boolean | null; onboardingStep: number | null }>();

    if (userStateError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify onboarding completion' }) };
    }

    const readiness = deriveSellerOnboardingReadiness({
      sellerType: profile.sellerType,
      profileComplete,
      storeName: store?.storeName ?? null,
      productCount,
      sellerStatus,
      stripeConnectStatus: profile.stripeConnectStatus,
      stripeChargesEnabled: Boolean(profile.stripeChargesEnabled),
      stripePayoutsEnabled: Boolean(profile.stripePayoutsEnabled),
      requiresAdminApproval: Boolean(profile.requiresAdminApproval),
      isApproved: Boolean(profile.isApproved),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sellerType: profile.sellerType,
        sellerStatus,
        requiresAdminApproval: Boolean(profile.requiresAdminApproval),
        isApproved: Boolean(profile.isApproved),
        profileComplete,
        store: {
          storeName: store?.storeName ?? '',
          storeSlug: store?.storeSlug ?? '',
          storeDescription: store?.storeDescription ?? '',
        },
        productCount,
        stripe: {
          connected: Boolean(profile.stripeAccountId || profile.stripeConnectStatus),
          status: profile.stripeConnectStatus,
          chargesEnabled: Boolean(profile.stripeChargesEnabled),
          payoutsEnabled: Boolean(profile.stripePayoutsEnabled),
          detailsSubmitted: Boolean(profile.stripeDetailsSubmitted),
        },
        onboardingCompleted: Boolean(userState?.onboardingCompleted),
        onboardingStep: userState?.onboardingStep ?? 0,
        readiness,
      }),
    };
  } catch (error) {
    console.error('seller-onboarding-status error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to load Seller setup status' }) };
  }
};
