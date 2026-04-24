import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * onboarding-reminder — scheduled Netlify function
 *
 * Fires daily and sends reminder emails to sellers who have not
 * completed onboarding after 1 day, 3 days, and 7 days.
 *
 * Schedule: every day at 09:00 UTC
 * Configured in netlify.toml:
 *   [functions."onboarding-reminder"]
 *     schedule = "0 9 * * *"
 *
 * Uses SendGrid via the shared send-email function (server-to-server).
 */

/** Number of steps in the seller onboarding wizard. */
const ONBOARDING_COMPLETE_STEP = 8;
void ONBOARDING_COMPLETE_STEP; // exported via migration; documented here for reference

const WINDOWS = [
  { days: 1,  label: '24h'  },
  { days: 3,  label: '3day' },
  { days: 7,  label: '7day' },
] as const;

export const handler = schedule('0 9 * * *', async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
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

    // Find sellers registered in this window who have NOT completed onboarding.
    const { data: sellers, error } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName", "createdAt"')
      .eq('role', 'seller')
      .eq('"onboardingCompleted"', false)
      .gte('"createdAt"', windowStart)
      .lte('"createdAt"', windowEnd);

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

  return { statusCode: 200 };
});
