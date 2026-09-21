import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { listSupplierSourcePolicies } from './_shared/supplierSourcePolicy';

const METHODS = 'GET, OPTIONS';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  return jsonResponse(200, {
    ok: true,
    policyVersion: 1,
    channels: listSupplierSourcePolicies(),
    guarantees: {
      providerNeutral: true,
      noWarehouseAssumption: true,
      discoveryCannotPublishDirectly: true,
      supplierAuthorityRequiredBeforeCommerce: true,
      buyerPublicationSeparatelyGoverned: true,
    },
  }, METHODS);
};
