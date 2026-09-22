import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupplierAdapterV1 } from './supplierAdapter';
import { createSupplierProviderAdapter, type SupplierProviderKey } from './supplierProviderRegistry';
import { loadSupplierIntegrationRuntime } from './supplierIntegrationRuntime';
import { UniversalDirectSupplierAdapterV1 } from './universalDirectSupplierAdapter';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export async function createRuntimeSupplierAdapter(input: {
  client: SupabaseClient;
  providerKey: SupplierProviderKey;
  supplierOfferId: string;
}): Promise<SupplierAdapterV1> {
  if (input.providerKey !== 'direct_supplier') {
    return createSupplierProviderAdapter(input.providerKey);
  }

  const { data, error } = await input.client.rpc('server_supplier_offer_integration_context_v1', {
    p_supplier_offer_id: input.supplierOfferId,
  });
  if (error || !isRecord(data) || data.eligible !== true) {
    return createSupplierProviderAdapter('direct_supplier');
  }

  const supplierId = typeof data.supplierId === 'string' ? data.supplierId.trim() : '';
  const territory = typeof data.territory === 'string' ? data.territory.trim().toUpperCase() : 'GB';
  if (!supplierId) return createSupplierProviderAdapter('direct_supplier');

  const runtime = await loadSupplierIntegrationRuntime(input.client, supplierId, territory);
  if (!runtime) return createSupplierProviderAdapter('direct_supplier');

  return new UniversalDirectSupplierAdapterV1(runtime);
}
