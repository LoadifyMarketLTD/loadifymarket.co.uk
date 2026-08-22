import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('Stage 7 cross-platform auth/security contract', () => {
  it('fails closed when authoritative platform-user hydration is unavailable', () => {
    const app = source('src/App.tsx');

    expect(app).not.toContain(
      'function userFromSession(',
    );

    expect(app).not.toContain(
      'setUser(userFromSession(',
    );
    expect(app).not.toContain(
      'falling back to auth session',
    );

    expect(app).toContain(
      "signOut({ scope: 'local' })",
    );

    expect(app).toContain(
      'setUser(null)',
    );
  });

  it('delegates dashboard Seller readiness to canonical route guards', () => {
    const app = source('src/App.tsx');

    expect(app).toContain(
      'if (hasSellerAccess(user))',
    );

    expect(app).toContain(
      'if (hasBuyerAccess(user))',
    );

    expect(app).not.toContain(
      'user.onboardingCompleted === false',
    );
  });

  it('accepts only trusted native deep-link origins', () => {
    const app = source('src/App.tsx');

    expect(app).toContain(
      "parsed.protocol === 'loadifymarket:'",
    );

    expect(app).toContain(
      "parsed.hostname === 'app'",
    );

    expect(app).toContain(
      "parsed.protocol === 'https:'",
    );

    expect(app).toContain(
      "parsed.hostname === 'loadifymarket.co.uk'",
    );

    expect(app).toContain(
      'Ignored untrusted URL origin',
    );
  });

  it('uses the native callback for both Google and Facebook inside the APK', () => {
    const login = source(
      'src/pages/pixel-perfect/Login.tsx',
    );

    expect(login).toContain(
      'const NATIVE_OAUTH_CALLBACK = "loadifymarket://app/auth/callback";',
    );

    const nativeCallbackUses =
      login.match(/redirectTo: NATIVE_OAUTH_CALLBACK/g) ?? [];

    expect(nativeCallbackUses).toHaveLength(2);

    expect(login).toContain(
      'skipBrowserRedirect: true',
    );
  });

  it('recovers password-reset sessions explicitly from app-link credentials', () => {
    const reset = source(
      'src/pages/pixel-perfect/ResetPassword.tsx',
    );

    expect(reset).toContain(
      'exchangeCodeForSession(authCode)',
    );

    expect(reset).toContain(
      'supabase.auth.setSession',
    );

    expect(reset).toContain(
      "recoveryType === 'recovery'",
    );

    expect(reset).toContain(
      "window.history.replaceState",
    );
  });

  it('blocks explicitly inactive accounts at every protected UI boundary', () => {
    const guardedFiles = [
      'src/components/auth/RequireAuth.tsx',
      'src/components/auth/RequireBuyer.tsx',
      'src/components/auth/RequireAdmin.tsx',
      'src/components/auth/RequireSellerAny.tsx',
      'src/components/auth/RequireSeller.tsx',
    ];

    for (const path of guardedFiles) {
      expect(source(path)).toContain(
        'user.isActive !== true',
      );
    }
  });

  it('keeps Android OAuth/App-Link identity configuration aligned', () => {
    const manifest = source(
      'android/app/src/main/AndroidManifest.xml',
    );

    const assetLinks = source(
      'public/.well-known/assetlinks.json',
    );

    const capacitor = source(
      'capacitor.config.ts',
    );

    expect(manifest).toContain(
      'android:scheme="loadifymarket"',
    );

    expect(manifest).toContain(
      'android:host="app"',
    );

    expect(manifest).toContain(
      'android:pathPrefix="/auth/callback"',
    );

    expect(manifest).toContain(
      'android:host="loadifymarket.co.uk"',
    );

    expect(assetLinks).toContain(
      '"package_name": "co.uk.loadifymarket.app"',
    );

    expect(capacitor).toContain(
      "appId: 'co.uk.loadifymarket.app'",
    );

    expect(capacitor).toContain(
      'cleartext: false',
    );
  });

  it('preserves Stage 3-5 canonical Seller flow while hardening cross-platform auth', () => {
    const onboarding = source(
      'src/pages/onboarding/SellerOnboarding.tsx',
    );

    const connect = source(
      'netlify/functions/connect-onboard.ts',
    );

    expect(onboarding).toContain(
      'to="/seller/products/new"',
    );

    expect(connect).toContain(
      'return_url: `${appUrl}/onboarding?connect=success`',
    );

    expect(connect).toContain(
      'refresh_url: `${appUrl}/onboarding?connect=refresh`',
    );
  });
});