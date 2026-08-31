import type { SupplierAdapterCapability } from './supplierAdapter';
import type { DirectSupplierFeedTransport } from './directSupplierContract';

export const DIRECT_SUPPLIER_ONBOARDING_VERSION = 1 as const;

export interface DirectSupplierWarehouseDeclaration {
  externalWarehouseRef: string;
  country: string;
}

/**
 * Commercial/technical onboarding metadata for a direct supplier.
 *
 * Secrets, API keys, bank details and customer PII are intentionally excluded.
 * This manifest records readiness inputs only; it never activates a supplier.
 */
export interface DirectSupplierOnboardingManifestV1 {
  onboardingVersion: typeof DIRECT_SUPPLIER_ONBOARDING_VERSION;
  supplierKey: string;
  legalName: string;
  registrationCountry: string;
  registrationNumber?: string;
  vatNumber?: string;
  feedTransport: DirectSupplierFeedTransport;
  warehouseDeclarations: DirectSupplierWarehouseDeclaration[];
  supportedTerritories: string[];
  requestedCapabilities: SupplierAdapterCapability[];
  commercialApproval: false;
  hostedActivation: 'off';
}

export type DirectSupplierOnboardingParseResult =
  | { ok: true; manifest: DirectSupplierOnboardingManifestV1 }
  | { ok: false; errors: string[] };

const SUPPLIER_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const FEED_TRANSPORTS = new Set<DirectSupplierFeedTransport>([
  'json_api',
  'json_feed',
  'csv',
  'xml',
  'sftp',
]);
const ADAPTER_CAPABILITIES = new Set<SupplierAdapterCapability>([
  'supplier_identity',
  'catalog',
  'variants',
  'stock',
  'price',
  'shipping',
  'order_submission',
  'acknowledgement',
  'tracking',
  'cancellation',
  'returns',
  'reimbursement',
]);
const MANIFEST_KEYS = new Set([
  'onboardingVersion',
  'supplierKey',
  'legalName',
  'registrationCountry',
  'registrationNumber',
  'vatNumber',
  'feedTransport',
  'warehouseDeclarations',
  'supportedTerritories',
  'requestedCapabilities',
  'commercialApproval',
  'hostedActivation',
]);
const WAREHOUSE_KEYS = new Set(['externalWarehouseRef', 'country']);

