/**
 * GET /.netlify/functions/sitemap   (reachable as /sitemap.xml via netlify.toml redirect)
 *
 * Returns a complete XML sitemap containing:
 *   1. All indexable static/public pages.
 *   2. Active database-backed category pages.
 *   3. Public active seller storefronts.
 *   4. Every currently sellable, approved product page — /product/:id.
 *
 * Dynamic rows are fetched with the public anon key. Failures are non-fatal:
 * /sitemap.xml always falls back to the static route set.
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const BASE_URL = 'https://loadifymarket.co.uk';

type StaticEntry = { loc: string; changefreq: string; priority: string };

export const STATIC_PAGES: StaticEntry[] = [
  { loc: '/',                                       changefreq: 'daily',   priority: '1.0' },
  { loc: '/marketplace',                            changefreq: 'daily',   priority: '0.9' },
  { loc: '/platform',                               changefreq: 'weekly',  priority: '0.8' },
  { loc: '/buyers',                                 changefreq: 'weekly',  priority: '0.8' },
  { loc: '/sellers',                                changefreq: 'weekly',  priority: '0.8' },
  { loc: '/business',                               changefreq: 'weekly',  priority: '0.8' },
  { loc: '/trade',                                  changefreq: 'weekly',  priority: '0.8' },
  { loc: '/suppliers',                              changefreq: 'weekly',  priority: '0.8' },
  { loc: '/technology',                             changefreq: 'monthly', priority: '0.7' },
  { loc: '/integrations',                           changefreq: 'monthly', priority: '0.7' },
  { loc: '/partners',                               changefreq: 'monthly', priority: '0.7' },
  { loc: '/developers',                             changefreq: 'monthly', priority: '0.6' },
  { loc: '/how-it-works',                           changefreq: 'monthly', priority: '0.7' },
  { loc: '/trust',                                  changefreq: 'monthly', priority: '0.7' },
  { loc: '/catalog',                                changefreq: 'daily',   priority: '0.9' },
  { loc: '/category/large-letter-items',            changefreq: 'weekly',  priority: '0.8' },
  { loc: '/category/garden',                        changefreq: 'weekly',  priority: '0.8' },
  { loc: '/category/diy',                           changefreq: 'weekly',  priority: '0.8' },
  { loc: '/category/cleaning',                      changefreq: 'weekly',  priority: '0.8' },
  { loc: '/category/party-gift',                    changefreq: 'weekly',  priority: '0.8' },
  { loc: '/category/wholesale-pound-lines',         changefreq: 'weekly',  priority: '0.8' },
  { loc: '/category/toys',                          changefreq: 'weekly',  priority: '0.8' },
  { loc: '/category/leisure-hobbies',               changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/baby-supplies',                 changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/kitchenware',                   changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/health-beauty',                 changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/homeware',                      changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/electrical',                    changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/pet-supplies',                  changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/stationery',                    changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/seasonal',                      changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/wholesale-clothing',            changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/electronics',                   changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/home-garden',                   changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/clothing-fashion',              changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/toys-games',                    changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/sports-fitness',                changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/automotive',                    changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/pets',                          changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/food-drink',                    changefreq: 'weekly',  priority: '0.7' },
  { loc: '/category/office-business',               changefreq: 'weekly',  priority: '0.7' },
  { loc: '/deals',                                  changefreq: 'daily',   priority: '0.8' },
  { loc: '/faq',                                    changefreq: 'monthly', priority: '0.6' },
  { loc: '/contact',                                changefreq: 'monthly', priority: '0.6' },
  { loc: '/about',                                  changefreq: 'monthly', priority: '0.5' },
  { loc: '/wholesale-info',                         changefreq: 'monthly', priority: '0.6' },
  { loc: '/track-order',                            changefreq: 'monthly', priority: '0.5' },
  { loc: '/terms',                                  changefreq: 'yearly',  priority: '0.4' },
  { loc: '/privacy',                                changefreq: 'yearly',  priority: '0.4' },
  { loc: '/cookies',                                changefreq: 'yearly',  priority: '0.4' },
  { loc: '/returns-policy',                         changefreq: 'yearly',  priority: '0.4' },
  { loc: '/shipping-policy',                        changefreq: 'yearly',  priority: '0.4' },
  { loc: '/buyer-terms',                            changefreq: 'yearly',  priority: '0.4' },
  { loc: '/seller-terms',                           changefreq: 'yearly',  priority: '0.4' },
  { loc: '/seller-guidelines',                      changefreq: 'yearly',  priority: '0.4' },
  { loc: '/seller-verification-policy',             changefreq: 'yearly',  priority: '0.4' },
  { loc: '/prohibited-items-policy',                changefreq: 'yearly',  priority: '0.4' },
  { loc: '/ip-trademark-complaints',                changefreq: 'yearly',  priority: '0.4' },
  { loc: '/disclaimer',                             changefreq: 'yearly',  priority: '0.4' },
  { loc: '/acceptable-use-policy',                  changefreq: 'yearly',  priority: '0.4' },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  let productIds: string[] = [];
  let categorySlugs: string[] = [];
  let sellerSlugs: string[] = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const [productsResult, categoriesResult, storesResult, profilesResult] = await Promise.all([
        supabase
          .from('products')
          .select('id')
          .eq('isActive', true)
          .eq('isApproved', true)
          .eq('listingStatus', 'active')
          .or('listingContext.eq.service,stockQuantity.gt.0')
          .limit(50000),
        supabase
          .from('categories')
          .select('slug')
          .eq('isActive', true)
          .limit(50000),
        supabase
          .from('seller_stores')
          .select('storeSlug,userId')
          .eq('isActive', true)
          .limit(50000),
        supabase
          .from('seller_profiles_public')
          .select('userId')
          .limit(50000),
      ]);

      if (!productsResult.error && Array.isArray(productsResult.data)) {
        productIds = uniqueStrings(
          (productsResult.data as Array<{ id?: string }>).map((row) => row.id ?? ''),
        );
      }

      if (!categoriesResult.error && Array.isArray(categoriesResult.data)) {
        categorySlugs = uniqueStrings(
          (categoriesResult.data as Array<{ slug?: string }>).map((row) => row.slug?.trim() ?? ''),
        );
      }

      if (
        !storesResult.error
        && !profilesResult.error
        && Array.isArray(storesResult.data)
        && Array.isArray(profilesResult.data)
      ) {
        const publicSellerIds = new Set(
          (profilesResult.data as Array<{ userId?: string }>).map((row) => row.userId).filter(Boolean),
        );
        sellerSlugs = uniqueStrings(
          (storesResult.data as Array<{ storeSlug?: string; userId?: string }>)
            .filter((row) => row.userId && publicSellerIds.has(row.userId))
            .map((row) => row.storeSlug?.trim() ?? ''),
        );
      }
    } catch {
      // Non-fatal: fall through with whichever discovery data was available.
    }
  }

  const staticPathSet = new Set(STATIC_PAGES.map((page) => page.loc));
  const staticUrls = STATIC_PAGES.map((p) =>
    urlEntry(`${BASE_URL}${p.loc}`, p.changefreq, p.priority),
  );

  const dynamicCategoryUrls = categorySlugs
    .map((slug) => `/category/${encodeURIComponent(slug)}`)
    .filter((path) => !staticPathSet.has(path))
    .map((path) => urlEntry(`${BASE_URL}${path}`, 'weekly', '0.7'));

  const sellerUrls = sellerSlugs.map((slug) =>
    urlEntry(`${BASE_URL}/seller/${encodeURIComponent(slug)}`, 'weekly', '0.6'),
  );

  const productUrls = productIds.map((id) =>
    urlEntry(`${BASE_URL}/product/${encodeURIComponent(id)}`, 'weekly', '0.6'),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '',
    '  <!-- ── Static pages ──────────────────────────────────────────────────── -->',
    ...staticUrls,
    '',
    '  <!-- ── Active database-backed categories ─────────────────────────────── -->',
    ...dynamicCategoryUrls,
    '',
    '  <!-- ── Public seller storefronts ─────────────────────────────────────── -->',
    ...sellerUrls,
    '',
    '  <!-- ── Product pages ─────────────────────────────────────────────────── -->',
    ...productUrls,
    '',
    '</urlset>',
  ].join('\n');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
    },
    body: xml,
  };
};
