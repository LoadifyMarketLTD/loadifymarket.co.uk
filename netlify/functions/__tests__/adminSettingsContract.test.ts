import { describe, expect, it } from 'vitest';
import { isValidAdminSettingsBatch } from '../_shared/adminSettingsContract';

const validFeatureFlags = {
  sellerRegistration: true,
  buyerRegistration: true,
  rfqRequests: false,
  reviewSystem: true,
  autoApproveProducts: false,
};

const validPlatformConfig = {
  commissionRate: 7,
  maxFileSize: 20,
  autoApproveListings: false,
};

const validMaintenanceMode = {
  enabled: false,
  message: 'Temporarily unavailable',
};

describe('admin settings contract', () => {
  it('accepts the canonical admin settings batch', () => {
    expect(isValidAdminSettingsBatch([
      { key: 'feature_flags', value: validFeatureFlags },
      { key: 'platform_config', value: validPlatformConfig },
      { key: 'maintenance_mode', value: validMaintenanceMode },
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

    const { sellerRegistration: _sellerRegistration, ...missingRequiredFlag } = validFeatureFlags;
    expect(isValidAdminSettingsBatch([
      { key: 'feature_flags', value: missingRequiredFlag },
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
        value: { ...validPlatformConfig, maxFileSize: 0 },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'platform_config',
        value: { ...validPlatformConfig, autoApproveListings: 'false' },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'platform_config',
        value: { ...validPlatformConfig, unexpectedConfig: true },
      },
    ])).toBe(false);
  });

  it('rejects malformed maintenance mode values', () => {
    expect(isValidAdminSettingsBatch([
      {
        key: 'maintenance_mode',
        value: { ...validMaintenanceMode, enabled: 'false' },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'maintenance_mode',
        value: { ...validMaintenanceMode, message: '   ' },
      },
    ])).toBe(false);

    expect(isValidAdminSettingsBatch([
      {
        key: 'maintenance_mode',
        value: { ...validMaintenanceMode, unexpectedField: true },
      },
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
