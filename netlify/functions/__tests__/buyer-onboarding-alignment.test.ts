import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('Stage 4 Buyer onboarding alignment contract', () => {
  it('keeps ordinary Buyer signup minimal and verify-first', () => {
    const signup = source('src/pages/pixel-perfect/Signup.tsx');

    expect(signup).toContain('role: "buyer" | "seller"');
    expect(signup).toContain('/login?registered=1');
    expect(signup).not.toContain('companyName: ""');
    expect(signup).not.toContain('vatNumber: ""');
    expect(signup).not.toContain('businessAddress:');
  });

  it('keeps Trade Account as an optional Buyer path but still requires email confirmation', () => {
    const trade = source('src/pages/pixel-perfect/TradeAccount.tsx');

    expect(trade).toContain('role: "buyer" as const');
    expect(trade).toContain('navigate("/login?registered=1"');
    expect(trade).toContain(
      'Check your email to confirm your address, then sign in to Buyer Space.',
    );

    expect(trade).not.toContain('Over 10,000 Product Lines');
    expect(trade).not.toContain('Over 500 Businesses');
    expect(trade).not.toContain(
      'You can now sign in and start browsing products across the marketplace.',
    );
  });

  it('does not promise Buyer pricing or reverse-charge treatment from profile fields alone', () => {
    const profile = source(
      'src/pages/pixel-perfect/buyer/BuyerProfile.tsx',
    );

    expect(profile).not.toContain('access B2B pricing');
    expect(profile).not.toContain('ex-VAT pricing');
    expect(profile).not.toContain(
      'reverse-charge invoices automatically',
    );
    expect(profile).toContain(
      'do not automatically change marketplace prices or tax treatment',
    );
  });

  it('keeps Buyer Space capability-based and Admin-isolated', () => {
    const guard = source('src/components/auth/RequireBuyer.tsx');

    expect(guard).toContain('hasBuyerAccess(user)');
    expect(guard).toContain('hasAdminAccess(user)');
    expect(guard).toContain('<Navigate to="/admin" replace />');
  });

  it('keeps Buyer Space behind verified-email enforcement', () => {
    const app = source('src/App.tsx');

    expect(app).toContain('<RequireBuyer>');
    expect(app).toContain('<RequireEmailVerified>');
    expect(app).toContain('<PPBuyerShell />');
  });
});