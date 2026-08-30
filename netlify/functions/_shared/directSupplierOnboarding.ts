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

const SUPPLIER_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

function normalizedCountry(value: string): string {
  return value.trim().toUpperCase();
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

  if (new Set(manifest.requestedCapabilities).size !== manifest.requestedCapabilities.length) {
    errors.push('requestedCapabilities must be unique');
  }

  return errors;
}
