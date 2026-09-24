export type MarketCode = 'GB' | 'RO';
export type MarketLocale = 'en-GB' | 'ro-RO';
export type MarketCurrency = 'GBP' | 'RON';

export interface MarketConfig {
  code: MarketCode;
  locale: MarketLocale;
  currency: MarketCurrency;
  language: 'en' | 'ro';
  label: string;
  shortLabel: string;
  flag: string;
  taxRegion: 'UK' | 'EU_RO';
  shippingRegion: 'UK' | 'RO';
}

export const MARKET_CONFIG: Record<MarketCode, MarketConfig> = {
  GB: { code: 'GB', locale: 'en-GB', currency: 'GBP', language: 'en', label: 'United Kingdom', shortLabel: 'UK', flag: '🇬🇧', taxRegion: 'UK', shippingRegion: 'UK' },
  RO: { code: 'RO', locale: 'ro-RO', currency: 'RON', language: 'ro', label: 'România', shortLabel: 'RO', flag: '🇷🇴', taxRegion: 'EU_RO', shippingRegion: 'RO' },
};

const STORAGE_KEY = 'loadify-market-country';

export function readMarket(): MarketCode {
  if (typeof window === 'undefined') return 'GB';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'RO' ? 'RO' : 'GB';
}

export function writeMarket(code: MarketCode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, code);
  document.documentElement.lang = MARKET_CONFIG[code].language;
  window.dispatchEvent(new CustomEvent('loadify:market-change', { detail: code }));
}

export function formatMarketMoney(amount: number, market: MarketCode = readMarket()): string {
  const cfg = MARKET_CONFIG[market];
  return new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cfg.currency }).format(amount);
}
