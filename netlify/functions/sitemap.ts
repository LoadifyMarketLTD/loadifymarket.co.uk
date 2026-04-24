/**
 * GET /.netlify/functions/sitemap   (reachable as /sitemap.xml via netlify.toml redirect)
 *
 * Returns a complete XML sitemap containing:
 *   1. All static pages (identical to the original public/sitemap.xml).
 *   2. Every active, approved product page — /product/:id.
 *
 * Products are fetched with the public anon key so only rows visible to
 * anonymous visitors (isActive=true AND isApproved=true) are included.
 *
 * The response is cached at the CDN edge for 1 hour (Cache-Control: public,
 * max-age=3600) to avoid hitting the database on every crawler request.
 *
 * When Supabase credentials are not configured, the function gracefully falls
 * back to static pages only, ensuring /sitemap.xml never returns an error.
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const BASE_URL = 'https://loadifymarket.co.uk';

// ── Static pages (mirrors public/sitemap.xml) ─────────────────────────────────
type StaticEntry = { loc: string; changefreq: string; priority: string };

const STATIC_PAGES: StaticEntry[] = [
  { loc: '/',                                       changefreq: 'daily',   priority: '1.0' },
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
  { loc: '/track-order',                            changefreq: 'monthly', priority: '0.5' },
  { loc: '/terms',                                  changefreq: 'yearly',  priority: '0.4' },
  { loc: '/privacy',                                changefreq: 'yearly',  priority: '0.4' },
  { loc: '/cookies',                                changefreq: 'yearly',  priority: '0.4' },
  { loc: '/returns-policy',                         changefreq: 'yearly',  priority: '0.4' },
  { loc: '/shipping-policy',                        changefreq: 'yearly',  priority: '0.4' },
  { loc: '/buyer-terms',                            changefreq: 'yearly',  priority: '0.4' },
  { loc: '/seller-terms',                           changefreq: 'yearly',  priority: '0.4' },
  { loc: '/seller-guidelines',                      changefreq: 'yearly',  priority: '0.4' },
  { loc: '/disclaimer',                             changefreq: 'yearly',  priority: '0.4' },
  { loc: '/acceptable-use-policy',                  changefreq: 'yearly',  priority: '0.4' },
];

function urlEntry(loc: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── Fetch product IDs from Supabase ──────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  let productIds: string[] = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // Fetch in a single paginated pass (Supabase default page size is 1 000;
      // use a high limit to capture all active products in one request).
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('isActive', true)
        .eq('isApproved', true)
        .limit(50000);

      if (!error && Array.isArray(data)) {
        productIds = (data as Array<{ id: string }>).map((row) => row.id);
      }
    } catch {
      // Non-fatal: fall through with static pages only.
    }
  }

  // ── Build XML ─────────────────────────────────────────────────────────────────
  const staticUrls = STATIC_PAGES.map((p) =>
    urlEntry(`${BASE_URL}${p.loc}`, p.changefreq, p.priority),
  );

  const productUrls = productIds.map((id) =>
    urlEntry(`${BASE_URL}/product/${id}`, 'weekly', '0.6'),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '',
    '  <!-- ── Static pages ──────────────────────────────────────────────────── -->',
    ...staticUrls,
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
      // Cache at the CDN edge for 1 hour; background revalidation allowed.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
    },
    body: xml,
  };
};