function normalizedCountry(value: string): string {
  return value.trim().toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateDirectSupplierOnboardingManifest(
  manifest: DirectSupplierOnboardingManifestV1,
): string[] {
  const errors: string[] = [];

  if (manifest.onboardingVersion !== DIRECT_SUPPLIER_ONBOARDING_VERSION) {
    errors.push('unsupported onboardingVersion');
  }
  if (!SUPPLIER_KEY_PATTERN.test(manifest.supplierKey.trim())) {
    errors.push('supplierKey must be a stable lowercase identifier');
  }
  if (!manifest.legalName.trim()) errors.push('legalName is required');
  if (!COUNTRY_PATTERN.test(normalizedCountry(manifest.registrationCountry))) {
    errors.push('registrationCountry must be a 2-letter country code');
  }
  if (!FEED_TRANSPORTS.has(manifest.feedTransport)) {
    errors.push('feedTransport is unsupported');
  }
  if (manifest.commercialApproval !== false) {
    errors.push('commercialApproval must remain false in onboarding manifests');
  }
  if (manifest.hostedActivation !== 'off') {
    errors.push('hostedActivation must remain off in onboarding manifests');
  }

  const warehouseRefs = new Set<string>();
  for (const [index, warehouse] of manifest.warehouseDeclarations.entries()) {
    const prefix = `warehouseDeclarations[${index}]`;
    const ref = warehouse.externalWarehouseRef.trim();
    if (!ref) errors.push(`${prefix}.externalWarehouseRef is required`);
    if (ref && warehouseRefs.has(ref)) errors.push(`${prefix}.externalWarehouseRef must be unique`);
    warehouseRefs.add(ref);
    if (!COUNTRY_PATTERN.test(normalizedCountry(warehouse.country))) {
      errors.push(`${prefix}.country must be a 2-letter country code`);
    }
  }

  const territories = manifest.supportedTerritories.map(normalizedCountry);
  if (territories.length === 0) errors.push('supportedTerritories must not be empty');
  if (territories.some(country => !COUNTRY_PATTERN.test(country))) {
    errors.push('supportedTerritories must contain only 2-letter country codes');
  }
  if (new Set(territories).size !== territories.length) {
    errors.push('supportedTerritories must be unique');
  }

  if (manifest.requestedCapabilities.some(capability => !ADAPTER_CAPABILITIES.has(capability))) {
    errors.push('requestedCapabilities contains an unsupported capability');
  }
  if (new Set(manifest.requestedCapabilities).size !== manifest.requestedCapabilities.length) {
    errors.push('requestedCapabilities must be unique');
  }

  return errors;
}

/**
 * Strict runtime parser for externally supplied onboarding JSON.
 *
 * TypeScript interfaces do not protect HTTP JSON at runtime. This parser rejects
 * unknown fields (including credential-like additions), malformed arrays and any
 * feed transport/capability outside the provider-neutral allowlists before the
 * manifest can reach Supplier Foundation or feed-admission logic.
 */
export function parseDirectSupplierOnboardingManifest(value: unknown): DirectSupplierOnboardingParseResult {
  if (!isRecord(value)) return { ok: false, errors: ['onboarding manifest must be an object'] };

  const errors: string[] = [];
  for (const key of Object.keys(value)) {
    if (!MANIFEST_KEYS.has(key)) errors.push(`unsupported onboarding field: ${key}`);
  }

  if (value.onboardingVersion !== DIRECT_SUPPLIER_ONBOARDING_VERSION) {
    errors.push('unsupported onboardingVersion');
  }
  if (typeof value.supplierKey !== 'string') errors.push('supplierKey must be a string');
  if (typeof value.legalName !== 'string') errors.push('legalName must be a string');
  if (typeof value.registrationCountry !== 'string') errors.push('registrationCountry must be a string');
  if (value.registrationNumber !== undefined && typeof value.registrationNumber !== 'string') {
    errors.push('registrationNumber must be a string when provided');
  }
  if (value.vatNumber !== undefined && typeof value.vatNumber !== 'string') {
    errors.push('vatNumber must be a string when provided');
  }
  if (typeof value.feedTransport !== 'string' || !FEED_TRANSPORTS.has(value.feedTransport as DirectSupplierFeedTransport)) {
    errors.push('feedTransport is unsupported');
  }
  if (value.commercialApproval !== false) {
    errors.push('commercialApproval must remain false in onboarding manifests');
  }
  if (value.hostedActivation !== 'off') {
    errors.push('hostedActivation must remain off in onboarding manifests');
  }

  const warehouses: DirectSupplierWarehouseDeclaration[] = [];
  if (!Array.isArray(value.warehouseDeclarations)) {
    errors.push('warehouseDeclarations must be an array');
  } else {
    for (const [index, warehouse] of value.warehouseDeclarations.entries()) {
      if (!isRecord(warehouse)) {
        errors.push(`warehouseDeclarations[${index}] must be an object`);
        continue;
      }
      for (const key of Object.keys(warehouse)) {
        if (!WAREHOUSE_KEYS.has(key)) errors.push(`unsupported warehouseDeclarations[${index}] field: ${key}`);
      }
      if (typeof warehouse.externalWarehouseRef !== 'string') {
        errors.push(`warehouseDeclarations[${index}].externalWarehouseRef must be a string`);
      }
      if (typeof warehouse.country !== 'string') {
        errors.push(`warehouseDeclarations[${index}].country must be a string`);
      }
      if (typeof warehouse.externalWarehouseRef === 'string' && typeof warehouse.country === 'string') {
        warehouses.push({
          externalWarehouseRef: warehouse.externalWarehouseRef.trim(),
          country: normalizedCountry(warehouse.country),
        });
      }
    }
  }

  const territories: string[] = [];
  if (!Array.isArray(value.supportedTerritories) || !value.supportedTerritories.every(item => typeof item === 'string')) {
    errors.push('supportedTerritories must be an array of strings');
  } else {
    territories.push(...value.supportedTerritories.map(item => normalizedCountry(item as string)));
  }

  const capabilities: SupplierAdapterCapability[] = [];
  if (!Array.isArray(value.requestedCapabilities) || !value.requestedCapabilities.every(item => typeof item === 'string')) {
    errors.push('requestedCapabilities must be an array of strings');
  } else {
    for (const capability of value.requestedCapabilities) {
      if (!ADAPTER_CAPABILITIES.has(capability as SupplierAdapterCapability)) {
        errors.push(`unsupported requested capability: ${capability}`);
        continue;
      }
      capabilities.push(capability as SupplierAdapterCapability);
    }
  }

  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };

  const manifest: DirectSupplierOnboardingManifestV1 = {
    onboardingVersion: DIRECT_SUPPLIER_ONBOARDING_VERSION,
    supplierKey: (value.supplierKey as string).trim(),
    legalName: (value.legalName as string).trim(),
    registrationCountry: normalizedCountry(value.registrationCountry as string),
    registrationNumber: typeof value.registrationNumber === 'string' && value.registrationNumber.trim()
      ? value.registrationNumber.trim()
      : undefined,
    vatNumber: typeof value.vatNumber === 'string' && value.vatNumber.trim()
      ? value.vatNumber.trim()
      : undefined,
    feedTransport: value.feedTransport as DirectSupplierFeedTransport,
    warehouseDeclarations: warehouses,
    supportedTerritories: territories,
    requestedCapabilities: capabilities,
    commercialApproval: false,
    hostedActivation: 'off',
  };

  const semanticErrors = validateDirectSupplierOnboardingManifest(manifest);
  if (semanticErrors.length > 0) return { ok: false, errors: semanticErrors };

  return { ok: true, manifest };
}
