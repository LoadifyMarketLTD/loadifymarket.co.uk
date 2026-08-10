import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type CheckStatus = 'ok' | 'fail' | 'warn';

type InternalCheck = {
  status: CheckStatus;
  detail?: string;
};

export const handler: Handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;

  // Keep diagnostics server-side. This endpoint is public, so provider names,
  // environment-variable names and raw database errors must not be returned to
  // unauthenticated callers.
  const checks: Record<string, InternalCheck> = {
    env: { status: 'ok' },
    db: { status: 'warn', detail: 'not checked' },
    payments: { status: stripeSecret ? 'ok' : 'warn', detail: stripeSecret ? undefined : 'not configured' },
    email: { status: sendgridKey ? 'ok' : 'warn', detail: sendgridKey ? undefined : 'not configured' },
  };

  if (!supabaseUrl || !serviceRoleKey) {
    checks.env = { status: 'fail', detail: 'database configuration missing' };
  }

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
    } catch (err) {
      checks.db = {
        status: 'fail',
        detail: err instanceof Error ? err.message : 'database probe failed',
      };
    }
  }

  if (stripeSecret && !stripeSecret.startsWith('sk_')) {
    checks.payments = { status: 'fail', detail: 'invalid payment configuration' };
  }

  const hasFailure = Object.values(checks).some((check) => check.status === 'fail');
  const hasWarning = Object.values(checks).some((check) => check.status === 'warn');

  if (hasFailure) {
    console.error('health: critical check failed', checks);
  } else if (hasWarning) {
    console.warn('health: non-critical check warning', checks);
  }

  return {
    statusCode: hasFailure ? 503 : 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify({
      ok: !hasFailure,
      service: 'loadify-market',
      timestamp: new Date().toISOString(),
    }),
  };
};
