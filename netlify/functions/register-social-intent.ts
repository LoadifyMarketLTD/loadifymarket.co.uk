import type { Handler } from '@netlify/functions';
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';
import { getFeatureFlagsStrict } from './_shared/platformFlags';

type RequestedRole = 'buyer' | 'seller';
type SellerType = 'individual' | 'sole_trader' | 'company';

interface SocialIntentRequest {
  provider: 'google';
  credential: string;
  nonce: string;
  requestedRole: RequestedRole;
  sellerType?: SellerType;
}

interface GoogleHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface GoogleClaims {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  nonce?: string;
  exp?: number;
  iat?: number;
  given_name?: string;
  family_name?: string;
  name?: string;
}

interface GoogleJwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const MAX_TOKEN_AGE_SECONDS = 10 * 60;

let jwksCache: { keys: GoogleJwk[]; expiresAt: number } | null = null;

const base64UrlDecode = (value: string): Buffer => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64');
};

const parseJwtPart = <T>(part: string): T => {
  return JSON.parse(base64UrlDecode(part).toString('utf8')) as T;
};

const parseCacheMaxAge = (value: string | null): number => {
  const match = value?.match(/(?:^|,)\s*max-age=(\d+)/i);
  return match ? Number(match[1]) : 300;
};

const getGoogleJwks = async (): Promise<GoogleJwk[]> => {
  if (jwksCache && jwksCache.expiresAt > Date.now()) {
    return jwksCache.keys;
  }

  const response = await fetch(GOOGLE_JWKS_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Google signing keys could not be loaded');
  }

  const payload = (await response.json()) as { keys?: GoogleJwk[] };
  const keys = Array.isArray(payload.keys) ? payload.keys : [];
  if (keys.length === 0) {
    throw new Error('Google signing keys are unavailable');
  }

  const maxAge = Math.max(60, Math.min(parseCacheMaxAge(response.headers.get('cache-control')), 3600));
  jwksCache = {
    keys,
    expiresAt: Date.now() + maxAge * 1000,
  };

  return keys;
};

const audienceMatches = (audience: string | string[] | undefined, expected: string): boolean => {
  if (typeof audience === 'string') return audience === expected;
  return Array.isArray(audience) && audience.includes(expected);
};

const sha256Hex = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

const deriveNames = (claims: GoogleClaims): { firstName: string; lastName: string } => {
  const firstName = claims.given_name?.trim() ?? '';
  const lastName = claims.family_name?.trim() ?? '';
  if (firstName && lastName) return { firstName, lastName };

  const nameParts = claims.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (nameParts.length >= 2) {
    return {
      firstName: firstName || nameParts[0],
      lastName: lastName || nameParts.slice(1).join(' '),
    };
  }

  throw new Error('Google profile must provide first and last name');
};

