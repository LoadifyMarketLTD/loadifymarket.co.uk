import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { readDirectSupplierStagingReview } from './_shared/directSupplierStagingReview';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'GET, OPTIONS';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  const supplierKey = event.queryStringParameters?.supplierKey?.trim() || '';
  const sourceBatchDigest = event.queryStringParameters?.sourceBatchDigest?.trim() || '';
  if (!supplierKey || !sourceBatchDigest) {
    return jsonResponse(400, { error: 'supplierKey and sourceBatchDigest are required' }, METHODS);
  }

  const result = await readDirectSupplierStagingReview(admin, { supplierKey, sourceBatchDigest });
  if (!result.ok) {
    if (result.kind === 'validation') return jsonResponse(400, { error: result.error }, METHODS);
    if (result.kind === 'not_found') return jsonResponse(404, { error: result.error }, METHODS);
    console.error('admin-direct-supplier-staging-review: read failed:', result.error);
    return jsonResponse(500, { error: 'Unable to read Direct Supplier staging review' }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    reviewPackage: result.reviewPackage,
  }, METHODS);
};
