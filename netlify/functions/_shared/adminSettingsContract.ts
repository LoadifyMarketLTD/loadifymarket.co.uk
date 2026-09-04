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
  'rfqSystem',
  'reviewSystem',
  'autoApproveProducts',
] as const;
const OPTIONAL_FEATURE_FLAG_KEYS = ['requireCompanyApproval'] as const;
const PLATFORM_CONFIG_KEYS = [
  'platformName',
  'supportEmail',
  'defaultCurrency',
  'commissionRate',
  'maxUploadSizeMb',
  'productsPerPage',
] as const;
const CURRENCIES = new Set(['gbp', 'eur', 'usd']);

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

  const {
    platformName,
    supportEmail,
    defaultCurrency,
    commissionRate,
    maxUploadSizeMb,
    productsPerPage,
  } = value;

  const validSupportEmail = typeof supportEmail === 'string'
    && supportEmail.length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail);

  return typeof platformName === 'string'
    && platformName.trim().length > 0
    && platformName.length <= 120
    && validSupportEmail
    && typeof defaultCurrency === 'string'
    && CURRENCIES.has(defaultCurrency)
    && typeof commissionRate === 'number'
    && Number.isFinite(commissionRate)
    && commissionRate >= 0
    && commissionRate <= 100
    && typeof maxUploadSizeMb === 'number'
    && Number.isSafeInteger(maxUploadSizeMb)
    && maxUploadSizeMb >= 1
    && maxUploadSizeMb <= 1024
    && typeof productsPerPage === 'number'
    && Number.isSafeInteger(productsPerPage)
    && productsPerPage >= 1
    && productsPerPage <= 1000;
};

const isValidValueForKey = (key: AdminSettingKey, value: unknown): boolean => {
  switch (key) {
    case 'feature_flags':
      return isFeatureFlags(value);
    case 'maintenance_mode':
      return typeof value === 'boolean';
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
