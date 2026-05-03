import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';
import { getFeatureFlags } from './_shared/platformFlags';

/**
 * POST /.netlify/functions/register
 *
 * Server-side user registration that bypasses Supabase's client-side email
 * rate limit.  The client SDK's supabase.auth.signUp() sends a confirmation
 * email through Supabase's built-in mailer, which is throttled to ~3 emails
 * per hour on the free plan.  This function uses the Admin API instead:
 *
 *   supabase.auth.admin.createUser({ … })
 *
 * The user is created as unconfirmed (email_confirm defaults to false).
 * A signup confirmation link is then generated via the Admin API and sent
 * through SendGrid — bypassing Supabase's built-in mailer entirely.
 * The user must click the link to verify their email before signing in.
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
  /** Seller account type — captured at registration for compliance. */
  sellerType?: 'individual' | 'sole_trader' | 'company';
  // B2B buyer fields — persisted to buyer_profiles on registration.
  companyName?: string;
  vatNumber?: string;
  customerType?: string;
  businessAddress?: Record<string, string>;
  // Fields stored in user_metadata / users table.
  phone?: string;
  middleName?: string;
  newsletter?: boolean;
  requestAssistance?: boolean;
  areasOfInterest?: string;
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

  const { email, password, firstName, lastName, role, storeName, phone, vatNumber, customerType, companyName, businessAddress, middleName, newsletter, requestAssistance, sellerType } = body;

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
    const flags = await getFeatureFlags(supabase);
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
      ...(middleName        ? { middle_name:        middleName }        : {}),
      ...(phone             ? { phone }                                  : {}),
      ...(vatNumber         ? { vat_number:         vatNumber }         : {}),
      ...(customerType      ? { customer_type:      customerType }      : {}),
      ...(newsletter        ? { newsletter:         true }              : {}),
      ...(requestAssistance ? { request_assistance: true }              : {}),
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

  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');

  // ── Email confirmation ─────────────────────────────────────────────────────
  // The Admin API does not send a confirmation email automatically when a user
  // is created.  Generate a signup confirmation link and deliver it via
  // SendGrid — the same pipeline used by all other transactional emails.
  // This also bypasses Supabase's built-in mailer rate limit entirely.
  const { data: confirmLinkData, error: confirmLinkError } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    options: {
      redirectTo: `${appUrl}/login?confirmed=1`,
    },
  });

  if (confirmLinkError) {
    console.warn('register: generateLink failed (non-fatal):', confirmLinkError.message);
  } else {
    const actionLink = (confirmLinkData as { properties?: { action_link?: string } }).properties?.action_link;
    if (actionLink) {
      // Await the confirmation email so we can log failures — the user must
      // click this link to verify their email before signing in.  Registration
      // still returns 200 even if delivery fails so the auth record is never
      // orphaned; the admin can resend via /resend-verification if needed.
      try {
        const confirmEmailRes = await fetch(`${appUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
          },
          body: JSON.stringify({
            to: email,
            subject: 'Confirm your Loadify Market email address',
            template: 'confirm_email',
            data: {
              userName: `${firstName} ${lastName}`,
              actionLink,
            },
          }),
        });
        if (!confirmEmailRes.ok) {
          const errBody = await confirmEmailRes.json().catch(() => ({})) as Record<string, unknown>;
          console.error('register: confirmation email delivery failed:', confirmEmailRes.status, errBody);
        }
      } catch (err) {
        console.error('register: confirmation email fetch threw (non-fatal):', err);
      }
    } else {
      console.warn('register: action_link missing from generateLink response — confirmation email not sent');
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Seller-only: populate extra profile fields ──────────────────────────────
  // The DB trigger trg_new_user_profile already created the bare
  // seller_profiles + seller_stores rows.  Upsert here to fill in the
  // fields that the trigger does not know about.
  if (role === 'seller') {
    const effectiveStoreName = storeName?.trim() || `${firstName}'s Store`;

    // Validate sellerType before writing — ignore unknown values.
    const validSellerTypes = new Set(['individual', 'sole_trader', 'company']);
    const safeSellerType =
      sellerType && validSellerTypes.has(sellerType) ? sellerType : null;

    // Determine whether this seller requires admin approval before activation.
    // Controlled by the requireCompanyApproval platform feature flag.
    // Only company sellers are ever flagged — individuals/sole traders are unaffected.
    let requiresAdminApproval = false;
    if (safeSellerType === 'company') {
      try {
        const flags = await getFeatureFlags(supabase);
        requiresAdminApproval = Boolean(flags.requireCompanyApproval);
      } catch {
        // Non-fatal — if the flag cannot be read, default to no gate.
      }
    }

    const sellerProfileUpdate: Record<string, unknown> = {
      userId,
      fullName: `${firstName} ${lastName}`,
      storeName: effectiveStoreName,
      ...(safeSellerType ? { sellerType: safeSellerType } : {}),
      requiresAdminApproval,
    };
    if (phone?.trim())                                           sellerProfileUpdate.contactPhone    = phone.trim();
    if (vatNumber?.trim())                                       sellerProfileUpdate.vatNumber        = vatNumber.trim();
    if (businessAddress && Object.keys(businessAddress).length > 0) sellerProfileUpdate.businessAddress = businessAddress;

    const { error: spErr } = await supabase.from('seller_profiles').upsert(
      sellerProfileUpdate,
      { onConflict: 'userId' }
    );
    if (spErr) console.warn('register: seller_profiles upsert (non-fatal):', spErr.message);

    const { error: ssErr } = await supabase.from('seller_stores').upsert(
      { userId, storeName: effectiveStoreName },
      { onConflict: 'userId' }
    );
    if (ssErr) console.warn('register: seller_stores upsert (non-fatal):', ssErr.message);

    // Admin notification is sent below via send-email (admin_new_seller template).
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── Buyer-only: persist B2B fields to buyer_profiles ──────────────────────
  // The DB trigger trg_new_user_profile already created the bare buyer_profiles
  // row. Upsert here only when the buyer provided B2B data (company or VAT).
  if (role === 'buyer' && (companyName?.trim() || vatNumber?.trim() || customerType)) {
    const accountType = customerType || 'individual';
    const b2bUpdate: Record<string, unknown> = {
      userId,
      accountType,
    };
    if (companyName?.trim()) b2bUpdate.companyName = companyName.trim();
    if (vatNumber?.trim()) b2bUpdate.vatNumber = vatNumber.trim();
    if (businessAddress && Object.keys(businessAddress).length > 0) {
      b2bUpdate.businessAddress = businessAddress;
    }
    const { error: bpErr } = await supabase
      .from('buyer_profiles')
      .upsert(b2bUpdate, { onConflict: 'userId' });
    if (bpErr) console.warn('register: buyer_profiles B2B upsert (non-fatal):', bpErr.message);
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── Admin notification email ──────────────────────────────────────────────
  // Fire-and-forget: a failure here must never block successful registration.
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn(
      'register: ADMIN_NOTIFICATION_EMAIL is not set — admin notification email skipped.'
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
