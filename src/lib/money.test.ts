import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatPrice';
import { formatMoney, marketCanDisplayCurrency } from './money';

describe('money boundary', () => {
  it('keeps legacy listing prices in GBP', () => {
    const rendered = formatPrice(100);
    expect(rendered).toContain('100');
    expect(rendered).toContain('£');
  });

  it('formats RON only when RON is the actual currency', () => {
    const rendered = formatMoney({ amount: 100, currency: 'RON' }, 'ro-RO');
    expect(rendered).toContain('100');
    expect(rendered).toMatch(/RON|lei/);
  });

  it('does not treat GBP as Romania market-native money', () => {
    expect(marketCanDisplayCurrency('RO', 'GBP')).toBe(false);
    expect(marketCanDisplayCurrency('RO', 'RON')).toBe(true);
    expect(marketCanDisplayCurrency('GB', 'GBP')).toBe(true);
  });
});
