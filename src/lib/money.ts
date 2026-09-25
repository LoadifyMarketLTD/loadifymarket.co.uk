import type { MarketCode, MarketCurrency, MarketLocale } from './marketConfig';

export type CurrencyCode = MarketCurrency | 'EUR' | 'USD';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

const CURRENCY_LOCALE: Record<CurrencyCode, MarketLocale | 'en-US' | 'en-IE'> = {
  GBP: 'en-GB',
  RON: 'ro-RO',
  EUR: 'en-IE',
  USD: 'en-US',
};

export function formatMoney(money: Money, locale?: string): string {
  return new Intl.NumberFormat(locale ?? CURRENCY_LOCALE[money.currency], {
    style: 'currency',
    currency: money.currency,
  }).format(money.amount);
}

export function marketCanDisplayCurrency(market: MarketCode, currency: CurrencyCode): boolean {
  return (market === 'GB' && currency === 'GBP') || (market === 'RO' && currency === 'RON');
}
