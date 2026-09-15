import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

const app = read('src/App.tsx');
const pushHook = read('src/hooks/usePushTokenRegistration.ts');
const notifications = read('src/pages/MobileNotificationsPage.tsx');
const createProduct = read('netlify/functions/create-product.ts');
const sellWizard = read('src/pages/MobileSellWizard.tsx');
const mobileOrders = read('src/pages/MobileOrdersPage.tsx');
const adminDisputes = read('src/pages/pixel-perfect/admin/AdminDisputes.tsx');
const createRefund = read('netlify/functions/create-refund.ts');
const disputeAction = read('netlify/functions/dispute-action.ts');
const returnTrackingMigration = read('supabase/migrations/20260914182000_complete_buyer_return_tracking.sql');
const disputeEscalationMigration = read('supabase/migrations/20260914184500_complete_dispute_response_escalation.sql');

describe('mobile release regression contract', () => {
  it('hydrates authentication immediately and only once', () => {
    expect(app).toContain('startAuth();');
    expect(app).not.toContain("location.pathname === '/' ?");
    expect(app).not.toContain('setTimeout(startAuth');
  });

  it('requests push permission only from an explicit user action', () => {
    expect(pushHook).toContain('export async function enableNativePushNotifications');
    expect(pushHook).toContain("return '/profile/notifications'");
    expect(pushHook).toContain("addListener('pushNotificationReceived'");
    expect(pushHook).toContain("addListener('pushNotificationActionPerformed'");
    expect(notifications).toContain('Enable notifications');
    expect(notifications).toContain('Open app settings');
  });

  it('keeps unpublished sellers in a safe draft flow', () => {
    expect(createProduct).toContain("code: 'SELLER_PAYMENT_SETUP_REQUIRED'");
    expect(sellWizard).toContain("data.code === 'SELLER_PAYMENT_SETUP_REQUIRED'");
    expect(sellWizard).toContain("'Manage listings'");
    expect(sellWizard).not.toContain("'Set up payments'");
  });

  it('records buyer return tracking and completes returns only after a confirmed refund', () => {
    expect(mobileOrders).toContain('saveReturnTracking');
    expect(returnTrackingMigration).toContain('returns_buyer_tracking_update');
    expect(createRefund).toContain("status: 'completed'");
    expect(createRefund).toContain('refundAmount: refund.amount / 100');
  });

  it('supports seller dispute responses and buyer escalation through protected RPCs', () => {
    expect(disputeEscalationMigration).toContain('FUNCTION public.respond_to_dispute');
    expect(disputeEscalationMigration).toContain('FUNCTION public.escalate_dispute');
    expect(disputeEscalationMigration).toContain('TO authenticated');
    expect(disputeEscalationMigration).toContain('FROM PUBLIC, anon');
    expect(mobileOrders).toContain("/.netlify/functions/dispute-action");
    expect(disputeAction).toContain("caller.rpc('respond_to_dispute'");
    expect(disputeAction).toContain("caller.rpc('escalate_dispute'");
    expect(disputeAction).toContain('sendPushToUser(admin, targetId');
    expect(adminDisputes).toContain('sellerResponse');
    expect(adminDisputes).toContain('escalatedAt');
  });

  it('does not expose the unsafe partial-refund action', () => {
    expect(adminDisputes).not.toContain('value="partial_refund"');
  });

  it('contains no known mojibake markers in user-facing source', () => {
    const roots = ['src', 'netlify/functions'];
    const files = roots.flatMap((root) => fs.readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(ts|tsx|html)$/.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name))
      .filter((file) => !file.endsWith('mobile-release-regression-contract.test.ts')));
    const forbidden = [/\uFFFD/u, /Â£/u, /â€¢/u, /ðŸ/u];
    const failures = files.filter((file) => forbidden.some((pattern) => pattern.test(fs.readFileSync(file, 'utf8'))));
    expect(failures).toEqual([]);
  });
});