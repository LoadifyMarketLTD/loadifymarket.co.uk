import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';

/**
 * POST /.netlify/functions/resend-verification
 *
 * Admin-only endpoint that resends a verification / magic-link sign-in email
 * to any user.  Uses the Supabase Auth Admin API so no client-side rate
 * limits apply.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body (JSON):
 *   { userId: string }
 *
 * The caller must be an authenticated admin — verified via the
 * Authorization: Bearer <token> header (Supabase session token).
 */

// Verify the caller's JWT and return their public.users row, or null.
async function getAuthUser(
  event: HandlerEvent,
  adminClient: ReturnType<typeof createClient>,
) {
  const authHeader = event.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const { data, error } = await adminClient.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return null;

  const { data: userData } = await adminClient
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  return userData ?? null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('resend-verification: missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration – contact platform admin' }),
    };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Rate limiting: 10 verification resend requests per IP per hour ────────
  const ip = getClientIp(event);
  if (ip) {
    const rl = await checkRateLimit({
      supabase: adminClient,
      tableName: 'resend_verification_rate_limits',
      identifier: ip,
      windowMinutes: 60,
      maxAttempts: 10,
    });
    if (rl.exceeded) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── JWT authentication ───────────────────────────────────────────────────
  const caller = await getAuthUser(event, adminClient);
  if (!caller) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  if (caller.role !== 'admin' && caller.role !== 'owner') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden – admin role required' }) };
  }
  // ─────────────────────────────────────────────────────────────────────────

  let body: { userId?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { userId } = body;

  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
  }

  // Look up the target user's email and name
  const { data: targetUser, error: targetErr } = await adminClient
    .from('users')
    .select('email, "firstName", "lastName"')
    .eq('id', userId)
    .single();

  if (targetErr || !targetUser?.email) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Target user not found' }) };
  }

  const targetFullName =
    [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.email;

  // Generate a magic-link via the Admin API.
  // generateLink returns the action_link URL but does NOT send any email on
  // its own — we must deliver it ourselves via send-email (SendGrid).
  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: targetUser.email,
    options: {
      redirectTo: `${appUrl}/dashboard`,
    },
  });

  if (linkErr || !linkData) {
    console.error('resend-verification generateLink error:', linkErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate verification link' }),
    };
  }

  const actionLink = (linkData as { properties?: { action_link?: string } }).properties?.action_link;
  if (!actionLink) {
    console.error('resend-verification: action_link missing from generateLink response', linkData);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate verification link' }),
    };
  }

  // Deliver the magic link via SendGrid through the send-email function.
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.NETLIFY_INTERNAL_SECRET
      ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET }
      : {}),
  };

  let emailRes: Response;
  try {
    emailRes = await fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify({
        to: targetUser.email,
        subject: 'Your Loadify Market sign-in link',
        template: 'resend_verification',
        data: {
          userName: targetFullName,
          actionLink,
        },
      }),
    });
  } catch (fetchErr) {
    console.error('resend-verification: fetch to send-email threw:', fetchErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to reach email service' }),
    };
  }

  if (!emailRes.ok) {
    let underlyingError = 'Failed to send verification email';
    try {
      const errText = await emailRes.text();
      const errJson = JSON.parse(errText);
      if (errJson.error) underlyingError = errJson.error;
    } catch {
      // ignore parse error – keep generic message
    }
    console.error('resend-verification: send-email failed:', emailRes.status, underlyingError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: underlyingError }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: `Verification email sent to ${targetUser.email}`,
    }),
  };
};
