/**
 * Netlify Edge Function: product-meta
 *
 * Injects product-specific Open Graph / Twitter / canonical / JSON-LD metadata
 * into the SPA HTML before it reaches crawlers that do not execute JavaScript.
 */
import type { Config, Context } from '@netlify/edge-functions';

const BASE_URL = 'https://loadifymarket.co.uk';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;
const SITE_NAME = 'Loadify Market';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/i;

interface ProductRow {
  id?: string;
  title?: string;
  description?: string;
  images?: unknown;
  price?: number;
  listingStatus?: string | null;
  listingContext?: string | null;
  stockQuantity?: number | null;
}

function excerpt(text: string, max = 180): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function isAvailable(product: ProductRow): boolean {
  if (product.listingStatus !== 'active') return false;
  if (product.listingContext === 'service') return true;
  return Number(product.stockQuantity ?? 0) > 0;
}

async function fetchProductData(
  productRef: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<ProductRow | null> {
  try {
    const filterColumn = UUID_PATTERN.test(productRef) ? 'id' : 'slug';
    const url =
      `${supabaseUrl}/rest/v1/products` +
      `?${filterColumn}=eq.${encodeURIComponent(productRef)}` +
      `&isActive=eq.true` +
      `&isApproved=eq.true` +
      `&select=id,title,description,images,price,listingStatus,listingContext,stockQuantity` +
      `&limit=1`;

    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
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

export default async function productMeta(
  request: Request,
  context: Context,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const segments = requestUrl.pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== 'product') {
    return context.next();
  }

  const productRef = segments[1];
  if (!UUID_PATTERN.test(productRef) && !SLUG_PATTERN.test(productRef)) {
    return context.next();
  }

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

  const [baseResponse, product] = await Promise.all([
    context.next(),
    supabaseUrl && supabaseAnonKey
      ? fetchProductData(productRef, supabaseUrl, supabaseAnonKey)
      : Promise.resolve(null),
  ]);

  const contentType = baseResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return baseResponse;
  if (!product || !product.id || !product.title?.trim()) return baseResponse;

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
  const canonicalUrl = `${BASE_URL}/product/${product.id}`;
  const priceNum = typeof product.price === 'number' ? product.price : undefined;
  const priceStr = priceNum !== undefined ? priceNum.toFixed(2) : undefined;
  const schemaAvailability = isAvailable(product)
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const t = escapeAttr(fullTitle);
  const d = escapeAttr(seoDesc);
  const img = escapeAttr(ogImage);
  const u = escapeAttr(canonicalUrl);

  let html: string;
  try {
    html = await baseResponse.text();
  } catch {
    return baseResponse;
  }

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${d}"`,
  );
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

  if (html.includes('property="og:image:secure_url"')) {
    html = html.replace(
      /<meta property="og:image:secure_url" content="[^"]*"/,
      `<meta property="og:image:secure_url" content="${img}"`,
    );
  }

  if (html.includes('name="twitter:title"')) {
    html = html.replace(
      /<meta name="twitter:title" content="[^"]*"/,
      `<meta name="twitter:title" content="${t}"`,
    );
  }
  if (html.includes('name="twitter:description"')) {
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*"/,
      `<meta name="twitter:description" content="${d}"`,
    );
  }
  if (html.includes('name="twitter:image"')) {
    html = html.replace(
      /<meta name="twitter:image" content="[^"]*"/,
      `<meta name="twitter:image" content="${img}"`,
    );
  }

  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${u}" />`,
    );
  }

  const extraLines: string[] = [];

  if (!html.includes('name="twitter:card"')) {
    extraLines.push(`  <meta name="twitter:card" content="summary_large_image" />`);
    extraLines.push(`  <meta name="twitter:title" content="${t}" />`);
    extraLines.push(`  <meta name="twitter:description" content="${d}" />`);
    extraLines.push(`  <meta name="twitter:image" content="${img}" />`);
  }

  if (!html.includes('property="og:image:secure_url"')) {
    extraLines.push(`  <meta property="og:image:secure_url" content="${img}" />`);
  }

  if (html.includes('property="og:image:alt"')) {
    html = html.replace(
      /<meta property="og:image:alt" content="[^"]*"/,
      `<meta property="og:image:alt" content="${escapeAttr(title)}"`,
    );
  } else {
    extraLines.push(`  <meta property="og:image:alt" content="${escapeAttr(title)}" />`);
  }

  if (priceStr) {
    if (!html.includes('property="og:price:amount"')) {
      extraLines.push(`  <meta property="og:price:amount" content="${escapeAttr(priceStr)}" />`);
      extraLines.push(`  <meta property="og:price:currency" content="GBP" />`);
    }
    if (!html.includes('property="product:price:amount"')) {
      extraLines.push(`  <meta property="product:price:amount" content="${escapeAttr(priceStr)}" />`);
      extraLines.push(`  <meta property="product:price:currency" content="GBP" />`);
    }
  }

  if (!/<link rel="canonical"/.test(html)) {
    extraLines.push(`  <link rel="canonical" href="${u}" />`);
  }

  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: seoDesc,
    url: canonicalUrl,
    ...(images.length > 0
      ? { image: images.map((imageUrl) => toAbsoluteUrl(imageUrl)).filter(Boolean) }
      : {}),
    ...(priceNum !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            price: priceStr,
            priceCurrency: 'GBP',
            availability: schemaAvailability,
            url: canonicalUrl,
            seller: {
              '@type': 'Organization',
              name: SITE_NAME,
            },
          },
        }
      : {}),
  };
  extraLines.push(
    `  <script type="application/ld+json">${JSON.stringify(productJsonLd)}</script>`,
  );

  if (extraLines.length > 0) {
    html = html.replace('</head>', `${extraLines.join('\n')}\n</head>`);
  }

  const headers = new Headers(baseResponse.headers);
  return new Response(html, {
    status: baseResponse.status,
    statusText: baseResponse.statusText,
    headers,
  });
}

export const config: Config = {
  path: '/product/*',
};
