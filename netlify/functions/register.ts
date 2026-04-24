import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';

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
  // Optional B2B fields sent by the TradeAccount / Signup forms.
  // phone is persisted to users.phone (column already exists).
  // vatNumber and customerType are stored in user_metadata for future use.
  phone?: string;
  vatNumber?: string;
  customerType?: string;
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

  const { email, password, firstName, lastName, role, storeName, phone, vatNumber, customerType } = body;

  if (!email || !password || !firstName || !lastName || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  if (!['buyer', 'seller'].includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role' }) };
  }

  if (password.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
  }
  // ────────────────────────────────────────────────────────────────────────────

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Rate limiting: 10 registration attempts per IP per hour ──────────────
  const ip = getClientIp(event);
  if (ip) {
    const rl = await checkRateLimit({
      supabase,
      tableName: 'register_rate_limits',
      identifier: ip,
      windowMinutes: 60,
      maxAttempts: 10,
    });
    if (rl.exceeded) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Too many sign-up attempts. Please try again later.',
        }),
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Feature-flag guard ────────────────────────────────────────────────────
  // Check platform_settings.feature_flags before allowing registration.
  // AdminSettings saves sellerRegistration / buyerRegistration flags here.
  try {
    const { data: flagRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .maybeSingle();
    if (flagRow?.value && typeof flagRow.value === 'object') {
      const flags = flagRow.value as Record<string, boolean>;
      if (role === 'seller' && flags.sellerRegistration === false) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Seller registration is temporarily disabled. Please try again later.' }),
        };
      }
      if (role === 'buyer' && flags.buyerRegistration === false) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Buyer registration is temporarily disabled. Please try again later.' }),
        };
      }
    }
  } catch {
    // Non-fatal — if settings cannot be read, allow registration to proceed.
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Create auth user via Admin API ─────────────────────────────────────────
  // Supabase will dispatch a confirmation email. The user must click the link
  // to verify email ownership before they can sign in.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role,
      ...(phone ? { phone } : {}),
      ...(vatNumber ? { vat_number: vatNumber } : {}),
      ...(customerType ? { customer_type: customerType } : {}),
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
          error: 'Registration is temporarily unavailable due to high demand. Please try again in a few minutes.',
        }),
      };
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Database trigger error detection ─────────────────────────────────────
    // Supabase returns "Database error creating new user" (or similar) when an
    // auth.users INSERT trigger throws an unhandled exception.  This is an
    // internal server-side error — never expose it verbatim to the user.
    const isDatabaseError =
      authError.message.toLowerCase().includes('database error');

    if (isDatabaseError) {
      console.error('register: Supabase auth database trigger error:', authError.message);
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'Account creation failed due to a technical issue. Please try again in a few moments or contact support if the problem persists.',
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
      statusCode: isDuplicate ? 200 : 400,
      body: JSON.stringify(
        isDuplicate
          ? { message: "We've received your registration request. If this email address is not already in use, your account has been created. Please check your inbox." }
          : { error: authError.message }
      ),
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
    isEmailVerified: false,  // user must verify email via the confirmation link
    ...(phone ? { phone } : {}),
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

  const appUrl = process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';

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

    try {
      await fetch(`${appUrl}/.netlify/functions/notify-new-seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          businessName: effectiveStoreName,
        }),
      });
    } catch (err: unknown) {
      console.warn('register: notify-new-seller failed (non-fatal):', err);
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── Admin notification email ──────────────────────────────────────────────
  // Fire-and-forget: a failure here must never block successful registration.
  // Fall back to the primary admin inbox when the env var is not configured.
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'support@loadifymarket.co.uk';
  if (!process.env.ADMIN_NOTIFICATION_EMAIL) {
    console.warn(
      'register: ADMIN_NOTIFICATION_EMAIL is not set — falling back to support@loadifymarket.co.uk. ' +
      'Set this environment variable in the Netlify dashboard to override.'
    );
  }
  if (adminEmail) {
    const template = role === 'seller' ? 'admin_new_seller' : 'admin_new_buyer';
    const subject  = role === 'seller' ? 'Loadify: New Seller Registration' : 'Loadify: New Buyer Registration';
    const notificationData: Record<string, string> = {
      registeredAt: new Date().toLocaleString('en-GB'),
      sellerEmail: email,
      sellerName: `${firstName} ${lastName}`,
    };
    if (role === 'seller') {
      notificationData.storeName = storeName?.trim() || `${firstName}'s Store`;
    }
    fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
      },
      body: JSON.stringify({
        to: adminEmail,
        subject,
        template,
        data: notificationData,
      }),
    }).catch((err: unknown) => console.warn('register: admin notification failed (non-fatal):', err));
  }

  // ── Seller welcome email ───────────────────────────────────────────────────
  // Send a confirmation to the seller so they know their account was created
  // and understand the next steps (complete profile + connect Stripe).
  if (role === 'seller') {
    fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
      },
      body: JSON.stringify({
        to: email,
        subject: 'Welcome to Loadify Market — complete your seller setup',
        template: 'seller_welcome',
        data: { sellerName: `${firstName} ${lastName}` },
      }),
    }).catch((err: unknown) => console.warn('register: seller welcome email failed (non-fatal):', err));
  }

  // ── Buyer welcome email ────────────────────────────────────────────────────
  // Send a welcome confirmation to the buyer so they know their account is ready.
  if (role === 'buyer') {
    fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
      },
      body: JSON.stringify({
        to: email,
        subject: 'Welcome to Loadify Market',
        template: 'buyer_welcome',
        data: { buyerName: `${firstName} ${lastName}` },
      }),
    }).catch((err: unknown) => console.warn('register: buyer welcome email failed (non-fatal):', err));
  }
  // ─────────────────────────────────────────────────────────────────────────

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, userId }),
  };
};
