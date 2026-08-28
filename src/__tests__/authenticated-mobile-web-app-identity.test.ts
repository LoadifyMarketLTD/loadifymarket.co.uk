import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const identityGate = read('src/components/MobileWebIdentityClass.tsx');
const identityCss = read('src/authenticated-mobile-web.css');
const home = read('src/pages/Home.tsx');
const mobileHome = read('src/pages/AuthenticatedMobileWebHome.tsx');
const mobileSellGate = read('src/components/MobileSellGate.tsx');
const main = read('src/main.tsx');

describe('authenticated mobile website app identity', () => {
  it('activates only for authenticated browser-mobile and excludes every Capacitor context', () => {
    expect(identityGate).toContain('Boolean(user)');
    expect(identityGate).toContain('isMobile');
    expect(identityGate).toContain('!isNativeContext');
    expect(identityGate).toContain('isCapacitorContext');
    expect(identityGate).toContain("mobile-web-app-identity");
  });

  it('keeps the identity CSS fully scoped away from native and desktop', () => {
    expect(identityCss).toContain('@media (max-width: 767px)');
    expect(identityCss).toContain('html.mobile-web-app-identity');
    expect(identityCss).not.toContain('html.capacitor-native');
  });

  it('switches only authenticated non-Capacitor mobile Home to the app-like feed', () => {
    expect(home).toContain('AuthenticatedMobileWebHome');
    expect(home).toContain('isMobile && Boolean(user) && !isCapacitorContext()');
    expect(home).toContain('useAuthenticatedMobileWeb ? <AuthenticatedMobileWebHome /> : <MobileHome />');
  });

  it('matches the protected installed-app Home structure without copying corporate website sections', () => {
    expect(mobileHome).toContain('Search for items or members');
    expect(mobileHome).toContain('0% commission until 31 December 2026');
    expect(mobileHome).toContain('Sell on Loadify Market');
    expect(mobileHome).toContain("gridTemplateColumns: '1fr 1fr'");
    expect(mobileHome).toContain('MobileCategoryShortcuts');
    expect(mobileHome).toContain('MobileGridCard');
    expect(mobileHome).not.toContain('Loadify Intelligence');
    expect(mobileHome).not.toContain('<Footer');
  });

  it('does not replace the protected /sell APK flow with the desktop product editor', () => {
    expect(mobileSellGate).toContain('{children}');
    expect(mobileSellGate).not.toContain('<Navigate to="/seller/products/new"');
  });

  it('mounts the browser-only identity gate at the application root', () => {
    expect(main).toContain('MobileWebIdentityClass');
    expect(main).toContain('<MobileWebIdentityClass />');
  });
});
