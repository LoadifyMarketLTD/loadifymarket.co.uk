import type { Config, Context } from '@netlify/edge-functions';
import { COMMERCIAL_SEO_META } from '../../src/lib/commercialSeo.ts';

const BASE_URL = 'https://loadifymarket.co.uk';

type PageMeta = {
  title: string;
  description: string;
};

const PAGE_META: Record<string, PageMeta> = {
  ...COMMERCIAL_SEO_META,
  '/platform': {
    title: 'Loadify Market Platform | Marketplace for Buyers, Sellers & Business',
    description: 'Explore Loadify Market — a UK-operated marketplace with connected buyer and seller environments, marketplace ordering, tracking and controlled business integration paths.',
  },
  '/technology': {
    title: 'Loadify Technology | Integrations & Developer Context',
    description: "Explore Loadify Market's controlled technology, commerce integration and developer connectivity model.",
  },
  '/integrations': {
    title: 'Loadify Integrations | Supplier Commerce & Technology Connectivity',
    description: "Explore Loadify Market's controlled supplier and commerce integration model, capability validation process and evidence-based connectivity paths.",
  },
  '/partners': {
    title: 'Loadify Partners | Commercial, Technology & Marketplace Partnerships',
    description: 'Explore commercial, technology, supplier and marketplace partnership opportunities with Loadify Market.',
  },
  '/developers': {
    title: 'Loadify Developers | Commerce Integration Context',
    description: "Technical overview of Loadify's controlled commerce integration model for supplier and technology connectivity discussions.",
  },
  '/how-it-works': {
    title: 'How Loadify Market Works | Buyers, Sellers & Marketplace Operations',
    description: 'See how buyers discover and order products, how sellers manage marketplace commerce, and how Loadify connects the customer and seller journey.',
  },
  '/trust': {
    title: 'Loadify Trust & Safety | Marketplace Governance & Policies',
    description: 'Learn how Loadify Market approaches seller readiness, payments, marketplace rules, order visibility, disputes and controlled supplier integration.',
  },
};

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceMeta(html: string, selector: RegExp, replacement: string): string {
  return selector.test(html) ? html.replace(selector, replacement) : html;
}

export default async function publicMeta(
  request: Request,
  context: Context,
): Promise<Response> {
  const pathname = new URL(request.url).pathname.replace(/\/$/, '') || '/';
  const meta = PAGE_META[pathname];
  if (!meta) return context.next();

  const response = await context.next();
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return response;

  let html: string;
  try {
    html = await response.text();
  } catch {
    return response;
  }

  const title = escapeAttr(meta.title);
  const description = escapeAttr(meta.description);
  const canonical = escapeAttr(`${BASE_URL}${pathname}`);

  html = replaceMeta(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = replaceMeta(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`,
  );
  html = replaceMeta(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = replaceMeta(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`,
  );
  html = replaceMeta(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`,
  );
  html = replaceMeta(
    html,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = replaceMeta(
    html,
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`,
  );

  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonical}" />`,
    );
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n</head>`);
  }

  const headers = new Headers(response.headers);
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const config: Config = {
  path: Object.keys(PAGE_META),
};
