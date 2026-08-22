import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('Stage 5 workspace destination and readiness contract', () => {
  it('uses canonical seller readiness in the Seller Workspace dashboard', () => {
    const checklist = source(
      'src/components/OnboardingChecklist.tsx',
    );

    expect(checklist).toContain(
      '/.netlify/functions/seller-onboarding-status',
    );

    expect(checklist).toContain(
      'readiness.stripeReady',
    );

    expect(checklist).toContain(
      'readiness.setupComplete',
    );

    expect(checklist).not.toContain(
      'hasServiceCapability',
    );

    expect(checklist).not.toContain(
      'productShared',
    );

    expect(checklist).not.toContain(
      'Share a product',
    );
  });

  it('routes Stripe returns into the single canonical onboarding surface', () => {
    const connect = source(
      'netlify/functions/connect-onboard.ts',
    );

    const bridge = source(
      'src/pages/pixel-perfect/seller/SellerSetupPage.tsx',
    );

    const onboarding = source(
      'src/pages/onboarding/SellerOnboarding.tsx',
    );

    expect(connect).toContain(
      'refresh_url: `${appUrl}/onboarding?connect=refresh`',
    );

    expect(connect).toContain(
      'return_url: `${appUrl}/onboarding?connect=success`',
    );

    expect(connect).not.toContain(
      '/seller/setup?connect=',
    );

    expect(bridge).toContain(
      '/onboarding${location.search}',
    );

    expect(onboarding).toContain(
      'useSearchParams',
    );

    expect(onboarding).toContain(
      '/.netlify/functions/connect-status',
    );

    expect(onboarding).toContain(
      '/.netlify/functions/seller-onboarding-status',
    );
  });

  it('keeps incomplete sellers outside the full Seller Workspace', () => {
    const guard = source(
      'src/components/auth/RequireSeller.tsx',
    );

    expect(guard).toContain(
      'hasCanonicalOnboardingTruth',
    );

    expect(guard).toContain(
      'if (!onboardingComplete) return <Navigate to="/onboarding" replace />;',
    );

    expect(guard).toContain(
      'isOnboardingCatalogueRoute',
    );
  });

  it('uses the shared seller-access boundary for onboarding/profile routes', () => {
    const guard = source(
      'src/components/auth/RequireSellerAny.tsx',
    );

    const onboarding = source(
      'src/pages/onboarding/SellerOnboarding.tsx',
    );

    expect(guard).toContain(
      'hasSellerAccess(user)',
    );

    expect(onboarding).toContain(
      'hasSellerAccess(user)',
    );
  });

  it('provides explicit Buyer Space and Seller Workspace switching', () => {
    const sellerShell = source(
      'src/pages/pixel-perfect/seller/SellerShell.tsx',
    );

    const buyerShell = source(
      'src/pages/pixel-perfect/buyer/BuyerShell.tsx',
    );

    expect(sellerShell).toContain(
      'to="/buyer"',
    );

    expect(sellerShell).toContain(
      'Buyer Space',
    );

    expect(buyerShell).toContain(
      'hasSellerAccess(user)',
    );

    expect(buyerShell).toContain(
      'sellerCapable &&',
    );

    expect(buyerShell).toContain(
      'to="/seller"',
    );

    expect(buyerShell).toContain(
      'Seller Workspace',
    );
  });

  it('keeps Admin isolated from ordinary commerce workspaces', () => {
    const buyerGuard = source(
      'src/components/auth/RequireBuyer.tsx',
    );

    const sellerGuard = source(
      'src/components/auth/RequireSeller.tsx',
    );

    expect(buyerGuard).toContain(
      'hasAdminAccess(user)',
    );

    expect(buyerGuard).toContain(
      '<Navigate to="/admin" replace />',
    );

    expect(sellerGuard).toContain(
      'hasAdminAccess(user)',
    );
  });

  it('does not introduce a Supplier Partner workspace into Buyer or Seller shells', () => {
    const sellerShell = source(
      'src/pages/pixel-perfect/seller/SellerShell.tsx',
    );

    const buyerShell = source(
      'src/pages/pixel-perfect/buyer/BuyerShell.tsx',
    );

    expect(sellerShell).not.toContain(
      'Supplier Partner',
    );

    expect(buyerShell).not.toContain(
      'Supplier Partner',
    );
  });
});