import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
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
 *   SENDGRID_API_KEY
 *
 * Request body (JSON):
 *   { userId: string }
 *
 * The caller must be an authenticated admin — verified via the
 * Authorization: Bearer <token> header (Supabase session token).
 */

/** Escape a value for safe embedding in HTML to prevent injection. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildResendVerificationEmail(userName: string, actionLink: string): string {
  const header = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #243b53; padding: 20px; text-align: center;">
        <h1 style="color: #f59e0b; margin: 0;">Loadify Market</h1>
      </div>
      <div style="background-color: white; padding: 30px; margin-top: 20px;">
  `;
  const footer = `
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>Loadify Market - B2B &amp; B2C Marketplace</p>
        <p>XDrive Logistics Ltd | 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom</p>
        <p>VAT: GB375949535 | Email: support@loadifymarket.co.uk</p>
      </div>
    </div>
  `;
  const content = `
    <h2 style="color: #243b53;">Sign in to Loadify Market</h2>
    <p>Hi ${escapeHtml(userName)},</p>
    <p>An administrator has requested that a sign-in link be sent to your account. Click the button below to access your dashboard.</p>
    <a href="${escapeHtml(actionLink)}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Access My Account</a>
    <p style="color: #555; font-size: 14px;">This link is valid for 24 hours and can only be used once. If you did not expect this email, please ignore it or contact us at <a href="mailto:support@loadifymarket.co.uk" style="color: #f59e0b;">support@loadifymarket.co.uk</a>.</p>
  `;
  return header + content + footer;
}

// Verify the caller's JWT and return their public.users row, or null.
async function getAuthUser(
  event: HandlerEvent,
  adminClient: ReturnType<typeof createClient>,
) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
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

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('resend-verification: missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfiguration – contact platform admin' }),
      };
    }

    if (!sendgridApiKey) {
      console.error('resend-verification: missing SENDGRID_API_KEY');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Email service not configured – contact platform admin' }),
      };
    }

    sgMail.setApiKey(sendgridApiKey);

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
    // its own — we deliver it directly via SendGrid below.
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

    // Deliver the magic link directly via SendGrid (no internal HTTP call needed).
    const htmlContent = buildResendVerificationEmail(targetFullName, actionLink);
    try {
      await sgMail.send({
        to: targetUser.email,
        from: process.env.VITE_SUPPORT_EMAIL || 'support@loadifymarket.co.uk',
        subject: 'Your Loadify Market sign-in link',
        html: htmlContent,
      });
    } catch (emailErr) {
      console.error('resend-verification: sgMail.send failed:', emailErr);
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
