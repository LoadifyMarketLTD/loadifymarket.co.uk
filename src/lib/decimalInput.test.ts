import { describe, expect, it } from 'vitest';
import { normalizeDecimalInput, parseDecimalInput } from '@/lib/decimalInput';

describe('decimalInput', () => {
  it.each([
    ['39,99', '39.99'],
    ['1.99', '1.99'],
    ['1000', '1000'],
    [' 12,50 ', '12.50'],
  ])('normalizes unambiguous mobile price %s to %s', (input, expected) => {
    expect(normalizeDecimalInput(input)).toBe(expected);
  });

  it.each(['1,000', '1.000', '1,000.50', '1.000,50'])('does not guess ambiguous thousands formatting %s', (input) => {
    expect(normalizeDecimalInput(input)).toBe(input);
    expect(parseDecimalInput(input)).toBeNull();
  });

  it('parses decimal comma prices without truncation', () => {
    expect(parseDecimalInput('39,99')).toBe(39.99);
    expect(parseDecimalInput('1000')).toBe(1000);
  });

  it.each(['', 'abc', '-1', '1.2.3', '12.345', '£12.50'])('rejects invalid or unsafe mobile price input %s', (input) => {
    expect(parseDecimalInput(input)).toBeNull();
  });
});
