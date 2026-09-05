/**
 * Netlify Edge Function: category-meta
 *
 * Keeps category landing metadata crawler-visible while failing closed on
 * indexability: faceted URLs, unknown categories and empty categories are not
 * eligible for indexing. No database mutation is performed here.
 */
import type { Config, Context } from '@netlify/edge-functions';
import { getCategorySeoLanding } from '../../src/lib/categorySeo.ts';

const BASE_URL = 'https://loadifymarket.co.uk';
const SITE_NAME = 'Loadify Market';
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/i;

interface CategoryRow {
  id?: string;
  name?: string;
  slug?: string;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceOrInsertMeta(html: string, name: string, value: string): string {
  const escapedValue = escapeAttr(value);
  const selector = new RegExp(`<meta name="${name}" content="[^"]*"\\s*\\/?>`);
  if (selector.test(html)) {
    return html.replace(selector, `<meta name="${name}" content="${escapedValue}" />`);
  }
  return html.replace('</head>', `  <meta name="${name}" content="${escapedValue}" />\n</head>`);
}

function replacePropertyMeta(html: string, property: string, value: string): string {
  const escapedValue = escapeAttr(value);
  const selector = new RegExp(`<meta property="${property}" content="[^"]*"\\s*\\/?>`);
  if (selector.test(html)) {
    return html.replace(selector, `<meta property="${property}" content="${escapedValue}" />`);
  }
  return html;
}

function replaceCanonical(html: string, canonical: string): string {
  const escapedCanonical = escapeAttr(canonical);
  if (/<link rel="canonical"/.test(html)) {
    return html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${escapedCanonical}" />`,
    );
  }
  return html.replace('</head>', `  <link rel="canonical" href="${escapedCanonical}" />\n</head>`);
}

async function fetchCategoryRows(
  slugs: readonly string[],
  supabaseUrl: string,
  anonKey: string,
): Promise<CategoryRow[]> {
  if (slugs.length === 0) return [];
  try {
    const encoded = slugs.map((slug) => encodeURIComponent(slug)).join(',');
    const url =
      `${supabaseUrl}/rest/v1/categories` +
      `?slug=in.(${encoded})` +
      `&isActive=eq.true` +
      `&select=id,name,slug`;
    const response = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return [];
    const rows: unknown = await response.json();
    return Array.isArray(rows) ? rows as CategoryRow[] : [];
  } catch {
    return [];
  }
}

async function hasLiveListings(
  categoryIds: string[],
  supabaseUrl: string,
  anonKey: string,
): Promise<boolean> {
  if (categoryIds.length === 0) return false;
  try {
    const ids = categoryIds.map((id) => encodeURIComponent(id)).join(',');
    const url =
      `${supabaseUrl}/rest/v1/products` +
      `?categoryId=in.(${ids})` +
      `&isActive=eq.true` +
      `&isApproved=eq.true` +
      `&listingStatus=eq.active` +
      `&type=neq.logistics` +
      `&or=(listingContext.eq.service,stockQuantity.gt.0)` +
      `&select=id` +
      `&limit=1`;
    const response = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const rows: unknown = await response.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export default async function categoryMeta(
  request: Request,
  context: Context,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const segments = requestUrl.pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== 'category') return context.next();

  const slug = segments[1];
  if (!SLUG_PATTERN.test(slug)) return context.next();

  const landing = getCategorySeoLanding(slug);
  const primaryDbSlug = landing?.dbSlugs[0];
  const lookupSlugs = primaryDbSlug ? [primaryDbSlug] : [slug];
  const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL');
  const anonKey = Netlify.env.get('VITE_SUPABASE_ANON_KEY');

  const [baseResponse, categoryRows] = await Promise.all([
    context.next(),
    supabaseUrl && anonKey
      ? fetchCategoryRows(lookupSlugs, supabaseUrl, anonKey)
      : Promise.resolve([]),
  ]);

  const contentType = baseResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return baseResponse;

  const isKnownLanding = Boolean(landing) || categoryRows.length > 0;
  if (!isKnownLanding) {
    const html = replaceOrInsertMeta(await baseResponse.text(), 'robots', 'noindex, follow');
    return new Response(html, {
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(baseResponse.headers),
    });
  }

  const categoryName = landing?.label ?? categoryRows[0]?.name?.trim() ?? slug.replace(/-/g, ' ');
  const title = landing?.title ?? `${categoryName} Products | ${SITE_NAME}`;
  const description = landing?.description ?? `Browse ${categoryName} products from approved marketplace sellers on ${SITE_NAME}.`;
  const canonical = `${BASE_URL}/category/${slug}`;
  const categoryIds = categoryRows.map((row) => row.id).filter((id): id is string => Boolean(id));
  const live = supabaseUrl && anonKey
    ? await hasLiveListings(categoryIds, supabaseUrl, anonKey)
    : false;
  const faceted = requestUrl.search.length > 0;
  const robots = live && !faceted ? 'index, follow' : 'noindex, follow';

  let html: string;
  try {
    html = await baseResponse.text();
  } catch {
    return baseResponse;
  }

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = replaceOrInsertMeta(html, 'description', description);
  html = replaceOrInsertMeta(html, 'robots', robots);
  html = replacePropertyMeta(html, 'og:title', title);
  html = replacePropertyMeta(html, 'og:description', description);
  html = replacePropertyMeta(html, 'og:url', canonical);
  html = replaceOrInsertMeta(html, 'twitter:title', title);
  html = replaceOrInsertMeta(html, 'twitter:description', description);
  html = replaceCanonical(html, canonical);

  return new Response(html, {
    status: baseResponse.status,
    statusText: baseResponse.statusText,
    headers: new Headers(baseResponse.headers),
  });
}

export const config: Config = {
  path: '/category/*',
};
