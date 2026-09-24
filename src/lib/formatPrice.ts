import { formatMoney, type CurrencyCode } from './money';

export function formatPrice(price: number, currency: CurrencyCode = 'GBP'): string {
  return formatMoney({ amount: price, currency });
}
