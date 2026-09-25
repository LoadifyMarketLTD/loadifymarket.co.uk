export type SeoMarket = 'GB' | 'RO';

export interface SeoMarketContext {
  market: SeoMarket;
  baseUrl: string;
  locale: 'en-GB' | 'ro-RO';
  currency: 'GBP' | 'RON';
}

const GB_HOST = 'loadifymarket.co.uk';
const RO_HOST = 'loadifymarket.ro';

export function seoMarketContext(url: URL): SeoMarketContext {
  const host = url.hostname.toLowerCase();
  if (host === RO_HOST || host.endsWith('.' + RO_HOST)) {
    return { market: 'RO', baseUrl: 'https://' + RO_HOST, locale: 'ro-RO', currency: 'RON' };
  }
  return { market: 'GB', baseUrl: 'https://' + GB_HOST, locale: 'en-GB', currency: 'GBP' };
}

export function marketCodesRestFilter(market: SeoMarket): string {
  return encodeURIComponent('{' + market + '}');
}
