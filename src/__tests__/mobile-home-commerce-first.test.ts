import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const home = read('src/pages/Home.tsx');
const bottomNav = read('src/components/MobileBottomNav.tsx');

const mobileHome = home.slice(
  home.indexOf('function MobileHome()'),
  home.indexOf('function DesktopHome()'),
);

describe('mobile home commerce-first contract', () => {
  it('keeps one continuous marketplace feed instead of desktop marketing blocks', () => {
    expect(mobileHome).toContain('<MobileAppHeader />');
    expect(mobileHome).toContain('Current marketplace listings');
    expect(mobileHome).toContain('<MobileProductGrid products={products} />');
    expect(mobileHome).not.toContain('<MobileHeroBanner');
    expect(mobileHome).not.toContain('<SellerCTA');
    expect(mobileHome).not.toContain('<FeaturesGrid');
    expect(mobileHome).not.toContain('<SecurityTrust');
    expect(mobileHome).not.toContain('<Footer');
  });

  it('does not duplicate the first product batch between hero and feed', () => {
    expect(mobileHome).not.toContain('leadProducts');
    expect(mobileHome).not.toContain('remainingProducts');
    expect(mobileHome).toContain('products.length > 0');
  });
});

describe('mobile bottom navigation contrast', () => {
  it('uses explicit readable inactive colours instead of unsupported opacity utilities', () => {
    expect(bottomNav).toContain("const INACTIVE_ICON = '#C3CCDA'");
    expect(bottomNav).toContain("const INACTIVE_LABEL = '#AEB9C9'");
    expect(bottomNav).not.toContain('text-white/58');
    expect(bottomNav).not.toContain('text-white/52');
  });
});