const verifyGoogleCredential = async (
  credential: string,
  rawNonce: string,
  expectedAudience: string,
): Promise<GoogleClaims> => {
  const parts = credential.split('.');
  if (parts.length !== 3) throw new Error('Invalid Google credential');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseJwtPart<GoogleHeader>(encodedHeader);
  const claims = parseJwtPart<GoogleClaims>(encodedPayload);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Google credential signature');
  }

  const keys = await getGoogleJwks();
  const key = keys.find(
    (candidate) =>
      candidate.kid === header.kid &&
      (!candidate.alg || candidate.alg === 'RS256') &&
      (!candidate.use || candidate.use === 'sig'),
  );

  if (!key) throw new Error('Google signing key was not found');

  const publicKey = createPublicKey({ key, format: 'jwk' });
  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8');
  const signature = base64UrlDecode(encodedSignature);

  if (!verifySignature('RSA-SHA256', signingInput, publicKey, signature)) {
    throw new Error('Invalid Google credential signature');
  }

  const now = Math.floor(Date.now() / 1000);

  if (!claims.iss || !GOOGLE_ISSUERS.has(claims.iss)) {
    throw new Error('Invalid Google credential issuer');
  }

  if (!audienceMatches(claims.aud, expectedAudience)) {
    throw new Error('Invalid Google credential audience');
  }

  if (claims.azp && claims.azp !== expectedAudience) {
    throw new Error('Invalid Google credential authorized party');
  }

  if (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== expectedAudience) {
    throw new Error('Google credential authorized party is required');
  }

  if (!claims.exp || claims.exp <= now) {
    throw new Error('Google credential has expired');
  }

  if (!claims.iat || claims.iat > now + 60 || now - claims.iat > MAX_TOKEN_AGE_SECONDS) {
    throw new Error('Google credential is outside the accepted age window');
  }

  if (!rawNonce || claims.nonce !== sha256Hex(rawNonce)) {
    throw new Error('Google credential nonce mismatch');
  }

  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  if (!emailVerified) {
    throw new Error('Google email is not verified');
  }

  if (!claims.sub?.trim() || !claims.email?.trim()) {
    throw new Error('Google credential identity is incomplete');
  }

  return claims;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

  if (!supabaseUrl || !serviceRoleKey || !googleClientId) {
    console.error('register-social-intent: server configuration is missing');
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Social registration is not configured. Please contact support.' }),
    };
  }

  let body: SocialIntentRequest;
  try {
    body = JSON.parse(event.body || '{}') as SocialIntentRequest;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (body.provider !== 'google') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported social registration provider' }) };
  }

  if (typeof body.credential !== 'string' || typeof body.nonce !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing Google registration credential' }) };
  }

  if (!['buyer', 'seller'].includes(body.requestedRole)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid requested role' }) };
  }

  const validSellerTypes = new Set<SellerType>(['individual', 'sole_trader', 'company']);
  if (
    body.requestedRole === 'seller' &&
    (!body.sellerType || !validSellerTypes.has(body.sellerType))
  ) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A valid Seller legal type is required' }) };
  }

  if (body.requestedRole === 'buyer' && body.sellerType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Buyer registration cannot include Seller identity' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ip = getClientIp(event);
  if (ip) {
    const rateLimit = await checkRateLimit({
      supabase,
      tableName: 'register_rate_limits',
      identifier: `social:${ip}`,
      windowMinutes: 60,
      maxAttempts: 10,
      policy: 'fail-soft',
    });

    if (rateLimit.exceeded) {
      return { statusCode: 429, body: JSON.stringify({ error: 'Too many sign-up attempts. Please try again later.' }) };
    }
  }

  let featureFlags: Awaited<ReturnType<typeof getFeatureFlagsStrict>>;
  try {
    featureFlags = await getFeatureFlagsStrict(supabase);
  } catch (error) {
    console.error('register-social-intent: registration availability lookup failed', error);
    return { statusCode: 503, body: JSON.stringify({ error: 'Registration availability could not be verified. Please try again later.' }) };
  }

  if (body.requestedRole === 'buyer' && featureFlags.buyerRegistration === false) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Buyer registration is temporarily disabled. Please try again later.' }) };
  }

  if (body.requestedRole === 'seller' && featureFlags.sellerRegistration === false) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Seller registration is temporarily disabled. Please try again later.' }) };
  }

  let claims: GoogleClaims;
  try {
    claims = await verifyGoogleCredential(body.credential, body.nonce, googleClientId);
  } catch (error) {
    console.warn(
      'register-social-intent: Google credential rejected:',
      error instanceof Error ? error.message : 'unknown verification failure',
    );
    return { statusCode: 403, body: JSON.stringify({ error: 'Google registration could not be verified.' }) };
  }

  let names: { firstName: string; lastName: string };
  try {
    names = deriveNames(claims);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Google profile is incomplete' }),
    };
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('create_social_signup_intent', {
    p_auth_provider: 'google',
    p_provider_subject: claims.sub!.trim(),
    p_email: claims.email!.trim().toLowerCase(),
    p_requested_role: body.requestedRole,
    p_first_name: names.firstName,
    p_last_name: names.lastName,
    p_seller_type: body.requestedRole === 'seller' ? body.sellerType ?? null : null,
    p_expires_at: expiresAt,
  });

  const intent =
    Array.isArray(data) && data.length === 1
      ? (data[0] as { id: string; expires_at: string })
      : null;

  if (error || !intent) {
    console.error('register-social-intent: failed to persist verified social intent', error?.message ?? 'missing row');
    return { statusCode: 503, body: JSON.stringify({ error: 'Social registration could not be initialized. Please try again.' }) };
  }

  return {
    statusCode: 201,
    body: JSON.stringify({
      provider: 'google',
      intentId: intent.id,
      expiresAt: intent.expires_at,
      email: claims.email!.trim().toLowerCase(),
    }),
  };
};
