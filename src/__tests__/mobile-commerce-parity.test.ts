import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const profile = read('src/pages/MobileProfilePage.tsx');
const balance = read('src/pages/MobileBalancePage.tsx');
const payments = read('src/pages/MobileSellerPaymentsPage.tsx');
const sellerDashboard = read('src/pages/pixel-perfect/seller/SellerDashboard.tsx');
const connectStatus = read('netlify/functions/connect-status.ts');

describe('mobile profile commerce routing parity', () => {
  it('separates seller sales from buyer purchases and isolates admin', () => {
    expect(profile).toContain('hasAdminAccess(user)');
    expect(profile).toContain('hasSellerAccess(user)');
    expect(profile).toContain('hasBuyerAccess(user)');
    expect(profile).toContain("{ label: 'Sales orders', to: '/seller/orders' }");
    expect(profile).toContain("to: '/orders'");
    expect(profile).toContain("{ label: 'Admin dashboard', to: '/admin' }");
    expect(profile).not.toContain("user.role === 'seller' || user.role === 'admin'");
  });
});

describe('mobile seller balance parity', () => {
  it('reads the same canonical seller_balance projection as Seller Dashboard', () => {
    expect(balance).toContain(".from('seller_balance')");
    expect(balance).toContain(".select('availableAmount, totalEarned')");
    expect(balance).toContain(".eq('sellerId', user.id)");
    expect(balance).not.toContain(".from('seller_profiles')");

    expect(sellerDashboard).toContain('.from("seller_balance")');
    expect(sellerDashboard).toContain('.select("availableAmount, totalEarned")');
  });
});

describe('mobile seller payment readiness parity', () => {
  it('refreshes the authoritative Stripe Connect status instead of inventing readiness', () => {
    expect(payments).toContain("authorizedFetch('/.netlify/functions/connect-status'");
    expect(payments).toContain('chargesEnabled');
    expect(payments).toContain('payoutsEnabled');
    expect(payments).toContain('taxEvidenceReady');
    expect(payments).toContain('Checkout still verifies the current seller tax declaration and listing evidence');
    expect(payments).toContain('Your listing can still be visible in the marketplace');

    expect(connectStatus).toContain('stripeConnectStatus');
    expect(connectStatus).toContain('taxEvidenceReady');
    expect(connectStatus).toContain("taxEvidenceReason: 'persist_failed'");
    expect(connectStatus).toContain("taxEvidenceReason: 'readback_failed'");
  });
});
