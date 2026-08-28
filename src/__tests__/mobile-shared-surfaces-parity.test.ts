import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const favourites = read('src/pages/MobileFavouritesPage.tsx');
const wishlist = read('src/pages/pixel-perfect/buyer/BuyerWishlist.tsx');
const settings = read('src/pages/MobileSettingsPage.tsx');

describe('mobile favourites parity', () => {
  it('keeps readable inactive wishlist products visible as unavailable instead of filtering them out', () => {
    expect(favourites).toContain(".select('id, title, price, images, isActive')");
    expect(favourites).not.toContain(".eq('isActive', true)");
    expect(favourites).toContain('UNAVAILABLE');
    expect(favourites).toContain('removeFavourite');

    expect(wishlist).toContain('isActive');
    expect(wishlist).toContain('UNAVAILABLE');
  });
});

describe('mobile settings workspace isolation', () => {
  it('does not send administrators into buyer or seller settings by default', () => {
    expect(settings).toContain('hasAdminAccess(user)');
    expect(settings).toContain("{ label: 'Admin settings', to: '/admin/settings' }");
    expect(settings).toContain("{ label: 'Admin notifications', to: '/admin/notifications' }");
  });

  it('keeps seller and buyer destinations explicit', () => {
    expect(settings).toContain('hasSellerAccess(user)');
    expect(settings).toContain("{ label: 'Seller settings', to: '/seller/settings' }");
    expect(settings).toContain("{ label: 'Payments & payouts', to: '/seller/mobile-payments' }");
    expect(settings).toContain("{ label: 'Account settings', to: '/buyer/settings' }");
    expect(settings).toContain("{ label: 'Payments', to: '/buyer/payments' }");
  });
});
