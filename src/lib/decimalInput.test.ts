import { describe, expect, it } from 'vitest';
import { normalizeDecimalInput, parseDecimalInput } from '@/lib/decimalInput';

describe('decimalInput', () => {
  it.each([
    ['39,99', '39.99'],
    ['13.150', '13150'],
    ['1,000.50', '1000.50'],
    ['1.000,50', '1000.50'],
    ['1.000.000', '1000000'],
    ['1,000', '1000'],
    ['1.99', '1.99'],
    [' 12,50 ', '12.50'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeDecimalInput(input)).toBe(expected);
  });

  it('parses normalized decimal input without truncating comma decimals', () => {
    expect(parseDecimalInput('39,99')).toBe(39.99);
    expect(parseDecimalInput('1.000,50')).toBe(1000.5);
  });

  it.each(['', 'abc', '-1', '1.2.3', '£12.50'])('rejects invalid numeric input %s', (input) => {
    expect(parseDecimalInput(input)).toBeNull();
  });
});
