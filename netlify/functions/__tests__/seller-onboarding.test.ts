import { describe, expect, it } from 'vitest';
import {
  buildStoreSlug,
  deriveSellerOnboardingReadiness,
  legacyAccountTypeForSellerType,
  parseSellerType,
} from '../_shared/sellerOnboarding';

describe('seller onboarding V2 readiness', () => {
  it('accepts only canonical Marketplace Seller types', () => {
    expect(parseSellerType('individual')).toBe('individual');
    expect(parseSellerType('sole_trader')).toBe('sole_trader');
    expect(parseSellerType('company')).toBe('company');
    expect(parseSellerType('business')).toBeNull();
    expect(parseSellerType('supplier')).toBeNull();
  });

  it('keeps the legacy accountType projection compatibility-only', () => {
    expect(legacyAccountTypeForSellerType('individual')).toBe('individual');
    expect(legacyAccountTypeForSellerType('sole_trader')).toBe('business');
    expect(legacyAccountTypeForSellerType('company')).toBe('business');
  });

  it('creates deterministic store slugs without trusting display names as identifiers', () => {
    expect(buildStoreSlug('Daniel’s UK Store', '12345678-aaaa-bbbb-cccc-dddddddddddd'))
      .toBe('daniel-s-uk-store-12345678');
  });

  it('does not let Stripe gate marketplace setup completion', () => {
    const state = deriveSellerOnboardingReadiness({
      sellerType: 'sole_trader',
      profileComplete: true,
      storeName: 'Loadify Seller',
      productCount: 1,
      sellerStatus: 'submitted',
      stripeConnectStatus: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      requiresAdminApproval: false,
      isApproved: false,
    });

    expect(state.setupComplete).toBe(true);
    expect(state.stripeReady).toBe(false);
    expect(state.sellerActive).toBe(false);
    expect(state.nextStep).toBe(5);
  });

  it('requires a product catalogue row rather than legacy service capability', () => {
    const state = deriveSellerOnboardingReadiness({
      sellerType: 'individual',
      profileComplete: true,
      storeName: 'Seller Store',
      productCount: 0,
      sellerStatus: 'draft',
      stripeConnectStatus: 'active',
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      requiresAdminApproval: false,
      isApproved: false,
    });

    expect(state.setupComplete).toBe(false);
    expect(state.nextStep).toBe(4);
  });

  it('keeps company review separate from Stripe readiness', () => {
    const state = deriveSellerOnboardingReadiness({
      sellerType: 'company',
      profileComplete: true,
      storeName: 'Company Store',
      productCount: 2,
      sellerStatus: 'submitted',
      stripeConnectStatus: 'active',
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      requiresAdminApproval: true,
      isApproved: false,
    });

    expect(state.setupComplete).toBe(true);
    expect(state.stripeReady).toBe(true);
    expect(state.adminReviewPending).toBe(true);
    expect(state.sellerActive).toBe(false);
  });
});
