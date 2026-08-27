import type { SupplierAdapterV1 } from './supplierAdapter';
import { createAvasamAdapterV1 } from './avasamAdapter';

export type SupplierAdapterResolver = (
  providerKey: string,
  adapterVersion: string,
) => SupplierAdapterV1 | null | Promise<SupplierAdapterV1 | null>;

/**
 * Resolve only provider adapters that are actually implemented in this build and
 * whose exact adapter version matches the database-selected registration.
 * Unknown providers/versions fail closed. This function never infers capabilities
 * from a provider name or from database metadata.
 */
export const resolveBuiltInSupplierAdapterV1: SupplierAdapterResolver = async (
  providerKey,
  adapterVersion,
) => {
  const provider = providerKey.trim().toLowerCase();
  const version = adapterVersion.trim();
  if (!provider || !version) return null;

  if (provider === 'avasam') {
    const adapter = createAvasamAdapterV1();
    return adapter.adapterVersion === version ? adapter : null;
  }

  return null;
};

export async function resolveExactSupplierAdapterV1(
  resolver: SupplierAdapterResolver,
  providerKey: string,
  adapterVersion: string,
): Promise<SupplierAdapterV1 | null> {
  try {
    const adapter = await resolver(providerKey, adapterVersion);
    if (!adapter) return null;
    if (
      adapter.interfaceVersion !== 1
      || adapter.providerKey !== providerKey
      || adapter.adapterVersion !== adapterVersion
    ) return null;
    return adapter;
  } catch {
    return null;
  }
}