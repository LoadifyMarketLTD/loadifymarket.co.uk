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

export function seoAlternateLinks(pathname: string): string {
  const path = pathname === '/' ? '' : pathname;
  return [
    '<link rel="alternate" hreflang="en-GB" href="https://' + GB_HOST + path + '" />',
    '<link rel="alternate" hreflang="ro-RO" href="https://' + RO_HOST + path + '" />',
    '<link rel="alternate" hreflang="x-default" href="https://' + GB_HOST + path + '" />',
  ].join(String.fromCharCode(10) + '  ');
}

export function replaceOrInsertSeoAlternates(html: string, pathname: string): string {
  const alternatePattern = new RegExp(
    String.raw`\\s*<link rel="alternate" hreflang="(?:en-GB|ro-RO|x-default)" href="[^"]*"\\s*\\/?>`,
    'g',
  );
  const withoutExisting = html.replace(alternatePattern, '');
  const alternates = seoAlternateLinks(pathname);
  return withoutExisting.replace('</head>', '  ' + alternates + String.fromCharCode(10) + '</head>');
}
