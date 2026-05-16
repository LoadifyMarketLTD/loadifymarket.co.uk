import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type CheckStatus = 'ok' | 'fail' | 'warn';

export const handler: Handler = async (_event, _context) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;

  const checks: Record<string, { status: CheckStatus; detail?: string }> = {
    env: { status: 'ok' },
    db: { status: 'warn', detail: 'not checked' },
    offersEngine: { status: 'warn', detail: 'not checked' },
    stripe: { status: 'warn', detail: 'not configured' },
    sendgrid: { status: sendgridKey ? 'ok' : 'warn', detail: sendgridKey ? undefined : 'SENDGRID_API_KEY missing' },
  };

  // Environment readiness
  if (!supabaseUrl || !serviceRoleKey) {
    checks.env = { status: 'fail', detail: 'Supabase environment variables missing' };
  }

  // Database readiness
  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await supabase
        .from('platform_settings')
        .select('key')
        .limit(1);
      checks.db = error
        ? { status: 'fail', detail: error.message }
        : { status: 'ok' };

      const { error: offersError } = await supabase
        .from('offers')
        .select('id')
        .limit(1);
      checks.offersEngine = offersError
        ? { status: 'fail', detail: `offers table unavailable (${offersError.message})` }
        : { status: 'ok' };
    } catch (err) {
      checks.db = { status: 'fail', detail: err instanceof Error ? err.message : 'DB probe failed' };
      checks.offersEngine = { status: 'fail', detail: 'offers migration probe failed' };
    }
  }

  // Stripe readiness
  if (stripeSecret) {
    checks.stripe = stripeSecret.startsWith('sk_')
      ? { status: 'ok' }
      : { status: 'fail', detail: 'Invalid STRIPE_SECRET_KEY format' };
  }

  const hasFailure = Object.values(checks).some((c) => c.status === 'fail');
  const statusCode = hasFailure ? 503 : 200;

  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ok: !hasFailure,
      service: "loadify-market",
      checks,
      timestamp: new Date().toISOString(),
    }),
  };
};
