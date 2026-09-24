import { describe, expect, it } from 'vitest';
import { addressCountryCode, addressPostalCode, validateMarketAddress } from './marketAddress';

describe('market address contract', () => {
  it('accepts a UK address for GB', () => {
    const result = validateMarketAddress({
      line1: '1 Market Street',
      city: 'Manchester',
      postal_code: 'M1 1AA',
      country: 'GB',
    }, 'GB');
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts a Romanian six-digit postal code for RO', () => {
    const result = validateMarketAddress({
      line1: 'Strada Exemplu 1',
      city: 'București',
      postal_code: '010101',
      country: 'Romania',
    }, 'RO');
    expect(result.ok).toBe(true);
  });

  it('rejects market/country mismatches', () => {
    expect(validateMarketAddress({
      line1: '1 Test',
      city: 'London',
      postal_code: 'SW1A 1AA',
      country: 'RO',
    }, 'GB').errors).toContain('country_market_mismatch');
  });

  it('rejects a UK postcode in Romania', () => {
    expect(validateMarketAddress({
      line1: '1 Test',
      city: 'Cluj-Napoca',
      postal_code: 'SW1A 1AA',
      country: 'RO',
    }, 'RO').errors).toContain('ro_postcode_invalid');
  });

  it('normalises country and postal aliases', () => {
    expect(addressCountryCode({ countryCode: 'United Kingdom' })).toBe('GB');
    expect(addressCountryCode({ country: 'România' })).toBe('RO');
    expect(addressPostalCode({ postcode: ' sw1a   1aa ' })).toBe('SW1A 1AA');
  });
});
