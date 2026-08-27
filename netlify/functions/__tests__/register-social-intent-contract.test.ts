import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const fn = read('netlify/functions/register-social-intent.ts');
const modern = read('netlify/functions-modern/register-social-intent.ts');
const signupEntry = read('src/pages/pixel-perfect/SignupEntry.tsx');

describe('verified social registration contract', () => {
  it('keeps the modern function as a thin wrapper', () => {
    expect(modern).toContain("export { handler } from '../functions/register-social-intent'");
  });

  it('supports Google only and rejects other social providers', () => {
    expect(fn).toContain("provider: 'google'");
    expect(fn).toContain('Unsupported social registration provider');
    expect(fn).not.toContain("provider: 'facebook'");
  });

  it('requires explicit server configuration', () => {
    expect(fn).toContain('GOOGLE_CLIENT_ID');
    expect(fn).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(fn).toContain('Social registration is not configured');
  });

  it('verifies Google JWT signature against the official JWKS', () => {
    expect(fn).toContain('https://www.googleapis.com/oauth2/v3/certs');
    expect(fn).toContain("header.alg !== 'RS256'");
    expect(fn).toContain("createPublicKey({ key, format: 'jwk' })");
    expect(fn).toContain("verifySignature('RSA-SHA256'");
    expect(fn).toContain('Invalid Google credential signature');
  });

  it('validates issuer, audience, expiry and token age', () => {
    expect(fn).toContain('https://accounts.google.com');
    expect(fn).toContain('audienceMatches');
    expect(fn).toContain('Invalid Google credential audience');
    expect(fn).toContain('Google credential has expired');
    expect(fn).toContain('MAX_TOKEN_AGE_SECONDS');
  });

  it('binds the credential to the raw nonce through SHA-256', () => {
    expect(fn).toContain("createHash('sha256')");
    expect(fn).toContain('claims.nonce !== sha256Hex(rawNonce)');
    expect(fn).toContain('Google credential nonce mismatch');
  });

  it('requires verified provider identity data', () => {
    expect(fn).toContain('Google email is not verified');
    expect(fn).toContain("claims.sub?.trim()");
    expect(fn).toContain("claims.email?.trim()");
    expect(fn).toContain('Google credential identity is incomplete');
  });

  it('persists authorization through the service-role social intent RPC', () => {
    expect(fn).toContain("supabase.rpc('create_social_signup_intent'");
    expect(fn).toContain("p_auth_provider: 'google'");
    expect(fn).toContain('p_provider_subject: claims.sub!.trim()');
    expect(fn).toContain('p_requested_role: body.requestedRole');
  });

  it('keeps Buyer and Seller selection constrained', () => {
    expect(fn).toContain("!['buyer', 'seller'].includes(body.requestedRole)");
    expect(fn).toContain('A valid Seller legal type is required');
    expect(fn).toContain('Buyer registration cannot include Seller identity');
  });

  it('requires account type before the signup form route', () => {
    expect(signupEntry).toContain("requestedType === \"buyer\" || requestedType === \"seller\"");
    expect(signupEntry).toContain('Choose your account type first');
    expect(signupEntry).toContain('/register?type=buyer');
    expect(signupEntry).toContain('/register?type=seller');
  });
});
