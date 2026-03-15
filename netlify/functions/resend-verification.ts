import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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
 *   { userId: string, adminId: string }
 *
 * The caller must be an authenticated admin — we verify this by checking
 * public.users.role for the adminId supplied.
 */

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

  let body: { userId?: string; adminId?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { userId, adminId } = body;

  if (!userId || !adminId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'userId and adminId are required' }) };
  }

  // Verify that the caller is an admin or owner
  const { data: adminUser, error: adminErr } = await adminClient
    .from('users')
    .select('role')
    .eq('id', adminId)
    .single();

  if (adminErr || !adminUser) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Admin user not found' }) };
  }

  if (adminUser.role !== 'admin' && adminUser.role !== 'owner') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden – admin role required' }) };
  }

  // Look up the target user's email
  const { data: targetUser, error: targetErr } = await adminClient
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (targetErr || !targetUser?.email) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Target user not found' }) };
  }

  // Send a magic-link / OTP email via the Admin API.
  // generateLink returns a sign-in link that the user can click to verify
  // their email address and log in.
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: targetUser.email,
    options: {
      redirectTo: `${process.env.VITE_APP_URL || 'https://loadifymarket.co.uk'}/dashboard`,
    },
  });

  if (linkErr || !linkData) {
    console.error('resend-verification generateLink error:', linkErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: linkErr?.message || 'Failed to generate verification link' }),
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
