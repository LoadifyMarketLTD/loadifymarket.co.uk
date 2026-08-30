import { describe, expect, it } from 'vitest';
import { isProfileComplete } from '../_shared/sellerActivation';
import {
  buyerAccountRequiresOrganisationName,
  isBuyerAccountType,
  isBuyerProfileComplete,
  normalizeBuyerAccountType,
} from '../../../src/lib/buyerProfileModel';

const sellerBase = {
  contactPhone: '07123456789',
  businessAddress: { postcode: 'SW1A 1AA' },
  companyRegistrationNumber: '',
  vatNumber: '',
  isVatRegistered: false,
};

const buyerBase = {
  firstName: 'Test',
  lastName: 'Buyer',
  shippingLine1: '1 Example Street',
  shippingCity: 'London',
  shippingPostcode: 'SW1A 1AA',
  shippingCountry: 'United Kingdom',
};

describe('profile-type-aware completeness', () => {
  it('allows an Individual seller without a business/store name', () => {
    expect(
      isProfileComplete(
        {
          ...sellerBase,
          businessName: '',
          storeName: '',
        },
        'individual',
      ),
    ).toBe(true);
  });

  it('still requires contact and address data for an Individual seller', () => {
    expect(
      isProfileComplete(
        {
          ...sellerBase,
          contactPhone: '',
          businessName: '',
          storeName: '',
        },
        'individual',
      ),
    ).toBe(false);

    expect(
      isProfileComplete(
        {
          ...sellerBase,
          businessAddress: { postcode: '' },
          businessName: '',
          storeName: '',
        },
        'individual',
      ),
    ).toBe(false);
  });

  it('keeps a trading/business identity requirement for sole traders and legacy sellers', () => {
    expect(
      isProfileComplete(
        { ...sellerBase, businessName: '', storeName: '' },
        'sole_trader',
      ),
    ).toBe(false);
    expect(
      isProfileComplete(
        { ...sellerBase, businessName: '', storeName: '' },
        null,
      ),
    ).toBe(false);
    expect(
      isProfileComplete(
        { ...sellerBase, businessName: 'Example Trading', storeName: '' },
        'sole_trader',
      ),
    ).toBe(true);
  });

  it('keeps company registration and declared VAT requirements fail-closed', () => {
    expect(
      isProfileComplete(
        { ...sellerBase, businessName: 'Example Ltd' },
        'company',
      ),
    ).toBe(false);

    expect(
      isProfileComplete(
        {
          ...sellerBase,
          businessName: 'Example Ltd',
          companyRegistrationNumber: '12345678',
          isVatRegistered: true,
          vatNumber: '',
        },
        'company',
      ),
    ).toBe(false);

    expect(
      isProfileComplete(
        {
          ...sellerBase,
          businessName: 'Example Ltd',
          companyRegistrationNumber: '12345678',
          isVatRegistered: true,
          vatNumber: 'GB123456789',
        },
        'company',
      ),
    ).toBe(true);
  });

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
