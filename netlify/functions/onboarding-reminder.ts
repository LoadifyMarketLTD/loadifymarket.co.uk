import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * onboarding-reminder — scheduled Netlify function
 *
 * Fires daily and sends reminder emails to active sellers who have not
 * completed onboarding after 1 day, 3 days, and 7 days.
 *
 * Schedule: every day at 09:00 UTC
 * Configured in netlify.toml:
 *   [functions."onboarding-reminder"]
 *     schedule = "0 9 * * *"
 *
 * Uses SendGrid via the shared send-email function (server-to-server).
 *
 * ⚠️  IMPORTANT — admin manual trigger:
 *   This function uses the `schedule()` wrapper from @netlify/functions, which
 *   means Netlify only accepts calls from its own scheduler (signed with an
 *   internal JWT). Direct HTTP requests from the browser will receive 401.
 *
 *   To manually trigger onboarding reminders from the admin panel, use:
 *     POST /.netlify/functions/admin-sellers  { op: "onboarding_reminder" }
 *   That endpoint validates the admin JWT and runs the same reminder logic.
 */

/** Number of steps in the seller onboarding wizard. */
const ONBOARDING_COMPLETE_STEP = 8;
void ONBOARDING_COMPLETE_STEP; // exported via migration; documented here for reference

const WINDOWS = [
  { days: 1,  label: '24h'  },
  { days: 3,  label: '3day' },
  { days: 7,  label: '7day' },
] as const;

/** Time windows for Stripe Connect-specific reminders (separate from general onboarding). */
const STRIPE_WINDOWS = [
  { days: 2,  label: '2day'  },
  { days: 5,  label: '5day'  },
  { days: 10, label: '10day' },
] as const;

export const handler = schedule('0 9 * * *', async () => {
  // Support both SUPABASE_URL (Netlify dashboard convention) and the VITE_
  // prefixed variant that build tooling also exports to the environment.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('onboarding-reminder: DB credentials not set');
    return { statusCode: 200 };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.NETLIFY_INTERNAL_SECRET
      ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET }
      : {}),
  };

  const now = new Date();

  for (const window of WINDOWS) {
    // windowStart has a 1-hour buffer beyond the target day boundary to
    // absorb clock drift or scheduler jitter without missing any sellers.
    const windowStart = new Date(now.getTime() - (window.days * 24 + 1) * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(now.getTime() - window.days * 24 * 60 * 60 * 1000).toISOString();

    // Find active sellers registered in this window who have NOT completed onboarding.
    // Include rows where onboardingCompleted is false OR NULL (pre-migration rows).
    // NOTE: column names inside .or() filter strings use PostgREST quoting ("col"),
    // but supabase-js .gte()/.lte() take the raw column name without extra quotes.
    const { data: sellers, error } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName", "createdAt"')
      .eq('role', 'seller')
      .eq('isActive', true)
      .or('"onboardingCompleted".eq.false,"onboardingCompleted".is.null')
      .gte('createdAt', windowStart)
      .lte('createdAt', windowEnd);

    if (error) {
      console.error(`onboarding-reminder: query failed for ${window.label} window:`, error.message);
      continue;
    }

    if (!sellers || sellers.length === 0) continue;

    console.log(`onboarding-reminder: sending ${window.label} reminders to ${sellers.length} sellers`);

    const emailPromises = (sellers as {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    }[]).map((seller) => {
      const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.email;
      return fetch(`${appUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          to: seller.email,
          subject: 'Complete your Loadify Market seller setup',
          template: 'onboarding_reminder',
          data: {
            sellerName,
            windowLabel: window.label,
            onboardingUrl: `${appUrl}/onboarding`,
          },
        }),
      }).then((res) => {
        if (!res.ok) return { email: seller.email, ok: false, status: res.status };
        return { email: seller.email, ok: true };
      }).catch((err: unknown) => {
        console.warn(`onboarding-reminder: email failed for ${seller.email}:`, err);
        return { email: seller.email, ok: false };
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
    ).length;
    console.log(
      `onboarding-reminder: ${window.label} window — sent ${sellers.length - failed}/${sellers.length} emails`
    );
  }

  // ── Stripe Connect-specific reminders ─────────────────────────────────────
  // These fire for active sellers who have been registered for 2, 5, or 10 days
  // but still have no Stripe account connected (stripeConnectStatus IS NULL or
  // 'pending'). They are sent regardless of whether general onboarding is done
  // because a seller may have completed their profile but stalled on Stripe.

  for (const window of STRIPE_WINDOWS) {
    const windowStart = new Date(now.getTime() - (window.days * 24 + 1) * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(now.getTime() - window.days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch active sellers registered in this window who have NOT completed Stripe Connect.
    // Join seller_profiles to check stripeConnectStatus.
    const { data: sellerRows, error: stripeErr } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName", "createdAt", seller_profiles!userId(stripeConnectStatus)')
      .eq('role', 'seller')
      .eq('isActive', true)
      .gte('createdAt', windowStart)
      .lte('createdAt', windowEnd);

    if (stripeErr) {
      console.error(`onboarding-reminder: Stripe query failed for ${window.label} window:`, stripeErr.message);
      continue;
    }

    if (!sellerRows || sellerRows.length === 0) continue;

    // Filter to only those whose Stripe Connect is incomplete.
    const stripeIncomplete = (sellerRows as {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      seller_profiles?: { stripeConnectStatus?: string | null } | null;
    }[]).filter((row) => {
      const status = row.seller_profiles?.stripeConnectStatus ?? null;
      return status === null || status === 'pending';
    });

    if (stripeIncomplete.length === 0) continue;

    console.log(`onboarding-reminder: sending stripe ${window.label} reminders to ${stripeIncomplete.length} sellers`);

    const stripeEmailPromises = stripeIncomplete.map((seller) => {
      const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.email;
      return fetch(`${appUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          to: seller.email,
          subject: 'Connect your Stripe account to start selling on Loadify Market',
          template: 'stripe_connect_reminder',
          data: {
            sellerName,
            windowLabel: window.label,
            onboardingUrl: `${appUrl}/seller/settings`,
          },
        }),
      }).then((res) => {
        if (!res.ok) return { email: seller.email, ok: false, status: res.status };
        return { email: seller.email, ok: true };
      }).catch((err: unknown) => {
        console.warn(`onboarding-reminder: Stripe email failed for ${seller.email}:`, err);
        return { email: seller.email, ok: false };
      });
    });

    const stripeResults = await Promise.allSettled(stripeEmailPromises);
    const stripeFailed = stripeResults.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
    ).length;
    console.log(
      `onboarding-reminder: stripe ${window.label} window — sent ${stripeIncomplete.length - stripeFailed}/${stripeIncomplete.length} emails`
    );
  }

  return { statusCode: 200 };
});
