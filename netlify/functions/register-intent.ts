import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';
import { getFeatureFlagsStrict } from './_shared/platformFlags';

type RequestedRole = 'buyer' | 'seller';
type SellerType = 'individual' | 'sole_trader' | 'company';
type BuyerAccountType =
  | 'individual'
  | 'sole_trader'
  | 'limited_company'
  | 'partnership'
  | 'charity'
  | 'other';

interface RegisterIntentRequest {
  email: string;
  firstName: string;
  lastName: string;
  requestedRole: RequestedRole;
  sellerType?: SellerType;
  storeName?: string;
  phone?: string;
  companyName?: string;
  vatNumber?: string;
  customerType?: BuyerAccountType;
  businessAddress?: Record<string, string>;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('register-intent: Supabase server configuration is missing');
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: 'Registration service is not configured. Please contact support.',
      }),
    };
  }

  let body: RegisterIntentRequest;

  try {
    body = JSON.parse(event.body || '{}') as RegisterIntentRequest;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  const email =
    typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const firstName =
    typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName =
    typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const requestedRole = body.requestedRole;

  if (!email || !firstName || !lastName || !requestedRole) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  if (!['buyer', 'seller'].includes(requestedRole)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid requested role' }),
    };
  }

  const validSellerTypes = new Set<SellerType>([
    'individual',
    'sole_trader',
    'company',
  ]);

  if (
    requestedRole === 'seller' &&
    (!body.sellerType || !validSellerTypes.has(body.sellerType))
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'A valid Seller legal type is required',
      }),
    };
  }

  if (requestedRole === 'buyer' && body.sellerType) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Buyer registration cannot include Seller identity',
      }),
    };
  }

  const validBuyerAccountTypes = new Set<BuyerAccountType>([
    'individual',
    'sole_trader',
    'limited_company',
    'partnership',
    'charity',
    'other',
  ]);

  if (
    requestedRole === 'buyer' &&
    body.customerType &&
    !validBuyerAccountTypes.has(body.customerType)
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid Buyer account type' }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const ip = getClientIp(event);

  if (ip) {
    const rateLimit = await checkRateLimit({
      supabase,
      tableName: 'register_rate_limits',
      identifier: ip,
      windowMinutes: 60,
      maxAttempts: 10,
      policy: 'fail-soft',
    });

    if (rateLimit.exceeded) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Too many sign-up attempts. Please try again later.',
        }),
      };
    }
  }

  let featureFlags: Awaited<ReturnType<typeof getFeatureFlagsStrict>>;

  try {
    featureFlags = await getFeatureFlagsStrict(supabase);
  } catch (error) {
    console.error(
      'register-intent: registration availability lookup failed:',
      error instanceof Error ? error.message : error,
    );

    return {
      statusCode: 503,
      body: JSON.stringify({
        error:
          'Registration availability could not be verified. Please try again later.',
      }),
    };
  }

  if (
    requestedRole === 'seller' &&
    featureFlags.sellerRegistration === false
  ) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: 'Seller registration is temporarily disabled. Please try again later.',
      }),
    };
  }

  if (
    requestedRole === 'buyer' &&
    featureFlags.buyerRegistration === false
  ) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: 'Buyer registration is temporarily disabled. Please try again later.',
      }),
    };
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc(
    'create_signup_intent',
    {
      p_email: email,
      p_requested_role: requestedRole,
      p_first_name: firstName,
      p_last_name: lastName,
      p_seller_type:
        requestedRole === 'seller' ? body.sellerType ?? null : null,
      p_store_name:
        typeof body.storeName === 'string'
          ? body.storeName.trim() || null
          : null,
      p_phone:
        typeof body.phone === 'string'
          ? body.phone.trim() || null
          : null,
      p_company_name:
        typeof body.companyName === 'string'
          ? body.companyName.trim() || null
          : null,
      p_vat_number:
        typeof body.vatNumber === 'string'
          ? body.vatNumber.trim() || null
          : null,
      p_customer_type:
        requestedRole === 'buyer'
          ? body.customerType ?? null
          : null,
      p_business_address:
        body.businessAddress &&
        typeof body.businessAddress === 'object'
          ? body.businessAddress
          : null,
      p_expires_at: expiresAt,
    },
  );

  const intent =
    Array.isArray(data) && data.length === 1
      ? (data[0] as { id: string; expires_at: string })
      : null;

  if (error || !intent) {
    console.error(
      'register-intent: failed to persist intent:',
      error?.message ?? 'missing inserted row',
    );

    return {
      statusCode: 503,
      body: JSON.stringify({
        error: 'Registration could not be initialized. Please try again.',
      }),
    };
  }

  return {
    statusCode: 201,
    body: JSON.stringify({
      intentId: intent.id,
      expiresAt: intent.expires_at,
    }),
  };
};
