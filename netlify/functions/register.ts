import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /.netlify/functions/register
 *
 * Server-side user registration that bypasses Supabase's client-side email
 * rate limit.  The client SDK's supabase.auth.signUp() sends a confirmation
 * email through Supabase's built-in mailer, which is throttled to ~3 emails
 * per hour on the free plan.  This function uses the Admin API instead:
 *
 *   supabase.auth.admin.createUser({ …, email_confirm: true })
 *
 * Setting email_confirm: true marks the address as verified immediately so
 * no confirmation email is dispatched — eliminating the rate-limit entirely.
 * The user can sign in as soon as this function returns 200.
 *
 * After creating the auth record this function also inserts the public.users
 * profile row and, for sellers, upserts seller_profiles / seller_stores with
 * the supplied name fields.  The DB trigger trg_new_user_profile handles
 * creating the bare profile rows automatically; the upsert here only populates
 * the extra columns (fullName, storeName) that the trigger does not know.
 *
 * Requires env vars (set in Netlify UI and .env for local netlify dev):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller';
  storeName?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Env validation ──────────────────────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'register: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Add both to Netlify environment variables (and .env for local netlify dev).'
    );
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Registration service is not configured. Please contact support.' }),
    };
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── Parse + validate request body ──────────────────────────────────────────
  let body: RegisterRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { email, password, firstName, lastName, role, storeName } = body;

  if (!email || !password || !firstName || !lastName || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  if (!['buyer', 'seller'].includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role' }) };
  }

  if (password.length < 6) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };
  }
  // ────────────────────────────────────────────────────────────────────────────

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Create auth user via Admin API ─────────────────────────────────────────
  // email_confirm: true  →  account is immediately active; no confirmation
  // email is sent, so Supabase's built-in mailer rate limit is never hit.
  // This is the key bypass for the "email rate limit exceeded" error.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role,
    },
  });
  // ────────────────────────────────────────────────────────────────────────────

  if (authError) {
    // ── Rate-limit detection ──────────────────────────────────────────────────
    // Supabase can return HTTP 429 or an error message containing "rate limit"
    // even via the Admin API (e.g. when the project-level request quota is hit).
    // Detect this early and return a clear, user-facing message so the UI never
    // shows raw technical text like "email rate limit exceeded".
    const isRateLimit =
      authError.status === 429 ||
      authError.message.toLowerCase().includes('rate limit') ||
      authError.message.toLowerCase().includes('too many requests') ||
      authError.message.toLowerCase().includes('too many');

    if (isRateLimit) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Too many sign-up attempts. Please wait a few minutes and try again.',
        }),
      };
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Supabase returns "User already registered" when the email exists.
    // Map this to a clean message so the UI can show something useful.
    const isDuplicate =
      authError.message.toLowerCase().includes('already registered') ||
      authError.message.toLowerCase().includes('already exists') ||
      authError.message.toLowerCase().includes('duplicate');

    return {
      statusCode: isDuplicate ? 409 : 400,
      body: JSON.stringify({
        error: isDuplicate
          ? 'An account with this email address already exists.'
          : authError.message,
      }),
    };
  }

  if (!authData.user) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create account. Please try again.' }) };
  }

  const userId = authData.user.id;

  // ── Insert public.users profile row ────────────────────────────────────────
  // ORDER IS INTENTIONAL: the auth user is created above first (step 1), then
  // the public profile row is inserted here (step 2).  Reversing this order
  // would violate the FK constraint users.id → auth.users.id.
  // The service-role client bypasses RLS so this succeeds regardless of the
  // current RLS INSERT policy on the users table.
  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    email,
    firstName,
    lastName,
    role,
    isEmailVerified: true,  // confirmed above via email_confirm: true
  });

  if (profileError) {
    // 23505 = unique_violation — row already exists (race with DB trigger or
    // duplicate request).  Safe to continue; the profile is already there.
    if (profileError.code !== '23505') {
      console.error('register: users insert failed:', profileError.message);
      // Non-fatal: the auth user exists and can sign in; the profile row can
      // be backfilled by the 20_fix_users_table.sql backfill query if needed.
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── Seller-only: populate extra profile fields ──────────────────────────────
  // The DB trigger trg_new_user_profile already created the bare
  // seller_profiles + seller_stores rows.  Upsert here to fill in the
  // name fields that the trigger does not know about.
  if (role === 'seller') {
    const effectiveStoreName = storeName?.trim() || `${firstName}'s Store`;

    const { error: spErr } = await supabase.from('seller_profiles').upsert(
      {
        userId,
        fullName: `${firstName} ${lastName}`,
        storeName: effectiveStoreName,
      },
      { onConflict: 'userId' }
    );
    if (spErr) console.warn('register: seller_profiles upsert (non-fatal):', spErr.message);

    const { error: ssErr } = await supabase.from('seller_stores').upsert(
      { userId, storeName: effectiveStoreName },
      { onConflict: 'userId' }
    );
    if (ssErr) console.warn('register: seller_stores upsert (non-fatal):', ssErr.message);
  }
  // ────────────────────────────────────────────────────────────────────────────

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, userId }),
  };
};
