import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('website commerce parity', () => {
  it('keeps buyer returns on the desktop workflow with eligibility and return tracking', () => {
    const source = read('src/pages/pixel-perfect/buyer/BuyerOrders.tsx');
    expect(source).toContain('/.netlify/functions/customer-return-eligibility');
    expect(source).toContain('buyerCarrier');
    expect(source).toContain('buyerTrackingNumber');
    expect(source).toContain('Save Tracking');
  });

  it('gives desktop sellers a dispute workspace backed by the canonical dispute action', () => {
    const routes = read('src/AppRoutes.tsx');
    const shell = read('src/pages/pixel-perfect/seller/SellerShell.tsx');
    const disputes = read('src/pages/pixel-perfect/seller/SellerDisputes.tsx');
    expect(routes).toContain('path="disputes" element={publicPage(<PPSellerDisputes />)}');
    expect(shell).toContain('to: "/seller/disputes"');
    expect(disputes).toContain('/.netlify/functions/dispute-action');
    expect(disputes).toContain('action: "respond"');
  });

  it('lets desktop buyers see seller responses and escalate through the protected backend', () => {
    const source = read('src/pages/pixel-perfect/buyer/BuyerDisputes.tsx');
    expect(source).toContain('sellerResponse');
    expect(source).toContain('/.netlify/functions/dispute-action');
    expect(source).toContain('action: "escalate"');
    expect(source).toContain('Escalate to Loadify');
  });

  it('keeps trusted admins able to enter their own Buyer Hub and return to Admin Hub', () => {
    const adminShell = read('src/pages/pixel-perfect/admin/AdminShell.tsx');
    const buyerShell = read('src/pages/pixel-perfect/buyer/BuyerShell.tsx');
    const roles = read('src/lib/roleUtils.ts');
    expect(adminShell).toContain('to="/buyer"');
    expect(adminShell).toContain('My Purchases');
    expect(buyerShell).toContain('to="/admin"');
    expect(buyerShell).toContain('Admin Hub');
    expect(roles).toContain('if (hasAdminAccess(user)) return true;');
  });

  it('shows the Loadify order number after Stripe checkout instead of a cs_live session id', () => {
    const success = read('src/pages/OrderSuccessPage.tsx');
    expect(success).toContain('/.netlify/functions/checkout-status');
    expect(success).toContain('Order number: {orderNumber}');
    expect(success).not.toContain('sessionId.slice(');
    expect(success).not.toContain('Ref: {sessionId');
  });
});
