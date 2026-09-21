import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('mobile account workspaces contract', () => {
  it('maps every Profile option to its intended destination', () => {
    const profile = read('src/pages/MobileProfilePage.tsx');
    const destinations = [
      ['Sell an item', '/sell'],
      ['Complete seller setup', '/onboarding'],
      ['Start selling', '/onboarding/role-selection'],
      ['Favourite items', '/profile/favourites'],
      ['Purchases', '/orders?mode=buy'],
      ['Delivery addresses', '/profile/addresses'],
      ['Returns & refunds', '/profile/returns'],
      ['Resolution Centre', '/profile/resolution'],
      ['Reviews', '/profile/reviews'],
      ['My listings', '/profile/listings'],
      ['Shipments', '/profile/shipments'],
      ['Store profile', '/profile/store'],
      ['Sales', '/orders?mode=sell'],
      ['Balance', '/profile/balance'],
      ['Seller payments', '/seller/mobile-payments'],
      ['Settings', '/profile/settings'],
      ['Security', '/profile/security'],
      ['Notifications', '/profile/notifications'],
      ['Help Centre', '/faq'],
    ] as const;
    for (const [label, destination] of destinations) {
      expect(profile).toContain(`label: '${label}'`);
      expect(profile).toContain(`to: '${destination}'`);
    }
  });

  it('protects every workspace with the correct role guard', () => {
    const routes = read('src/AppRoutes.tsx');
    expect(routes).toContain('path="profile/returns" element={<RequireBuyer>');
    expect(routes).toContain('path="profile/resolution" element={<RequireBuyer>');
    expect(routes).toContain('path="profile/reviews" element={<RequireBuyer>');
    expect(routes).toContain('path="profile/listings" element={<RequireSellerAny>');
    expect(routes).toContain('path="profile/shipments" element={<RequireSeller>');
    expect(routes).toContain('path="profile/store" element={<RequireSellerAny>');
    expect(routes).toContain('path="profile/balance" element={<RequireSeller>');
    expect(routes).toContain('path="profile/settings" element={<RequireAuth>');
    expect(routes).toContain('path="profile/buyer-profile" element={<RequireBuyer>');
    expect(routes).toContain('path="profile/buyer-settings" element={<RequireBuyer>');
    expect(routes).toContain('path="profile/seller-returns" element={<RequireSeller>');
    expect(routes).toContain('path="profile/seller-reviews" element={<RequireSeller>');
    expect(routes).toContain('path="profile/seller-settings" element={<RequireSeller>');
    expect(routes).toContain('path="profile/security" element={<RequireAuth>');
    expect(routes).toContain('path="profile/notifications" element={<RequireAuth>');
    expect(routes).toContain('path="profile/favourites" element={<RequireBuyer>');
    expect(routes).toContain('path="orders" element={<MobileOrdersRoute />}');
    expect(routes).toContain("isSellerMode ? <RequireSeller>{page}</RequireSeller> : <RequireBuyer>{page}</RequireBuyer>");
  });

  it('keeps listing lifecycle controls available to sellers', () => {
    const listings = read('src/pages/pixel-perfect/seller/SellerProducts.tsx');
    for (const action of ['Edit product', 'Mark as Sold', 'Restock & reactivate', 'Hide listing', 'Delete Listing']) expect(listings).toContain(action);
  });

  it('allows incomplete sellers to prepare drafts but blocks commercial workspace routes', () => {
    const sellerGuard = read('src/components/auth/RequireSeller.tsx');
    expect(sellerGuard).toContain('allowOnboardingCatalogue');
    expect(sellerGuard).toContain("fetchState === 'draft' || fetchState === 'submitted' || fetchState === 'active'");
    expect(sellerGuard).toContain("if (!onboardingComplete) return <Navigate to=\"/onboarding\" replace />");
  });

  it('blocks suspended sellers from catalogue and store management while retaining buyer access', () => {
    const profile = read('src/pages/MobileProfilePage.tsx');
    const sellerGuard = read('src/components/auth/RequireSeller.tsx');
    const roles = read('src/lib/roleUtils.ts');
    expect(profile).toContain("profile?.sellerStatus === 'suspended'");
    expect(profile).toContain('Your Buying workspace remains available while seller access is restricted.');
    expect(sellerGuard).toContain("if (fetchState === 'suspended')");
    expect(roles).toContain("return user?.role === 'buyer' || user?.role === 'seller'");
  });

  it('lets trusted admins access their own Buyer tools while keeping Seller isolated', () => {
    const roles = read('src/lib/roleUtils.ts');
    expect(roles).toContain('if (hasAdminAccess(user)) return true;');
    expect(roles).toContain('if (hasAdminAccess(user)) return false;');
  });

  it('provides a persistent Buying and Selling workspace switch for dual-capability accounts', () => {
    const profile = read('src/pages/MobileProfilePage.tsx');
    const workspace = read('src/lib/mobileWorkspace.ts');
    expect(workspace).toContain("export type MobileWorkspace = 'buying' | 'selling';");
    expect(workspace).toContain("export const MOBILE_WORKSPACE_KEY = 'loadify:mobile-workspace';");
    expect(profile).toContain('showWorkspaceSwitch');
    expect(profile).toContain('setMobileWorkspace(user, workspace)');
    expect(profile).toContain("workspace === 'selling' ? sellingItems : buyingItems");
    expect(profile).toContain("workspace === 'buying' ? 'Buying' : 'Selling'");
  });
  it('shows buyer marketplace actions to trusted admins for their own purchases', () => {
    const hero = read('src/components/MobileHeroBanner.tsx');
    expect(hero).toContain("import { hasBuyerAccess, hasSellerAccess } from '@/lib/roleUtils';");
    expect(hero).toContain('{user && hasBuyerAccess(user) ? (');
    expect(hero).toContain("navigate('/orders')");
    expect(hero).toContain('My orders');
  });
});
