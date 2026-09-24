import { readMarket, type MarketCode } from './marketConfig';

export function marketFromHostname(hostname: string): MarketCode | null {
  const host = hostname.trim().toLowerCase().replace(/:\d+$/, '');
  if (host === 'loadifymarket.ro' || host.endsWith('.loadifymarket.ro')) return 'RO';
  if (host === 'loadifymarket.co.uk' || host.endsWith('.loadifymarket.co.uk')) return 'GB';
  return null;
}

export function resolveInitialMarket(): MarketCode {
  if (typeof window === 'undefined') return 'GB';

  const stored = window.localStorage.getItem('loadify-market-country');
  if (stored === 'GB' || stored === 'RO') return stored;

  return marketFromHostname(window.location.hostname) ?? readMarket();
}
