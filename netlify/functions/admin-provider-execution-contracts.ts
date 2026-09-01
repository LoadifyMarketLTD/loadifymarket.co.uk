import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import {
  listProviderExecutionContracts,
  type ProviderExecutionContractProvider,
} from './_shared/providerExecutionContracts';
import { listSupplierProviderReadiness } from './_shared/supplierProviderReadiness';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'GET, OPTIONS';
const PROVIDERS = new Set<ProviderExecutionContractProvider>(['avasam', 'bigbuy', 'direct_supplier']);

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  const rawProvider = event.queryStringParameters?.provider?.trim().toLowerCase();
  if (rawProvider && !PROVIDERS.has(rawProvider as ProviderExecutionContractProvider)) {
    return jsonResponse(400, { error: 'Unsupported provider' }, METHODS);
  }

  const contracts = listProviderExecutionContracts()
    .filter(contract => !rawProvider || contract.provider === rawProvider)
    .map(contract => ({
      ...contract,
      record: {
        ...contract.record,
        // Explicitly surface the execution-sensitive fields used by the
        // autonomy gate. No credentials, provider payloads or customer data
        // exist in this contract registry.
        writeAllowed: contract.record.writeAllowed,
        piiAllowed: contract.record.piiAllowed,
        idempotencyKnown: contract.record.idempotencyKnown,
        lostResponseRecoveryKnown: contract.record.lostResponseRecoveryKnown,
      },
    }));

  return jsonResponse(200, {
    ok: true,
    interfaceVersion: 1,
    contracts,
    providerReadiness: listSupplierProviderReadiness(),
    providerWriteActivationPerformed: false,
    customerPiiDisclosurePerformed: false,
    financialMutationPerformed: false,
  }, METHODS);
};
