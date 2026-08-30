import { describe, expect, it } from 'vitest';
import { isProfileComplete } from '../_shared/sellerActivation';

const sellerBase = {
  contactPhone: '07123456789',
  businessAddress: { postcode: 'SW1A 1AA' },
  companyRegistrationNumber: '',
  vatNumber: '',
  isVatRegistered: false,
};

describe('seller profile-type-aware completeness', () => {
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

  it('uses a non-empty business name when storeName is persisted as an empty string', () => {
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
});
