import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const signup = read('src/pages/pixel-perfect/Signup.tsx');
const signupEntry = read('src/pages/pixel-perfect/SignupEntry.tsx');
const googleButton = read('src/components/auth/GoogleRoleRegistrationButton.tsx');
const viteEnv = read('src/vite-env.d.ts');
const netlify = read('netlify.toml');

describe('role-first Google web registration contract', () => {
  it('requires Buyer or Seller choice on web before rendering the signup form', () => {
    expect(signup).toContain('requestedType !== "buyer" && requestedType !== "seller"');
    expect(signup).toContain('return <SignupEntry />');
    expect(signupEntry).toContain('/register?type=buyer');
    expect(signupEntry).toContain('/register?type=seller');
    expect(signupEntry).not.toContain('import Signup from "./Signup"');
  });

  it('keeps the role-first chooser and Google GIS out of Capacitor', () => {
    expect(signup).toContain('isCapacitorContext');
    expect(signup).toContain('if (!nativeContext && requestedType !== "buyer" && requestedType !== "seller")');
    expect(googleButton).toContain('isCapacitorContext');
    expect(googleButton).toContain('if (nativeContext || !clientId) return null');
  });

  it('binds Google registration to the selected role and verified server intent', () => {
    expect(signup).toContain('<GoogleRoleRegistrationButton');
    expect(signup).toContain('role={role}');
    expect(signup).toContain('sellerType={form.sellerType}');
    expect(googleButton).toContain("fetch('/.netlify/functions/register-social-intent'");
    expect(googleButton).toContain('requestedRole: role');
    expect(googleButton).toContain("role === 'seller' ? { sellerType } : {}");
  });

  it('uses a cryptographic nonce and Supabase signInWithIdToken after server verification', () => {
    expect(googleButton).toContain('crypto.getRandomValues');
    expect(googleButton).toMatch(/crypto\.subtle\.digest\(\s*['"]SHA-256['"]/);
    expect(googleButton).toContain('nonce: hashedNonce');
    expect(googleButton).toContain('supabase.auth.signInWithIdToken');
    expect(googleButton).toContain("provider: 'google'");
    expect(googleButton).toContain('nonce: rawNonce');
  });

  it('requires the public Google client id and minimum GIS CSP origins', () => {
    expect(viteEnv).toContain('VITE_GOOGLE_CLIENT_ID');
    expect(netlify).toMatch(/script-src[^\n]*https:\/\/accounts\.google\.com/);
    expect(netlify).toMatch(/connect-src[^\n]*https:\/\/accounts\.google\.com/);
    expect(netlify).toMatch(/frame-src[^\n]*https:\/\/accounts\.google\.com/);
  });

  it('keeps the Google render target empty so React and GSI do not own the same child nodes', () => {
    expect(googleButton).toContain('container.replaceChildren();');
    expect(googleButton).toContain('google.accounts.id.renderButton(container');
    expect(googleButton).toContain('aria-live="polite"');
    expect(googleButton).toMatch(/ref=\{containerRef\}[\s\S]{0,240}className=[^>]+\/>/);
    expect(googleButton).not.toMatch(/ref=\{containerRef\}[\s\S]{0,400}\{!ready\s*&&/);
  });

  it('keeps Facebook fresh signup outside this web registration implementation', () => {
    expect(googleButton).not.toContain("provider: 'facebook'");
    expect(signupEntry).not.toContain('Continue with Facebook');
  });
});
