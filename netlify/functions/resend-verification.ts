import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';

/**
 * POST /.netlify/functions/resend-verification
 *
 * Admin-only endpoint that resends a verification / magic-link sign-in email
 * to any user. Uses the Supabase Auth Admin API so no client-side rate
 * limits apply.
 *
 * The caller must be an authenticated, live active admin.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
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

    const auth = await authenticateActiveAccount(event, adminClient, ['admin']);
    if (!auth.ok) {
      return {
        statusCode: auth.status,
        body: JSON.stringify({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden – active admin role required' }),
      };
    }

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

    const emailRes = await fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET
          ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET }
          : {}),
      },
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

    if (!emailRes.ok) {
      const errBody = await emailRes.json().catch(() => ({}));
      console.error('resend-verification: send-email failed:', emailRes.status, errBody);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send verification email' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Verification email sent to ${targetUser.email}`,
      }),
    };
  } catch (err) {
    console.error('resend-verification: unhandled exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error – please try again' }),
    };
  }
};
