/**
 * GET /.netlify/functions/product-feed   (reachable as /product-feed.xml via netlify.toml redirect)
 *
 * Returns a Google Merchant Center / Meta (Facebook & Instagram) compatible
 * product catalog feed in RSS 2.0 XML format.  The same feed URL can be
 * submitted to:
 *   • Meta Commerce Manager  → Catalog → Data Sources → Scheduled Feed
 *   • TikTok for Business    → Product Catalog → Add Products → URL Feed
 *   • Google Merchant Center → Products → Feeds → File Upload (via URL)
 *
 * PAGINATION
 * ----------
 * Social platforms impose limits on feed file size.  Use the `page` query
 * parameter (1-based) to fetch successive pages:
 *
 *   /product-feed.xml          → page 1 (default)
 *   /product-feed.xml?page=2   → page 2
 *   /product-feed.xml?page=N   → page N
 *
 * Each page contains at most PAGE_SIZE items (default 500).
 *
 * FIELDS
 * ------
 * Required by Meta / Google:
 *   id, title, description, availability, condition, price, link, image_link
 *   brand, google_product_category
 *
 * ENVIRONMENT VARIABLES
 * ---------------------
 *   VITE_SUPABASE_URL      — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY — Supabase anonymous key (public)
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = 'https://loadifymarket.co.uk';
const BRAND = 'Loadify Market';
const PAGE_SIZE = 500;

/**
 * Map Loadify Market category slugs → Google Product Category taxonomy IDs.
 * https://support.google.com/merchants/answer/6324436
 * Meta accepts the same taxonomy IDs.
 */
const CATEGORY_MAP: Record<string, string> = {
  'electronics':              'Electronics',
  'electrical':               'Electronics',
  'home-garden':              'Home & Garden',
  'homeware':                 'Home & Garden > Kitchen & Dining',
  'kitchenware':              'Home & Garden > Kitchen & Dining',
  'garden':                   'Home & Garden > Lawn & Garden',
  'diy':                      'Hardware',
  'cleaning':                 'Health & Beauty > Personal Care',
  'health-beauty':            'Health & Beauty',
  'clothing-fashion':         'Apparel & Accessories > Clothing',
  'wholesale-clothing':       'Apparel & Accessories > Clothing',
  'toys':                     'Toys & Games',
  'toys-games':               'Toys & Games',
  'baby-supplies':            'Baby & Toddler',
  'sports-fitness':           'Sporting Goods',
  'leisure-hobbies':          'Sporting Goods',
  'automotive':               'Vehicles & Parts > Vehicle Parts & Accessories',
  'pets':                     'Animals & Pet Supplies',
  'pet-supplies':             'Animals & Pet Supplies',
  'food-drink':               'Food, Beverages & Tobacco > Food Items',
  'office-business':          'Office Supplies',
  'stationery':               'Office Supplies',
  'party-gift':               'Arts & Entertainment > Party & Celebration',
  'seasonal':                 'Arts & Entertainment > Party & Celebration',
  'wholesale-pound-lines':    'Business & Industrial',
  'large-letter-items':       'Business & Industrial',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  images: string[];
  categorySlug?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape characters that are unsafe inside XML text / attribute values. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Truncate to max characters, appending an ellipsis if shortened. */
function excerpt(text: string, max = 5000): string {
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/** Ensure a URL is absolute. */
function toAbsoluteUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('//')) return `https:${v}`;
  if (v.startsWith('/')) return `${BASE_URL}${v}`;
  return `${BASE_URL}/${v}`;
}

/** Build a single <item> element for one product. */
function buildItem(product: ProductRow): string {
  const link = `${BASE_URL}/product/${product.id}`;
  const title = escapeXml(product.title.trim());
  const desc = escapeXml(excerpt(product.description || product.title));
  const price = `${Number(product.price).toFixed(2)} GBP`;
  const condition =
    product.condition === 'used'
      ? 'used'
      : product.condition === 'refurbished'
        ? 'refurbished'
        : 'new';
  const imageLink = toAbsoluteUrl(
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null,
  );
  const additionalImages = Array.isArray(product.images)
    ? product.images
        .slice(1, 10)
        .map(toAbsoluteUrl)
        .filter((u): u is string => Boolean(u))
    : [];

  const googleCategory =
    CATEGORY_MAP[product.categorySlug ?? ''] ?? 'Business & Industrial';

  const lines: string[] = [
    '    <item>',
    `      <g:id>${escapeXml(product.id)}</g:id>`,
    `      <g:title>${title}</g:title>`,
    `      <g:description>${desc}</g:description>`,
    `      <g:link>${escapeXml(link)}</g:link>`,
  ];

  if (imageLink) {
    lines.push(`      <g:image_link>${escapeXml(imageLink)}</g:image_link>`);
  }
  for (const img of additionalImages) {
    lines.push(`      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`);
  }

  lines.push(
    `      <g:availability>in stock</g:availability>`,
    `      <g:price>${escapeXml(price)}</g:price>`,
    `      <g:condition>${condition}</g:condition>`,
    `      <g:brand>${escapeXml(BRAND)}</g:brand>`,
    `      <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>`,
    '    </item>',
  );

  return lines.join('\n');
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse pagination parameter — default to page 1.
  const rawPage = parseInt((event.queryStringParameters?.page ?? '1'), 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  let products: ProductRow[] = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Match the same sellability rules enforced by checkout. Reserved/sold
      // listings are excluded, and physical products must have positive stock.
      // Services are allowed with stockQuantity=0 because stock does not apply.
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          price,
          condition,
          images,
          categories ( slug )
        `)
        .eq('isActive', true)
        .eq('isApproved', true)
        .eq('listingStatus', 'active')
        .or('listingContext.eq.service,stockQuantity.gt.0')
        .range(offset, offset + PAGE_SIZE - 1)
        .order('id');

      if (!error && Array.isArray(data)) {
        products = (data as Array<Record<string, unknown>>).map((row) => {
          const cat = row.categories as { slug?: string } | null;
          return {
            id: String(row.id ?? ''),
            title: String(row.title ?? ''),
            description: String(row.description ?? ''),
            price: Number(row.price ?? 0),
            condition: String(row.condition ?? 'new'),
            images: Array.isArray(row.images) ? (row.images as string[]) : [],
            categorySlug: cat?.slug,
          };
        });
      }
    } catch {
      // Non-fatal: return empty feed rather than error.
    }
  }

  // ── Build XML ─────────────────────────────────────────────────────────────

  const feedUrl = `${BASE_URL}/product-feed.xml`;
  const nowIso = new Date().toUTCString();

  const itemsXml = products.map(buildItem).join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${escapeXml(BRAND)} Product Catalog</title>`,
    `    <link>${escapeXml(BASE_URL)}</link>`,
    `    <description>Product catalog feed for ${escapeXml(BRAND)} — compatible with Meta (Facebook &amp; Instagram) Commerce Manager, TikTok for Business, and Google Merchant Center.</description>`,
    `    <lastBuildDate>${nowIso}</lastBuildDate>`,
    `    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" rel="self" href="${escapeXml(feedUrl)}" type="application/rss+xml"/>`,
    itemsXml,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Cache at the CDN edge for 1 hour; background revalidation allowed.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
      // Allow social platform crawlers to read the feed cross-origin.
      'Access-Control-Allow-Origin': '*',
    },
    body: xml,
  };
};
