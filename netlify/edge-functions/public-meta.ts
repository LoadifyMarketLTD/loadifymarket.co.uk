import type { Config, Context } from '@netlify/edge-functions';
import { COMMERCIAL_SEO_META } from '../../src/lib/commercialSeo.ts';
import { seoMarketContext } from './_shared/marketSeo.ts';

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
  '/suppliers/apply': {
    title: 'Become a Supplier | Loadify Market',
    description: 'Direct supplier application for manufacturers, importers, wholesalers and distributors with supplier-held stock and fulfilment capabilities.',
  },
  '/technology': {
    title: 'Loadify Technology | Supplier Foundation & AI Product Builder',
    description: "Explore Loadify Market's Supplier Foundation, governed catalogue ingestion, AI Product Builder and evidence-led commerce technology model.",
  },
  '/integrations': {
    title: 'Loadify Integrations | Supplier Feeds, APIs & Commerce Connectivity',
    description: "Explore Loadify Market's provider-neutral supplier ingestion model, supported catalogue transports and evidence-led commerce integration lifecycle.",
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

function setRobots(html: string, robots: string): string {
  const meta = `<meta name="robots" content="${escapeAttr(robots)}" />`;
  const selector = /<meta name="robots" content="[^"]*"\s*\/?>/;
  if (selector.test(html)) return html.replace(selector, meta);
  return html.replace('</head>', `  ${meta}\n</head>`);
}

export default async function publicMeta(
  request: Request,
  context: Context,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const marketContext = seoMarketContext(requestUrl);
  const pathname = requestUrl.pathname.replace(/\/$/, '') || '/';
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
  const canonical = escapeAttr(`${marketContext.baseUrl}${pathname}`);

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

  if (pathname === '/catalog' && requestUrl.search.length > 0) {
    html = setRobots(html, 'noindex, follow');
  }

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
