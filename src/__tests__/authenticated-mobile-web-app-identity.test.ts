import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const identityGate = read('src/components/MobileWebIdentityClass.tsx');
const identityCss = read('src/authenticated-mobile-web.css');
const home = read('src/pages/Home.tsx');
const shell = read('src/pages/AuthenticatedMobileWebHome.tsx');
const appHeader = read('src/mobile-web-clone/AppHeader.tsx');
const appGridCard = read('src/mobile-web-clone/AppGridCard.tsx');
const appBottomNav = read('src/mobile-web-clone/AppBottomNav.tsx');
const categories = read('src/mobile-web-clone/CategoriesPage.tsx');
const inbox = read('src/mobile-web-clone/InboxPage.tsx');
const profile = read('src/mobile-web-clone/ProfilePage.tsx');
const mobileSellGate = read('src/components/MobileSellGate.tsx');

describe('authenticated mobile website app visual clone', () => {
  it('activates only for authenticated browser-mobile and excludes every Capacitor context', () => {
    expect(identityGate).toContain('Boolean(user)');
    expect(identityGate).toContain('isMobile');
    expect(identityGate).toContain('!isNativeContext');
    expect(identityGate).toContain('isCapacitorContext');
    expect(home).toContain('isMobile && Boolean(user) && !isCapacitorContext()');
  });

  it('restores the original app semantic palette only inside authenticated non-native mobile web', () => {
    expect(identityCss).toContain('@media (max-width: 767px)');
    expect(identityCss).toContain('html.market-light-root.mobile-web-app-identity');
    expect(identityCss).toContain('.market-workspace-light');
    expect(identityCss).toContain('.market-public-light');
    expect(identityCss).toContain('--background: 225 44% 7%');
    expect(identityCss).toContain('background: #07080B !important');
    expect(identityCss).not.toContain('html.capacitor-native');
  });

  it('suppresses the legacy MainLayout bottom bar whenever the cloned app bar is mounted', () => {
    expect(identityCss).toContain('body:has(nav[aria-label="Mobile web app navigation"])');
    expect(identityCss).toContain('nav[aria-label="Main navigation"]');
    expect(identityCss).toContain('display: none !important');
  });

  it('clones the installed app Home visual primitives into browser-only components', () => {
    expect(appHeader).toContain('Search for items or members');
    expect(appGridCard).toContain("color: '#FFFFFF'");
    expect(appGridCard).toContain("aspectRatio: '1 / 1'");
    expect(appBottomNav).toContain('Home');
    expect(appBottomNav).toContain('Search');
    expect(appBottomNav).toContain('Sell');
    expect(appBottomNav).toContain('Inbox');
    expect(appBottomNav).toContain('Profile');
    expect(shell).toContain("gridTemplateColumns: '1fr 1fr'");
    expect(shell).not.toContain('Loadify Intelligence');
    expect(shell).not.toContain('<Footer');
  });

  it('keeps Home Search Inbox and Profile inside the browser-only cloned shell', () => {
    expect(shell).toContain("view === 'search'");
    expect(shell).toContain("view === 'inbox'");
    expect(shell).toContain("view === 'profile'");
    expect(categories).toContain("background: '#07080B'");
    expect(inbox).toContain("background: '#07080B'");
    expect(profile).toContain("background: '#07080B'");
  });

  it('does not replace or redirect the protected /sell APK flow', () => {
    expect(mobileSellGate).toContain('{children}');
    expect(mobileSellGate).not.toContain('<Navigate to="/seller/products/new"');
    expect(shell).not.toContain('MobileSellWizard');
  });
});
