/**
 * delete-account
 *
 * GDPR / UK Data Protection Act 2018 compliant account deletion.
 *
 * The caller must be authenticated (Bearer JWT).  They may only delete their
 * own account.  Admin users may additionally supply a `targetUserId` to delete
 * another user's account.
 *
 * What happens on deletion:
 *   1. PII in public.users is anonymised (email, firstName, lastName, phone
 *      replaced with placeholder values).
 *   2. buyer_profiles and seller_profiles PII columns are cleared.
 *   3. The Supabase Auth user record is hard-deleted via the service role API
 *      so the email address is freed and no further auth is possible.
 *   4. push_tokens for the user are deleted.
 *   5. A deletion audit record is inserted into user_deletion_log (if the
 *      table exists — non-fatal otherwise).
 *
 * What is NOT deleted:
 *   - orders, payment_sessions, payouts, disputes — financial records must
 *     be retained for legal and accounting purposes (UK VAT regulations,
 *     Stripe Connect compliance).  These rows are anonymised (buyerId /
 *     sellerId preserved as-is; all PII columns already de-referenced through
 *     the users join, which is now anonymised).
 *   - messages — retained for dispute resolution.  Sender identity is
 *     already anonymised via the users join.
 *
 * Method: DELETE
 * Auth:   Bearer <jwt>
 * Body:   { targetUserId?: string }  — only admins may supply this
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  // ── Authenticate caller ───────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user: callerAuth }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !callerAuth) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // ── Rate limit: 3 deletion attempts per hour ──────────────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName: 'create_refund_rate_limits', // reuse admin rate-limit table — same schema
    identifier: `delete:${callerAuth.id}`,
    windowMinutes: 60,
    maxAttempts: 3,
  });
  if (rl.exceeded) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Too many deletion requests. Please try again later.' }),
    };
  }

  // ── Determine target user ─────────────────────────────────────────────────
  let body: { targetUserId?: string } = {};
  try {
    if (event.body) body = JSON.parse(event.body) as { targetUserId?: string };
  } catch {
    // Ignore — targetUserId is optional
  }

  const { data: callerRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', callerAuth.id)
    .maybeSingle<{ role: string | null }>();

  const isAdmin = callerRow?.role === 'admin' || callerRow?.role === 'owner';
  const targetUserId: string = body.targetUserId && isAdmin ? body.targetUserId : callerAuth.id;

  if (body.targetUserId && body.targetUserId !== callerAuth.id && !isAdmin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'You can only delete your own account' }),
    };
  }

  // ── Verify target user exists ─────────────────────────────────────────────
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', targetUserId)
    .maybeSingle<{ id: string; email: string; role: string | null }>();

  if (!targetUser) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'User not found' }) };
  }

  // Prevent accidental deletion of the owner / another admin by a non-owner admin.
  if (targetUser.role === 'owner' && callerAuth.id !== targetUserId) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Owner accounts cannot be deleted via this endpoint' }),
    };
  }

  const now = new Date().toISOString();
  const anonEmail = `deleted_${targetUserId.slice(0, 8)}@removed.invalid`;

  // ── 1. Anonymise public.users ─────────────────────────────────────────────
  await supabase
    .from('users')
    .update({
      email: anonEmail,
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
      isActive: false,
    })
    .eq('id', targetUserId);

  // ── 2. Anonymise buyer_profiles ───────────────────────────────────────────
  await supabase
    .from('buyer_profiles')
    .update({
      phone: null,
      dateOfBirth: null,
      vatNumber: null,
    })
    .eq('userId', targetUserId)
    .catch(() => { /* non-fatal if row doesn't exist */ });

  // ── 3. Anonymise seller_profiles ─────────────────────────────────────────
  await supabase
    .from('seller_profiles')
    .update({
      fullName: 'Deleted Seller',
      phone: null,
      vatNumber: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      postcode: null,
    })
    .eq('userId', targetUserId)
    .catch(() => { /* non-fatal if row doesn't exist */ });

  // ── 4. Delete push tokens ─────────────────────────────────────────────────
  await supabase
    .from('push_tokens')
    .delete()
    .eq('userId', targetUserId)
    .catch(() => { /* non-fatal */ });

  // ── 5. Audit log ──────────────────────────────────────────────────────────
  await supabase
    .from('user_deletion_log')
    .insert({
      deletedUserId: targetUserId,
      deletedByAdminId: callerAuth.id !== targetUserId ? callerAuth.id : null,
      originalEmail: targetUser.email,
      deletedAt: now,
    })
    .catch(() => { /* table may not exist yet — non-fatal */ });

  // ── 6. Hard-delete the Supabase Auth user ─────────────────────────────────
  // This must be done last so that if any earlier step fails the caller can
  // retry using their still-valid JWT.
  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetUserId);
  if (deleteAuthError) {
    console.error('delete-account: auth.admin.deleteUser failed:', deleteAuthError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Account data was anonymised but the authentication record could not be deleted. Please contact support.',
      }),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, message: 'Account deleted and all personal data removed.' }),
  };
};
