/**
 * Shared GBP price formatter used across the whole front-end.
 *
 * Centralised here so that currency/locale can be changed in one place.
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(price);
}
