import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';
import { getFeatureFlagsStrict } from './_shared/platformFlags';

/**
 * POST /.netlify/functions/register
 *
 * Creates an unconfirmed Supabase Auth user, persists the minimum marketplace
 * identity/relationship state, and only then sends confirmation/welcome email.
 *
 * Stage 2 contract:
 *   - Buyer and Marketplace Seller are public marketplace relationships.
 *   - Supplier Partner is NOT a public user role here.
 *   - Seller starts fail-closed: sellerStatus='draft', isApproved=false and
 *     seller_stores.isActive=false until later onboarding/readiness gates pass.
 *   - Store identity is never invented during account creation.
 *   - registration availability is a strict operator gate and fails closed when
 *     platform settings cannot be read.
 *
 * Authorization data belongs in app_metadata. user_metadata is intentionally
 * limited to user-editable profile/preferences and must never be trusted for
 * role authorization.
 */

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller';
  storeName?: string;
  sellerType?: 'individual' | 'sole_trader' | 'company';
  companyName?: string;
  vatNumber?: string;
  customerType?: string;
  businessAddress?: Record<string, string>;
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('register: Supabase server configuration is missing');
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Registration service is not configured. Please contact support.' }),
    };
  }

  let body: RegisterRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const {
    email,
    password,
    firstName,
    lastName,
    role,
    storeName,
    phone,
    vatNumber,
    customerType,
    companyName,
    businessAddress,
    middleName,
    newsletter,
    requestAssistance,
    sellerType,
  } = body;

  if (!email || !password || !firstName || !lastName || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  if (!['buyer', 'seller'].includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role' }) };
  }

  if (password.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
  }

  const validSellerTypes = new Set(['individual', 'sole_trader', 'company']);
  if (role === 'seller' && (!sellerType || !validSellerTypes.has(sellerType))) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A valid Seller legal type is required' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ip = getClientIp(event);
  if (ip) {
    const rl = await checkRateLimit({
      supabase,
      tableName: 'register_rate_limits',
      identifier: ip,
      windowMinutes: 60,
      maxAttempts: 10,
      policy: 'fail-soft',
    });
    if (rl.exceeded) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many sign-up attempts. Please try again later.' }),
      };
    }
  }

  let featureFlags: Awaited<ReturnType<typeof getFeatureFlagsStrict>>;
  try {
    featureFlags = await getFeatureFlagsStrict(supabase);
  } catch (error) {
    console.error('register: registration availability lookup failed:', error instanceof Error ? error.message : error);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Registration availability could not be verified. Please try again later.' }),
    };
  }

  if (role === 'seller' && featureFlags.sellerRegistration === false) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Seller registration is temporarily disabled. Please try again later.' }),
    };
  }
  if (role === 'buyer' && featureFlags.buyerRegistration === false) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Buyer registration is temporarily disabled. Please try again later.' }),
    };
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    app_metadata: { role },
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      ...(middleName ? { middle_name: middleName } : {}),
      ...(phone ? { phone } : {}),
      ...(vatNumber ? { vat_number: vatNumber } : {}),
      ...(customerType ? { customer_type: customerType } : {}),
      ...(newsletter ? { newsletter: true } : {}),
      ...(requestAssistance ? { request_assistance: true } : {}),
    },
  });

  if (authError) {
    const message = authError.message.toLowerCase();
    const isRateLimit =
      authError.status === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('too many');

    if (isRateLimit) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Registration is temporarily unavailable due to high demand. Please try again in a few minutes.',
        }),
      };
    }

    if (message.includes('database error')) {
      console.error('register: Supabase auth database trigger error:', authError.message);
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'Account creation failed due to a technical issue. Please try again in a few moments or contact support if the problem persists.',
        }),
      };
    }

    const isDuplicate =
      message.includes('already registered') ||
      message.includes('already exists') ||
      message.includes('duplicate');

    if (!isDuplicate) {
      console.error('register: auth.admin.createUser failed:', authError.message);
    }

    return {
      statusCode: isDuplicate ? 200 : 400,
      body: JSON.stringify(
        isDuplicate
          ? { message: "We've received your registration request. If this email address is not already in use, your account has been created. Please check your inbox." }
          : { error: 'Registration failed. Please check your details and try again.' },
      ),
    };
  }

  if (!authData.user) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create account. Please try again.' }) };
  }

  const userId = authData.user.id;

  const cleanupFailedRegistration = async (reason: string) => {
    console.error(`register: ${reason}; cleaning up newly-created account ${userId}`);
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) console.error('register: public.users cleanup failed:', error.message);
    } catch (error) {
      console.error('register: public.users cleanup threw:', error);
    }
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) console.error('register: auth user cleanup failed:', error.message);
    } catch (error) {
      console.error('register: auth user cleanup threw:', error);
    }
  };

  // The auth.users trigger may already have inserted this row. A duplicate is
  // expected; any other failure is fatal because an Auth-only orphan identity
  // must never be returned to the user as a successful marketplace account.
  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    email,
    firstName,
    lastName,
    role,
    isEmailVerified: false,
    ...(phone ? { phone } : {}),
  });

  if (profileError && profileError.code !== '23505') {
    await cleanupFailedRegistration(`users insert failed: ${profileError.message}`);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to initialize account. Please try again.' }) };
  }

  let explicitStoreName: string | null = null;

  if (role === 'seller') {
    explicitStoreName = storeName?.trim() || null;
    const safeSellerType = sellerType as 'individual' | 'sole_trader' | 'company';
    const requiresAdminApproval = safeSellerType === 'company' && Boolean(featureFlags.requireCompanyApproval);

    const sellerProfileUpdate: Record<string, unknown> = {
      userId,
      fullName: `${firstName} ${lastName}`,
      sellerType: safeSellerType,
      sellerStatus: 'draft',
      isApproved: false,
      requiresAdminApproval,
      ...(explicitStoreName ? { storeName: explicitStoreName } : {}),
    };
    if (phone?.trim()) sellerProfileUpdate.contactPhone = phone.trim();
    if (vatNumber?.trim()) sellerProfileUpdate.vatNumber = vatNumber.trim();
    if (businessAddress && Object.keys(businessAddress).length > 0) {
      sellerProfileUpdate.businessAddress = businessAddress;
    }

    const { error: spErr } = await supabase.from('seller_profiles').upsert(
      sellerProfileUpdate,
      { onConflict: 'userId' },
    );
    if (spErr) {
      await cleanupFailedRegistration(`seller_profiles upsert failed: ${spErr.message}`);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to initialize Seller setup. Please try again.' }) };
    }

    const sellerStoreUpdate: Record<string, unknown> = {
      userId,
      isActive: false,
      ...(explicitStoreName ? { storeName: explicitStoreName } : {}),
    };
    const { error: ssErr } = await supabase.from('seller_stores').upsert(
      sellerStoreUpdate,
      { onConflict: 'userId' },
    );
    if (ssErr) {
      await cleanupFailedRegistration(`seller_stores upsert failed: ${ssErr.message}`);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to initialize Seller store. Please try again.' }) };
    }
  }

  if (role === 'buyer' && (companyName?.trim() || vatNumber?.trim() || customerType)) {
    const b2bUpdate: Record<string, unknown> = {
      userId,
      accountType: customerType || 'individual',
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

  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');

  const { data: confirmLinkData, error: confirmLinkError } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    options: { redirectTo: `${appUrl}/login?confirmed=1` },
  });

  if (confirmLinkError) {
    console.warn('register: generateLink failed (non-fatal):', confirmLinkError.message);
  } else {
    const actionLink = (confirmLinkData as { properties?: { action_link?: string } }).properties?.action_link;
    if (actionLink) {
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
            data: { userName: `${firstName} ${lastName}`, actionLink },
          }),
        });
        if (!confirmEmailRes.ok) {
          const errBody = (await confirmEmailRes.json().catch(() => ({}))) as Record<string, unknown>;
          console.error('register: confirmation email delivery failed:', confirmEmailRes.status, errBody);
        }
      } catch (error) {
        console.error('register: confirmation email fetch threw (non-fatal):', error);
      }
    } else {
      console.warn('register: action_link missing from generateLink response — confirmation email not sent');
    }
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn('register: ADMIN_NOTIFICATION_EMAIL is not set — admin notification email skipped.');
  } else {
    const template = role === 'seller' ? 'admin_new_seller' : 'admin_new_buyer';
    const subject = role === 'seller' ? 'Loadify: New Seller Registration' : 'Loadify: New Buyer Registration';
    const notificationData: Record<string, string> = {
      registeredAt: new Date().toLocaleString('en-GB'),
      sellerEmail: email,
      sellerName: `${firstName} ${lastName}`,
    };
    if (role === 'seller') {
      notificationData.storeName = explicitStoreName || 'Not set yet';
    }
    fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
      },
      body: JSON.stringify({ to: adminEmail, subject, template, data: notificationData }),
    }).catch((error: unknown) => console.warn('register: admin notification failed (non-fatal):', error));
  }

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
    }).catch((error: unknown) => console.warn('register: seller welcome email failed (non-fatal):', error));
  }

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
    }).catch((error: unknown) => console.warn('register: buyer welcome email failed (non-fatal):', error));
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, userId }),
  };
};