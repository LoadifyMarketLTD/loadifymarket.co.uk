/**
 * GET /.netlify/functions/product-feed   (reachable as /product-feed.xml via netlify.toml redirect)
 *
 * Returns a Google Merchant Center / Meta (Facebook & Instagram) compatible
 * physical-product catalog feed in RSS 2.0 XML format. The same feed URL can be
 * submitted to Meta Commerce Manager, TikTok for Business and Google Merchant
 * Center.
 *
 * Product brand and identifiers are emitted only when the listing supplies
 * evidence-backed values. Loadify Market is the marketplace, not the product
 * manufacturer, and must never be substituted as a product brand.
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { getProductIdentifiers, merchantCondition } from '../../src/lib/productSeo';

const BASE_URL = 'https://loadifymarket.co.uk';
const MARKETPLACE_NAME = 'Loadify Market';
const PAGE_SIZE = 500;

interface ProductRow {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  images: string[];
  specifications?: Record<string, unknown> | null;
  categoryName?: string;
}

function unavailableFeed(reason: string): ReturnType<Handler> {
  console.error(`product-feed: ${reason}`);
  return {
    statusCode: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: 'Product feed temporarily unavailable',
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function excerpt(text: string, max = 5000): string {
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function toAbsoluteUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('//')) return `https:${v}`;
  if (v.startsWith('/')) return `${BASE_URL}${v}`;
  return `${BASE_URL}/${v}`;
}

function isMerchantEligible(product: ProductRow): boolean {
  return Boolean(
    product.id.trim() &&
    product.title.trim() &&
    Number.isFinite(product.price) &&
    product.price > 0 &&
    product.images.some((image) => Boolean(toAbsoluteUrl(image))),
  );
}

function buildItem(product: ProductRow): string {
  const link = `${BASE_URL}/product/${product.id}`;
  const title = escapeXml(product.title.trim());
  const desc = escapeXml(excerpt(product.description || product.title));
  const price = `${Number(product.price).toFixed(2)} GBP`;
  const condition = merchantCondition(product.condition);
  const identifiers = getProductIdentifiers(product.specifications);
  const productType = product.categoryName?.replace(/\s+/g, ' ').trim();
  const imageLink = toAbsoluteUrl(product.images[0]);
  const additionalImages = product.images
    .slice(1, 10)
    .map(toAbsoluteUrl)
    .filter((u): u is string => Boolean(u));

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
    '      <g:availability>in stock</g:availability>',
    `      <g:price>${escapeXml(price)}</g:price>`,
    `      <g:condition>${condition}</g:condition>`,
  );

  if (identifiers.brand) {
    lines.push(`      <g:brand>${escapeXml(identifiers.brand)}</g:brand>`);
  }
  if (identifiers.gtin) {
    lines.push(`      <g:gtin>${escapeXml(identifiers.gtin)}</g:gtin>`);
  }
  if (identifiers.mpn) {
    lines.push(`      <g:mpn>${escapeXml(identifiers.mpn)}</g:mpn>`);
  }

  // Google product category is an override, not a required marketplace mapping.
  // We do not guess it from a broad Loadify category. Instead we send our own
  // category as product_type and let Google perform its normal categorisation.
  if (productType) {
    lines.push(`      <g:product_type>${escapeXml(productType)}</g:product_type>`);
  }

  lines.push('    </item>');
  return lines.join('\n');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const rawPage = parseInt((event.queryStringParameters?.page ?? '1'), 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return unavailableFeed('Supabase public configuration is missing');
  }

  let products: ProductRow[] = [];

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Merchant feeds are for public, approved, active physical products only.
    // Services are intentionally excluded even though the marketplace can sell
    // them through its normal application flows.
    const { data, error } = await supabase
      .from('products')
      .select(`
          id,
          title,
          description,
          price,
          condition,
          images,
          specifications,
          category:categories!categoryId ( name )
        `)
      .eq('isActive', true)
      .eq('isApproved', true)
      .eq('listingStatus', 'active')
      .eq('listingContext', 'product')
      .gt('stockQuantity', 0)
      .gt('price', 0)
      .range(offset, offset + PAGE_SIZE - 1)
      .order('id');

    if (error) {
      return unavailableFeed(`Supabase product query failed (${error.code ?? 'unknown'})`);
    }

    if (!Array.isArray(data)) {
      return unavailableFeed('Supabase product query returned an invalid payload');
    }

    products = (data as Array<Record<string, unknown>>)
      .map((row) => {
        const category = row.category as { name?: string } | null;
        const specifications = row.specifications;
        return {
          id: String(row.id ?? ''),
          title: String(row.title ?? ''),
          description: String(row.description ?? ''),
          price: Number(row.price ?? 0),
          condition: String(row.condition ?? 'new'),
          images: Array.isArray(row.images)
            ? (row.images as unknown[]).filter((image): image is string => typeof image === 'string')
            : [],
          specifications:
            specifications && typeof specifications === 'object' && !Array.isArray(specifications)
              ? (specifications as Record<string, unknown>)
              : null,
          categoryName: category?.name,
        } satisfies ProductRow;
      })
      .filter(isMerchantEligible);
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'unknown';
    return unavailableFeed(`unexpected Supabase failure (${reason})`);
  }

  const feedUrl = `${BASE_URL}/product-feed.xml`;
  const nowIso = new Date().toUTCString();
  const itemsXml = products.map(buildItem).join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${escapeXml(MARKETPLACE_NAME)} Product Catalog</title>`,
    `    <link>${escapeXml(BASE_URL)}</link>`,
    `    <description>Product catalog feed for ${escapeXml(MARKETPLACE_NAME)} — compatible with Meta (Facebook &amp; Instagram) Commerce Manager, TikTok for Business, and Google Merchant Center.</description>`,
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
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
    body: xml,
  };
};
