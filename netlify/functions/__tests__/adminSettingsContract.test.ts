import { describe, expect, it } from 'vitest';
import { isValidAdminSettingsBatch } from '../_shared/adminSettingsContract';

const validFeatureFlags = {
  sellerRegistration: true,
  buyerRegistration: true,
  rfqSystem: false,
  reviewSystem: true,
  autoApproveProducts: true,
};

const validPlatformConfig = {
  platformName: 'Loadify Market',
  supportEmail: 'contact@loadifymarket.co.uk',
  defaultCurrency: 'gbp',
  commissionRate: 7,
  maxUploadSizeMb: 15,
  productsPerPage: 24,
};

describe('admin settings contract', () => {
  it('accepts the canonical live admin settings batch', () => {
    expect(isValidAdminSettingsBatch([
      { key: 'feature_flags', value: validFeatureFlags },
      { key: 'platform_config', value: validPlatformConfig },
      { key: 'maintenance_mode', value: false },
    ])).toBe(true);
  });

  it('preserves the optional requireCompanyApproval feature flag contract', () => {
    expect(isValidAdminSettingsBatch([
      {
        key: 'feature_flags',
        value: { ...validFeatureFlags, requireCompanyApproval: true },
      },
    ])).toBe(true);
  });

  it('rejects unknown and duplicate setting keys', () => {
    expect(isValidAdminSettingsBatch([
      { key: 'unknown', value: {} },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      { key: 'platform_config', value: validPlatformConfig },
      { key: 'platform_config', value: validPlatformConfig },
    ])).toBe(false);
  });

  it('rejects malformed feature flags', () => {
    expect(isValidAdminSettingsBatch([
      {
        key: 'feature_flags',
        value: { ...validFeatureFlags, reviewSystem: 'yes' },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'feature_flags',
        value: {
          buyerRegistration: true,
          rfqSystem: false,
          reviewSystem: true,
          autoApproveProducts: true,
        },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'feature_flags',
        value: { ...validFeatureFlags, unexpectedFlag: true },
      },
    ])).toBe(false);
  });

  it('rejects invalid platform configuration values', () => {
    expect(isValidAdminSettingsBatch([
      {
        key: 'platform_config',
        value: { ...validPlatformConfig, commissionRate: 101 },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'platform_config',
        value: { ...validPlatformConfig, maxUploadSizeMb: 0 },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'platform_config',
        value: { ...validPlatformConfig, defaultCurrency: 'jpy' },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'platform_config',
        value: { ...validPlatformConfig, supportEmail: 'not-an-email' },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'platform_config',
        value: { ...validPlatformConfig, unexpectedConfig: true },
      },
    ])).toBe(false);
  });

  it('requires maintenance mode to remain a boolean', () => {
    expect(isValidAdminSettingsBatch([
      { key: 'maintenance_mode', value: false },
    ])).toBe(true);

    expect(isValidAdminSettingsBatch([
      { key: 'maintenance_mode', value: 'false' },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      { key: 'maintenance_mode', value: { enabled: false } },
    ])).toBe(false);
  });

  it('rejects malformed row envelopes', () => {
    expect(isValidAdminSettingsBatch([])).toBe(false);
    expect(isValidAdminSettingsBatch([null])).toBe(false);
    expect(isValidAdminSettingsBatch([
      { key: 'platform_config' },
    ])).toBe(false);
    expect(isValidAdminSettingsBatch([
      { key: 'platform_config', value: validPlatformConfig, extra: true },
    ])).toBe(false);
  });
});
