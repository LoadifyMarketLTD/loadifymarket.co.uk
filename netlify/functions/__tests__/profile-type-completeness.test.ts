import { describe, expect, it } from 'vitest';
import {
  buyerAccountRequiresOrganisationName,
  isBuyerAccountType,
  isBuyerProfileComplete,
  normalizeBuyerAccountType,
} from '../../../src/lib/buyerProfileModel';

const buyerBase = {
  firstName: 'Test',
  lastName: 'Buyer',
  shippingLine1: '1 Example Street',
  shippingCity: 'London',
  shippingPostcode: 'SW1A 1AA',
  shippingCountry: 'United Kingdom',
};

describe('Buyer profile type-aware completeness', () => {
  it('accepts only the canonical Buyer account types', () => {
    for (const type of [
      'individual',
      'sole_trader',
      'limited_company',
      'partnership',
      'charity',
      'other',
    ]) {
      expect(isBuyerAccountType(type)).toBe(true);
    }

    expect(isBuyerAccountType('business')).toBe(false);
    expect(isBuyerAccountType('reseller')).toBe(false);
    expect(isBuyerAccountType('distributor')).toBe(false);
  });

  it('maps historical Buyer commercial values to the canonical catch-all without turning them into Individual', () => {
    expect(normalizeBuyerAccountType('business')).toBe('other');
    expect(normalizeBuyerAccountType('reseller')).toBe('other');
    expect(normalizeBuyerAccountType('distributor')).toBe('other');
    expect(normalizeBuyerAccountType('limited_company')).toBe('limited_company');
    expect(normalizeBuyerAccountType(undefined)).toBe('individual');
  });

  it('allows an Individual Buyer to complete without business-only fields', () => {
    expect(
      isBuyerProfileComplete({
        accountType: 'individual',
        ...buyerBase,
        companyName: '',
      }),
    ).toBe(true);
  });

  it('requires personal/address data for every Buyer profile', () => {
    expect(
      isBuyerProfileComplete({
        accountType: 'individual',
        ...buyerBase,
        lastName: '',
      }),
    ).toBe(false);
  });

  it('does not invent a trading-name requirement for sole traders but requires organisation names where the model needs one', () => {
    expect(buyerAccountRequiresOrganisationName('sole_trader')).toBe(false);
    expect(buyerAccountRequiresOrganisationName('limited_company')).toBe(true);

    expect(
      isBuyerProfileComplete({
        accountType: 'sole_trader',
        ...buyerBase,
        companyName: '',
      }),
    ).toBe(true);

    expect(
      isBuyerProfileComplete({
        accountType: 'limited_company',
        ...buyerBase,
        companyName: '',
      }),
    ).toBe(false);
  });
});
