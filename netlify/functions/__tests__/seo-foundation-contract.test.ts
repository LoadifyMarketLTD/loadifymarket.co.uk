import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STATIC_PAGES } from '../sitemap';
import { buildSeoTitle } from '../../../src/lib/seo';

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

const PUBLIC_META_ROUTES = [
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
] as const;

const CANONICAL_REDIRECTS = [
  ['/categories/*', '/category/:splat'],
  ['/clearance', '/deals'],
  ['/returns', '/returns-policy'],
  ['/shipping', '/shipping-policy'],
  ['/help', '/faq'],
  ['/track', '/track-order'],
  ['/shop', '/catalog'],
  ['/products', '/catalog'],
  ['/blog', '/deals'],
  ['/intellectual-property-complaints', '/ip-trademark-complaints'],
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

  it('discovers active database categories and public seller storefronts without making them mandatory', () => {
    const sitemapSource = read('netlify/functions/sitemap.ts');
    expect(sitemapSource).toContain(".from('categories')");
    expect(sitemapSource).toContain(".from('seller_stores')");
    expect(sitemapSource).toContain(".from('seller_profiles_public')");
    expect(sitemapSource).toContain(".eq('isActive', true)");
    expect(sitemapSource).toContain('publicSellerIds');
    expect(sitemapSource).toContain('/seller/${encodeURIComponent(slug)}');
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

  it('uses crawler-visible 301 redirects for canonical public aliases before the SPA fallback', () => {
    const redirects = read('public/_redirects');
    const lines = redirects.split('\n');
    const spaFallbackLine = lines.findIndex((line) => line.trim().startsWith('/*') && line.includes('/index.html'));
    expect(spaFallbackLine).toBeGreaterThan(-1);

    for (const [from, to] of CANONICAL_REDIRECTS) {
      const redirectLine = lines.findIndex((line) => {
        const fields = line.trim().split(/\s+/);
        return fields[0] === from && fields[1] === to && fields[2] === '301!';
      });
      expect(redirectLine, `missing canonical redirect: ${from} -> ${to}`).toBeGreaterThan(-1);
      expect(redirectLine, `redirect must precede SPA fallback: ${from}`).toBeLessThan(spaFallbackLine);
    }
  });

  it('uses the real public seller name in server-rendered Product structured data', () => {
    const productMeta = read('netlify/edge-functions/product-meta.ts');
    expect(productMeta).toContain("seller_profiles_public");
    expect(productMeta).toContain('fetchPublicSellerName');
    expect(productMeta).toContain('name: sellerName');
    expect(productMeta).not.toContain('name: SITE_NAME');
  });

  it('serves canonical route metadata to non-JavaScript crawlers only on approved public routes', () => {
    const publicMeta = read('netlify/edge-functions/public-meta.ts');
    for (const path of PUBLIC_META_ROUTES) {
      expect(publicMeta, `missing public metadata route: ${path}`).toContain(`'${path}':`);
    }
    expect(publicMeta).toContain('`${BASE_URL}${pathname}`');
    expect(publicMeta).toContain('name="description"');
    expect(publicMeta).toContain('property="og:title"');
    expect(publicMeta).toContain('name="twitter:title"');
    expect(publicMeta).toContain('path: Object.keys(PAGE_META)');
    expect(publicMeta).not.toContain("'/admin':");
    expect(publicMeta).not.toContain("'/checkout':");
    expect(publicMeta).not.toContain("'/product/':");
  });

  it('adds the site suffix exactly once', () => {
    expect(buildSeoTitle('Catalog')).toBe('Catalog | Loadify Market');
    expect(buildSeoTitle('Catalog | Loadify Market')).toBe('Catalog | Loadify Market');
    expect(buildSeoTitle('Loadify Market | Marketplace, Commerce & Business Platform'))
      .toBe('Loadify Market | Marketplace, Commerce & Business Platform');
  });
});
