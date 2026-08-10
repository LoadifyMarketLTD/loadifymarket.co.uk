/**
 * delete-account
 *
 * Account deletion with UK GDPR / Data Protection Act data minimisation.
 * Transaction records that must remain for accounting, fraud, disputes and
 * payment reconciliation are retained, but profile/contact/storefront data is removed.
 */

import { createHash } from 'crypto';
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

  const rl = await checkRateLimit({
    supabase,
    tableName: 'delete_account_rate_limits',
    identifier: callerAuth.id,
    windowMinutes: 60,
    maxAttempts: 3,
    policy: 'fail-closed',
  });
  if (rl.exceeded) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Too many deletion requests. Please try again later.' }),
    };
  }

  let body: { targetUserId?: string } = {};
  try {
    if (event.body) body = JSON.parse(event.body) as { targetUserId?: string };
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { data: callerRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', callerAuth.id)
    .maybeSingle<{ role: string | null }>();

  const isAdmin = callerRow?.role === 'admin';
  const targetUserId = body.targetUserId && isAdmin ? body.targetUserId : callerAuth.id;

  if (body.targetUserId && body.targetUserId !== callerAuth.id && !isAdmin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'You can only delete your own account' }) };
  }

  const { data: targetUser, error: targetLookupError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', targetUserId)
    .maybeSingle<{ id: string; email: string; role: string | null }>();

  if (targetLookupError || !targetUser) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'User not found' }) };
  }

  if (targetUser.role === 'admin') {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Admin accounts must be removed through the controlled admin process.' }),
    };
  }

  const now = new Date().toISOString();
  const shortId = targetUserId.slice(0, 8);
  const anonEmail = `deleted_${shortId}@removed.invalid`;
  const emailHash = `sha256:${createHash('sha256').update(targetUser.email.trim().toLowerCase()).digest('hex')}`;

  // Every operation in this set is core anonymisation. The Auth identity is
  // removed only after all of them succeed, so a partial failure can be retried.
  const coreOperations = [
    await supabase
      .from('users')
      .update({
        email: anonEmail,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        avatarUrl: null,
        isActive: false,
      })
      .eq('id', targetUserId),

    await supabase
      .from('buyer_profiles')
      .update({
        shippingAddress: null,
        billingAddress: null,
        businessAddress: null,
        companyName: null,
        vatNumber: null,
        preferences: null,
        isVatVerified: false,
      })
      .eq('userId', targetUserId),

    await supabase
      .from('seller_profiles')
      .update({
        fullName: 'Deleted Seller',
        storeName: 'Deleted Seller',
        phone: null,
        country: null,
        businessName: 'Deleted Seller',
        vatNumber: null,
        companyRegistrationNumber: null,
        businessAddress: null,
        payoutDetails: null,
        contactPhone: null,
        shippingDefaults: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        postcode: null,
        isApproved: false,
        isVerified: false,
        isPaused: true,
        profileCompleted: false,
        sellerStatus: 'suspended',
      })
      .eq('userId', targetUserId),

    await supabase
      .from('products')
      .update({ isActive: false })
      .eq('sellerId', targetUserId),

    await supabase
      .from('seller_stores')
      .update({
        storeName: 'Deleted Store',
        storeSlug: `deleted-${shortId}`,
        storeLogo: null,
        storeDescription: null,
        storeBanner: null,
        socialLinks: null,
        returnPolicy: null,
        shippingPolicy: null,
        isActive: false,
      })
      .eq('userId', targetUserId),
  ];

  const coreError = coreOperations.find((result) => result.error)?.error;
  if (coreError) {
    console.error('delete-account: core anonymisation failed:', coreError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Account deletion could not be completed safely. No authentication record was removed; please try again.' }),
    };
  }

  const { error: tokenDeleteError } = await supabase.from('push_tokens').delete().eq('userId', targetUserId);
  if (tokenDeleteError) console.warn('delete-account: push token cleanup failed:', tokenDeleteError.message);

  const { error: auditError } = await supabase
    .from('user_deletion_log')
    .insert({
      deletedUserId: targetUserId,
      deletedByAdminId: callerAuth.id !== targetUserId ? callerAuth.id : null,
      originalEmail: emailHash,
      deletedAt: now,
    });

  if (auditError) {
    console.error('delete-account: deletion audit write failed:', auditError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Account data was anonymised, but the deletion audit could not be recorded. Please contact support.' }),
    };
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetUserId);
  if (deleteAuthError) {
    console.error('delete-account: auth.admin.deleteUser failed:', deleteAuthError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Account data was anonymised but the authentication record could not be deleted. Please contact support.' }),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: 'Account deleted. Profile, contact and storefront data was removed; transaction records required for accounting, fraud prevention, disputes and payment reconciliation are retained.',
    }),
  };
};
