import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupplierAdapterCapability } from './supplierAdapter';

export type SupplierIntegrationTransport =
  | 'http_rest'
  | 'graphql'
  | 'feed_url'
  | 'sftp'
  | 'ftps'
  | 'ftp'
  | 'webhook'
  | 'email'
  | 'manual_portal'
  | 'manual_file';

export type SupplierIntegrationExecutionMode =
  | 'manual_only'
  | 'automated_read'
  | 'automated_write';

export interface SupplierIntegrationBinding {
  capability: SupplierAdapterCapability;
  transport: SupplierIntegrationTransport;
  executionMode: SupplierIntegrationExecutionMode;
  configRef?: string;
  mapping: Record<string, unknown>;
  contractRef?: string;
  status: 'verified';
}

export interface SupplierIntegrationRuntime {
  supplierId: string;
  supplierKey: string;
  territory: string;
  bindings: Map<SupplierAdapterCapability, SupplierIntegrationBinding>;
}

const CAPABILITIES = new Set<SupplierAdapterCapability>([
  'supplier_identity','catalog','variants','stock','price','shipping',
  'order_submission','acknowledgement','tracking','cancellation','returns','reimbursement',
]);

const TRANSPORTS = new Set<SupplierIntegrationTransport>([
  'http_rest','graphql','feed_url','sftp','ftps','ftp','webhook','email','manual_portal','manual_file',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseBinding(value: unknown): SupplierIntegrationBinding | null {
  if (!isRecord(value)) return null;
  const capability = typeof value.capability === 'string' ? value.capability : '';
  const transport = typeof value.transport === 'string' ? value.transport : '';
  const executionMode = typeof value.executionMode === 'string' ? value.executionMode : '';
  const status = typeof value.status === 'string' ? value.status : '';
  if (!CAPABILITIES.has(capability as SupplierAdapterCapability)) return null;
  if (!TRANSPORTS.has(transport as SupplierIntegrationTransport)) return null;
  if (!['manual_only','automated_read','automated_write'].includes(executionMode)) return null;
  if (status !== 'verified') return null;
  const mapping = isRecord(value.mapping) ? value.mapping : {};
  return {
    capability: capability as SupplierAdapterCapability,
    transport: transport as SupplierIntegrationTransport,
    executionMode: executionMode as SupplierIntegrationExecutionMode,
    configRef: typeof value.configRef === 'string' && value.configRef.trim() ? value.configRef.trim() : undefined,
    mapping,
    contractRef: typeof value.contractRef === 'string' && value.contractRef.trim() ? value.contractRef.trim() : undefined,
    status: 'verified',
  };
}

export async function loadSupplierIntegrationRuntime(
  client: SupabaseClient,
  supplierId: string,
  territory = 'GB',
): Promise<SupplierIntegrationRuntime | null> {
  const { data, error } = await client.rpc('server_supplier_integration_runtime_v1', {
    p_supplier_id: supplierId,
    p_territory: territory,
  });
  if (error || !isRecord(data) || data.eligible !== true) return null;
  const supplierKey = typeof data.supplierKey === 'string' ? data.supplierKey.trim() : '';
  const runtimeSupplierId = typeof data.supplierId === 'string' ? data.supplierId.trim() : '';
  const runtimeTerritory = typeof data.territory === 'string' ? data.territory.trim().toUpperCase() : '';
  if (!supplierKey || !runtimeSupplierId || !/^[A-Z]{2}$/.test(runtimeTerritory)) return null;
  const parsed = Array.isArray(data.profiles) ? data.profiles.map(parseBinding).filter(Boolean) as SupplierIntegrationBinding[] : [];
  return {
    supplierId: runtimeSupplierId,
    supplierKey,
    territory: runtimeTerritory,
    bindings: new Map(parsed.map(binding => [binding.capability, binding])),
  };
}
