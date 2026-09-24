import { formatMarketMoney } from './marketConfig';

/**
 * Shared storefront price formatter.
 * The underlying listing amount is not converted here; settlement/exchange
 * conversion belongs at the commerce boundary. This only renders the active market.
 */
export function formatPrice(price: number): string {
  return formatMarketMoney(price);
}
