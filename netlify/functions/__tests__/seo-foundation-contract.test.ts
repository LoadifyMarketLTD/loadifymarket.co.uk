import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STATIC_PAGES } from '../sitemap';
import { buildSeoTitle } from '../../../src/components/SEO';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const PUBLIC_MARKETING_ROUTES = [
  '/',
  '/marketplace',
  '/platform',
  '/buyers',
  '/sellers',
  '/business',
  '/trade',
  '/suppliers',
  '/technology',
  '/integrations',
  '/partners',
  '/developers',
  '/how-it-works',
  '/trust',
  '/catalog',
  '/deals',
  '/about',
  '/contact',
  '/wholesale-info',
] as const;

const PUBLIC_POLICY_ROUTES = [
  '/terms',
  '/privacy',
  '/cookies',
  '/returns-policy',
  '/shipping-policy',
  '/buyer-terms',
  '/seller-terms',
  '/seller-guidelines',
  '/seller-verification-policy',
  '/prohibited-items-policy',
  '/ip-trademark-complaints',
  '/disclaimer',
  '/acceptable-use-policy',
] as const;

describe('SEO foundation contract', () => {
  it('keeps indexable public routes in the dynamic sitemap', () => {
    const sitemapPaths = new Set(STATIC_PAGES.map((entry) => entry.loc));
    for (const path of [...PUBLIC_MARKETING_ROUTES, ...PUBLIC_POLICY_ROUTES]) {
      expect(sitemapPaths.has(path), `missing dynamic sitemap route: ${path}`).toBe(true);
    }
  });

  it('keeps the static sitemap fallback aligned with the dynamic public route set', () => {
    const staticSitemap = read('public/sitemap.xml');
    for (const { loc } of STATIC_PAGES) {
      expect(staticSitemap).toContain(`<loc>https://loadifymarket.co.uk${loc}</loc>`);
    }
  });

  it('does not place private application routes into the sitemap', () => {
    const sitemapPaths = new Set(STATIC_PAGES.map((entry) => entry.loc));
    const privatePaths = ['/admin', '/buyer', '/seller', '/checkout', '/cart', '/login', '/register', '/inbox'];
    for (const path of privatePaths) {
      expect(sitemapPaths.has(path), `private route leaked into sitemap: ${path}`).toBe(false);
    }
  });

  it('allows public seller profiles while keeping reserved seller workspace routes blocked', () => {
    const robots = read('public/robots.txt');
    expect(robots).toContain('Disallow: /seller\n');
    expect(robots).toContain('Allow: /seller/');
    expect(robots).toContain('Disallow: /seller/products');
    expect(robots).toContain('Disallow: /seller/orders');
    expect(robots).toContain('Disallow: /seller/settings');
  });

  it('blocks transactional and authenticated app surfaces from crawl', () => {
    const robots = read('public/robots.txt');
    for (const path of ['/admin', '/buyer', '/inbox', '/orders', '/profile', '/checkout', '/login', '/register', '/auth/']) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
  });

  it('adds the site suffix exactly once', () => {
    expect(buildSeoTitle('Catalog')).toBe('Catalog | Loadify Market');
    expect(buildSeoTitle('Catalog | Loadify Market')).toBe('Catalog | Loadify Market');
    expect(buildSeoTitle('Loadify Market | Marketplace, Commerce & Business Platform'))
      .toBe('Loadify Market | Marketplace, Commerce & Business Platform');
  });
});
