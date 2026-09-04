export const ADMIN_SETTING_KEYS = [
  'feature_flags',
  'maintenance_mode',
  'platform_config',
] as const;

export type AdminSettingKey = (typeof ADMIN_SETTING_KEYS)[number];

export interface AdminSettingUpdate {
  key: AdminSettingKey;
  value: unknown;
}

type JsonRecord = Record<string, unknown>;

const ADMIN_SETTING_KEY_SET = new Set<string>(ADMIN_SETTING_KEYS);
const FEATURE_FLAG_KEYS = [
  'sellerRegistration',
  'buyerRegistration',
  'rfqRequests',
  'reviewSystem',
  'autoApproveProducts',
] as const;
const OPTIONAL_FEATURE_FLAG_KEYS = ['requireCompanyApproval'] as const;
const PLATFORM_CONFIG_KEYS = [
  'commissionRate',
  'maxFileSize',
  'autoApproveListings',
] as const;
const MAINTENANCE_MODE_KEYS = ['enabled', 'message'] as const;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (record: JsonRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const hasOnlyKeys = (record: JsonRecord, allowedKeys: readonly string[]): boolean => {
  const allowed = new Set(allowedKeys);
  return Object.keys(record).every((key) => allowed.has(key));
};

const hasRequiredKeys = (record: JsonRecord, requiredKeys: readonly string[]): boolean =>
  requiredKeys.every((key) => hasOwn(record, key));

const isFeatureFlags = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const allowedKeys = [...FEATURE_FLAG_KEYS, ...OPTIONAL_FEATURE_FLAG_KEYS];
  if (!hasOnlyKeys(value, allowedKeys) || !hasRequiredKeys(value, FEATURE_FLAG_KEYS)) {
    return false;
  }

  if (!FEATURE_FLAG_KEYS.every((key) => typeof value[key] === 'boolean')) {
    return false;
  }

  return value.requireCompanyApproval === undefined
    || typeof value.requireCompanyApproval === 'boolean';
};

const isPlatformConfig = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, PLATFORM_CONFIG_KEYS) || !hasRequiredKeys(value, PLATFORM_CONFIG_KEYS)) {
    return false;
  }

  const { commissionRate, maxFileSize, autoApproveListings } = value;
  return typeof commissionRate === 'number'
    && Number.isFinite(commissionRate)
    && commissionRate >= 0
    && commissionRate <= 100
    && typeof maxFileSize === 'number'
    && Number.isInteger(maxFileSize)
    && maxFileSize >= 1
    && maxFileSize <= 100
    && typeof autoApproveListings === 'boolean';
};

const isMaintenanceMode = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, MAINTENANCE_MODE_KEYS) || !hasRequiredKeys(value, MAINTENANCE_MODE_KEYS)) {
    return false;
  }

  const { enabled, message } = value;
  return typeof enabled === 'boolean'
    && typeof message === 'string'
    && message.trim().length > 0
    && message.length <= 500;
};

const isValidValueForKey = (key: AdminSettingKey, value: unknown): boolean => {
  switch (key) {
    case 'feature_flags':
      return isFeatureFlags(value);
    case 'maintenance_mode':
      return isMaintenanceMode(value);
    case 'platform_config':
      return isPlatformConfig(value);
  }
};

export const isValidAdminSettingsBatch = (
  value: unknown,
): value is AdminSettingUpdate[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > ADMIN_SETTING_KEYS.length) {
    return false;
  }

  const seenKeys = new Set<AdminSettingKey>();

  for (const row of value) {
    if (!isRecord(row) || !hasOnlyKeys(row, ['key', 'value']) || !hasRequiredKeys(row, ['key', 'value'])) {
      return false;
    }

    if (typeof row.key !== 'string' || !ADMIN_SETTING_KEY_SET.has(row.key)) {
      return false;
    }

    const key = row.key as AdminSettingKey;
    if (seenKeys.has(key) || !isValidValueForKey(key, row.value)) {
      return false;
    }

    seenKeys.add(key);
  }

  return true;
};
