export type CommercialSeoMeta = {
  title: string;
  description: string;
};

export const COMMERCIAL_SEO_META = {
  '/': {
    title: 'UK Online Marketplace for Buyers, Sellers & Business | Loadify Market',
    description: 'Shop products, sell online and source for business through Loadify Market, a UK-operated marketplace connecting buyers, sellers, trade and supplier routes.',
  },
  '/marketplace': {
    title: 'UK Online Marketplace to Buy & Sell Products | Loadify Market',
    description: 'Browse marketplace products or start selling online with Loadify Market. Manage listings, orders, tracking and seller operations in one UK-operated marketplace.',
  },
  '/catalog': {
    title: 'Shop Products Online | UK Marketplace | Loadify Market',
    description: 'Browse marketplace products across categories on Loadify Market. Search and filter listings by category, price, condition and location to find what you need.',
  },
  '/buyers': {
    title: 'Buy Products Online | UK Marketplace for Buyers | Loadify Market',
    description: 'Browse and buy products through Loadify Market, then manage orders, tracking, favourites, reviews and account activity from your dedicated Buyer Space.',
  },
  '/sellers': {
    title: 'Sell Products Online | UK Marketplace for Sellers | Loadify Market',
    description: 'Start selling products online through Loadify Market. Create listings and manage orders, shipments, returns, reviews, messages and seller account activity.',
  },
  '/business': {
    title: 'B2B Marketplace UK | Trade Buyers & Suppliers | Loadify Market',
    description: 'Explore Loadify Market for business buying, trade accounts, suppliers, brands and wholesalers, with dedicated routes for each commercial role.',
  },
  '/trade': {
    title: 'B2B Marketplace for UK Trade Buyers | Loadify Market',
    description: 'Register as a trade buyer and source products through Loadify Market using a dedicated business purchasing path for traders, companies and organisations.',
  },
  '/suppliers': {
    title: 'UK Marketplace for Suppliers, Brands & Wholesalers | Loadify Market',
    description: 'Explore Loadify Market routes for brands, wholesalers, distributors and product suppliers to sell, discuss supply participation or connect commerce systems.',
  },
} as const satisfies Record<string, CommercialSeoMeta>;

export type CommercialSeoPath = keyof typeof COMMERCIAL_SEO_META;

function normalizeCanonicalPath(canonical?: string): string | undefined {
  if (!canonical) return undefined;

  try {
    const path = canonical.startsWith('http')
      ? new URL(canonical).pathname
      : canonical.split(/[?#]/, 1)[0];
    if (!path) return undefined;
    return path === '/' ? '/' : path.replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

export function getCommercialSeoMeta(canonical?: string): CommercialSeoMeta | undefined {
  const path = normalizeCanonicalPath(canonical);
  if (!path || !(path in COMMERCIAL_SEO_META)) return undefined;
  return COMMERCIAL_SEO_META[path as CommercialSeoPath];
}
