import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import {
  isOutsideP1GreatBritainPostcode,
  normaliseMarketplaceCountry,
} from './_shared/marketplaceTax';

/**
 * POST /.netlify/functions/connect-status
 *
 * Fetches the live Stripe Connect account status for the authenticated active
 * seller and persists the result in seller_profiles.stripeConnectStatus.
 * Stripe Account location is also persisted as server-only tax evidence.
 *
 * Stage 3 invariant: Stripe readiness never creates or completes store identity.
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

  const auth = await authenticateActiveAccount(event, supabase, ['seller']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Active seller account required' }),
    };
  }

  const sellerId = auth.actor.id;

  try {
    const { data: profile } = await supabase
      .from('seller_profiles')
      .select('stripeAccountId')
      .eq('userId', sellerId)
      .single<{ stripeAccountId: string | null }>();

    if (!profile?.stripeAccountId) {
      let sellerStatus: string | null = null;
      let profileComplete = false;
      try {
        const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
        const result = await tryAutoActivateSeller(supabase, sellerId);
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
      if (
        retrieveError instanceof Stripe.errors.StripeInvalidRequestError &&
        /no such account/i.test(retrieveError.message)
      ) {
        console.warn(`connect-status: stored Stripe account is not on current platform; clearing stale record for user ${sellerId}`);
        const { error: clearError } = await supabase
          .from('seller_profiles')
          .update({
            stripeAccountId: null,
            stripeConnectStatus: null,
            taxCountry: null,
            taxPostcode: null,
            taxCountrySource: null,
            taxCountryCapturedAt: null,
          })
          .eq('userId', sellerId);
        if (clearError) throw clearError;
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

    const stripeTaxCountry = account.country?.trim().toUpperCase() || null;
    const stripeTaxPostcode = (
      account.company?.address?.postal_code
      ?? account.individual?.address?.postal_code
      ?? account.business_profile?.support_address?.postal_code
      ?? null
    )?.trim().toUpperCase() || null;

    // Always persist the evidence snapshot we actually received from Stripe.
    // Never leave stale tax-location evidence behind if Stripe stops returning it.
    const stripeUpdate: Record<string, unknown> = {
      stripeConnectStatus,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      taxCountry: stripeTaxCountry,
      taxPostcode: stripeTaxCountry ? stripeTaxPostcode : null,
      taxCountrySource: stripeTaxCountry ? 'stripe_connect_account_v1' : null,
      taxCountryCapturedAt: stripeTaxCountry ? new Date().toISOString() : null,
    };

    const { error: stripeStatusUpdateError } = await supabase
      .from('seller_profiles')
      .update(stripeUpdate)
      .eq('userId', sellerId);

    // Tax evidence is a publication/checkout security boundary. A failed
    // persistence must never be reported to the seller UI as a successful sync.
    if (stripeStatusUpdateError) {
      console.error(
        'connect-status: failed to persist Stripe status/tax evidence for',
        sellerId,
        stripeStatusUpdateError.message,
      );
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Stripe account data was read, but Loadify could not save the tax-location evidence.',
          taxEvidenceReady: false,
          taxEvidenceReason: 'persist_failed',
        }),
      };
    }

    // Read the server-only fields back from the database. Do not infer success
    // merely because the UPDATE request itself returned without an error.
    const { data: persistedTaxEvidence, error: taxEvidenceReadbackError } = await supabase
      .from('seller_profiles')
      .select('taxCountry, taxPostcode, taxCountrySource, taxCountryCapturedAt')
      .eq('userId', sellerId)
      .maybeSingle<{
        taxCountry: string | null;
        taxPostcode: string | null;
        taxCountrySource: string | null;
        taxCountryCapturedAt: string | null;
      }>();

    if (taxEvidenceReadbackError || !persistedTaxEvidence) {
      console.error(
        'connect-status: unable to verify persisted Stripe tax evidence for',
        sellerId,
        taxEvidenceReadbackError?.message,
      );
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Loadify could not verify the saved Stripe tax-location evidence.',
          taxEvidenceReady: false,
          taxEvidenceReason: 'readback_failed',
        }),
      };
    }

    const persistedTaxCountry =
      normaliseMarketplaceCountry(persistedTaxEvidence.taxCountry);
    const persistedTaxPostcode =
      persistedTaxEvidence.taxPostcode?.trim().toUpperCase() || null;

    const taxEvidenceReady =
      persistedTaxCountry === 'GB'
      && Boolean(persistedTaxPostcode)
      && !isOutsideP1GreatBritainPostcode(persistedTaxPostcode)
      && persistedTaxEvidence.taxCountrySource === 'stripe_connect_account_v1'
      && Boolean(persistedTaxEvidence.taxCountryCapturedAt);

    const taxEvidenceReason = taxEvidenceReady
      ? null
      : persistedTaxCountry !== 'GB'
        ? 'stripe_country_unsupported'
        : !persistedTaxPostcode
          ? 'stripe_postcode_missing'
          : isOutsideP1GreatBritainPostcode(persistedTaxPostcode)
            ? 'stripe_postcode_unsupported'
            : persistedTaxEvidence.taxCountrySource !== 'stripe_connect_account_v1'
              ? 'source_mismatch'
              : !persistedTaxEvidence.taxCountryCapturedAt
                ? 'capture_missing'
                : 'evidence_incomplete';

    let sellerStatus: string | null = null;
    let profileComplete = false;
    try {
      const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
      const result = await tryAutoActivateSeller(supabase, sellerId, stripeConnectStatus);
      if (result) {
        sellerStatus = result.sellerStatus;
        profileComplete = result.profileComplete;

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
              console.warn('connect-status: admin notification failed (non-fatal):', err),
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
              console.warn('connect-status: seller activation email failed (non-fatal):', err),
            );
          }
        }
      }
    } catch (activationError) {
      console.warn('connect-status: auto-activation check failed (non-fatal):', activationError);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        stripeConnectStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        sellerStatus,
        profileComplete,
        taxEvidenceReady,
        taxEvidenceReason,
      }),
    };
  } catch (error) {
    console.error('connect-status error:', error);

    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      (/signed up for connect/i.test(error.message) ||
        /not.*connect platform/i.test(error.message) ||
        /connect.*not.*enabled/i.test(error.message))
    ) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'Stripe Connect is not yet enabled on this platform.',
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
