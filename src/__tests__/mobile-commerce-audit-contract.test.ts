import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('mobile commerce and branding audit contract', () => {
  it('uses the official master vector and avoids fragile mojibake-prone glyph literals', () => {
    const sell = source('src/pages/MobileSellWizard.tsx');
    const orders = source('src/pages/MobileOrdersPage.tsx');
    expect(sell).toContain("@/assets/branding/loadify-market-master-blackgold.svg");
    expect(sell).not.toContain('🎉');
    expect(orders).toContain('\\u00A3');
    expect(orders).toContain('\\u2022');
  });

  it('installs and configures native status-bar contrast control', () => {
    const pkg = JSON.parse(source('package.json')) as { dependencies?: Record<string, string> };
    const config = source('capacitor.config.ts');
    expect(pkg.dependencies?.['@capacitor/status-bar']).toBeTruthy();
    expect(config).toContain("style: 'LIGHT'");
    expect(config).toContain('overlaysWebView: false');
  });

  it('keeps cancellation requests separate from payment mutation', () => {
    const endpoint = source('netlify/functions/request-order-cancellation.ts');
    const migration = source('supabase/681_buyer_order_cancellation_requests.sql');
    expect(endpoint).toContain("authenticateActiveCapability(event, admin, 'buyer')");
    expect(endpoint).toContain("order.status !== 'paid'");
    expect(endpoint).not.toContain('stripe.refunds');
    expect(endpoint).not.toContain(".from('orders').update");
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE');
    expect(migration).toContain("WHERE status = 'requested'");
  });

  it('exposes the same cancellation boundary on mobile, desktop and policy pages', () => {
    expect(source('src/pages/MobileOrdersPage.tsx')).toContain('/.netlify/functions/request-order-cancellation');
    expect(source('src/pages/pixel-perfect/buyer/BuyerOrders.tsx')).toContain('/.netlify/functions/request-order-cancellation');
    expect(source('src/pages/pixel-perfect/ReturnsPolicy.tsx')).toContain('A request is not confirmation');
    expect(source('src/pages/pixel-perfect/BuyerTerms.tsx')).toContain('Submission does not itself cancel');
  });

  it('uses the shared legal typography system on every public policy surface', () => {
    const pages = [
      'src/pages/pixel-perfect/TermsAndConditions.tsx',
      'src/pages/pixel-perfect/PrivacyPolicyWeb.tsx',
      'src/pages/pixel-perfect/CookiePolicy.tsx',
      'src/pages/pixel-perfect/Disclaimer.tsx',
      'src/pages/pixel-perfect/ReturnsPolicy.tsx',
      'src/pages/pixel-perfect/ShippingPolicy.tsx',
      'src/pages/pixel-perfect/BuyerTerms.tsx',
      'src/pages/pixel-perfect/SellerTerms.tsx',
      'src/pages/legal/AcceptableUsePolicyPage.tsx',
      'src/pages/legal/ProhibitedItemsPolicyPage.tsx',
      'src/pages/legal/SellerVerificationPolicyPage.tsx',
      'src/pages/legal/IntellectualPropertyComplaintsPage.tsx',
    ];
    for (const page of pages) expect(source(page)).toContain('legal-content');
    expect(source('src/index.css')).toContain('.legal-content > h2');
  });
});
