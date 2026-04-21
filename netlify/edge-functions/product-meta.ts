/**
 * Netlify Edge Function: product-meta
 *
 * Intercepts every GET request for /product/:id and injects product-specific
 * Open Graph / Twitter Card / canonical meta tags into the HTML before the
 * response is returned to the browser or social-media crawler.
 *
 * WHY THIS IS NEEDED
 * ------------------
 * The app is a pure Single-Page Application.  public/_redirects forwards all
 * unknown paths to /index.html, so every URL — including /product/:id — serves
 * the same generic index.html shell.  Crawlers (Facebook, WhatsApp, Slack,
 * LinkedIn, Twitterbot …) do NOT execute JavaScript, so react-helmet-async
 * meta-tag updates in ProductDetail.tsx are invisible to them.  This edge
 * function runs at Netlify's CDN edge (Deno runtime) before the HTML reaches
 * any client and patches the meta tags with real product data fetched directly
 * from the Supabase REST API.
 *
 * EXECUTION ORDER (netlify.toml)
 * ------------------------------
 * product-meta is declared BEFORE security-headers.  For a /product/:id
 * request the chain is therefore:
 *
 *   request → product-meta → context.next()
 *                             → security-headers → context.next() → CDN (index.html)
 *                             ← security-headers adds HTTP security headers
 *           ← product-meta injects product meta tags into the HTML body
 *   response → client / crawler
 *
 * REQUIRED ENVIRONMENT VARIABLES (set in Netlify dashboard)
 * ----------------------------------------------------------
 *   VITE_SUPABASE_URL      — already set for the SPA build
 *   VITE_SUPABASE_ANON_KEY — already set for the SPA build
 *
 * @see https://docs.netlify.com/edge-functions/overview/
 */
import type { Config, Context } from '@netlify/edge-functions';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = 'https://loadifymarket.co.uk';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;
const SITE_NAME = 'Loadify Market';

// UUID v4 pattern — product IDs are Postgres uuid_generate_v4() values.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ProductRow {
  title?: string;
  description?: string;
  images?: unknown;
}

/** Truncate to `max` characters, appending an ellipsis if shortened. */
function excerpt(text: string, max = 180): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

/** Escape characters that are unsafe inside an HTML attribute value. */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Ensure a URL is absolute; relative paths are resolved against BASE_URL. */
function toAbsoluteUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('//')) return `https:${v}`;
  if (v.startsWith('/')) return `${BASE_URL}${v}`;
  return `${BASE_URL}/${v}`;
}

/**
 * Fetch minimal product fields from Supabase REST API using the anon key.
 * The `isActive = true AND isApproved = true` condition mirrors the RLS
 * policy for anonymous reads so the query returns the same rows a public
 * visitor would see.
 * Returns null on any error or if no matching product exists.
 */
async function fetchProductData(
  productId: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<ProductRow | null> {
  try {
    const url =
      `${supabaseUrl}/rest/v1/products` +
      `?id=eq.${encodeURIComponent(productId)}` +
      `&isActive=eq.true` +
      `&isApproved=eq.true` +
      `&select=title,description,images` +
      `&limit=1`;

    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      // 2 s hard timeout — fall through to generic HTML if Supabase is slow.
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return null;

    const rows: unknown = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    return rows[0] as ProductRow;
  } catch {
    return null;
  }
}

// ── Edge Function ─────────────────────────────────────────────────────────────

export default async function productMeta(
  request: Request,
  context: Context,
): Promise<Response> {
  const url = new URL(request.url);

  // Only handle /product/:id where :id is a valid UUID.
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== 'product') {
    return context.next();
  }
  const productId = segments[1];
  if (!UUID_PATTERN.test(productId)) {
    return context.next();
  }

  // Read credentials from the environment (available to edge functions).
  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

  // Fetch the base HTML response and the product data in parallel for speed.
  const [baseResponse, product] = await Promise.all([
    context.next(),
    supabaseUrl && supabaseAnonKey
      ? fetchProductData(productId, supabaseUrl, supabaseAnonKey)
      : Promise.resolve(null),
  ]);

  // Only process HTML responses.
  const contentType = baseResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return baseResponse;

  // If we could not fetch the product, serve the unmodified HTML.
  if (!product || !product.title?.trim()) return baseResponse;

  // ── Build SEO values ───────────────────────────────────────────────────────

  const title = product.title.trim();
  const rawDesc = (product.description ?? '').replace(/\s+/g, ' ').trim();
  const seoDesc = rawDesc
    ? excerpt(rawDesc, 180)
    : `${title} — available on ${SITE_NAME}`;

  const images: string[] = Array.isArray(product.images)
    ? (product.images as unknown[]).filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      )
    : [];
  const ogImage = toAbsoluteUrl(images[0]) ?? DEFAULT_OG_IMAGE;

  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = `${BASE_URL}/product/${productId}`;

  // Escaped values safe for insertion into HTML attribute values.
  const t = escapeAttr(fullTitle);
  const d = escapeAttr(seoDesc);
  const img = escapeAttr(ogImage);
  const u = escapeAttr(canonicalUrl);

  // ── Read and patch the HTML ────────────────────────────────────────────────

  let html: string;
  try {
    html = await baseResponse.text();
  } catch {
    // Body already consumed or stream error — return original response object.
    return baseResponse;
  }

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`);

  // Replace meta name="description"
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${d}"`,
  );

  // Replace Open Graph tags that are already present in index.html.
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${t}"`,
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${d}"`,
  );
  html = html.replace(
    /<meta property="og:image" content="[^"]*"/,
    `<meta property="og:image" content="${img}"`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${u}"`,
  );
  html = html.replace(
    /<meta property="og:type" content="[^"]*"/,
    `<meta property="og:type" content="product"`,
  );

  // Replace or add canonical link.
  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${u}" />`,
    );
  }

  // Build the block of tags that are NOT present in the static index.html:
  //   - Twitter Card tags (react-helmet-async adds these client-side only)
  //   - og:image:alt (accessibility + Facebook recommendation)
  //   - canonical (if not already present)
  const extraLines: string[] = [];

  if (!html.includes('name="twitter:card"')) {
    extraLines.push(`  <meta name="twitter:card" content="summary_large_image" />`);
    extraLines.push(`  <meta name="twitter:title" content="${t}" />`);
    extraLines.push(`  <meta name="twitter:description" content="${d}" />`);
    extraLines.push(`  <meta name="twitter:image" content="${img}" />`);
  }

  if (!html.includes('property="og:image:alt"')) {
    extraLines.push(`  <meta property="og:image:alt" content="${escapeAttr(title)}" />`);
  }

  if (!/<link rel="canonical"/.test(html)) {
    extraLines.push(`  <link rel="canonical" href="${u}" />`);
  }

  if (extraLines.length > 0) {
    html = html.replace('</head>', `${extraLines.join('\n')}\n</head>`);
  }

  // Return the patched HTML with the original response headers preserved.
  const headers = new Headers(baseResponse.headers);
  return new Response(html, {
    status: baseResponse.status,
    statusText: baseResponse.statusText,
    headers,
  });
}

export const config: Config = {
  // Run on every /product/* request so ALL product URLs get product-specific
  // meta tags, including those triggered by social crawlers.
  path: '/product/*',
};
