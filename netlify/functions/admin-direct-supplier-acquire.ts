import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { runSupplierAcquisition } from './_shared/supplierAcquisitionRuntime';

const METHODS = 'POST, OPTIONS';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: { supplierKey?: string };
  try {
    body = JSON.parse(event.body || '{}') as { supplierKey?: string };
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }
  const supplierKey = typeof body.supplierKey === 'string' ? body.supplierKey.trim().toLowerCase() : '';
  if (!supplierKey) return jsonResponse(400, { error: 'supplierKey is required' }, METHODS);

  const result = await runSupplierAcquisition({
    supabase: admin,
    supplierKey,
    trigger: 'manual',
    actorId: auth.actor.id,
  });

  if (!result.ok) {
    const blocked = result.code === 'ACQUISITION_BLOCKED';
    const validation = /INVALID|MISMATCH|NOT_PROVISIONED|REJECTED|BLOCKED/.test(result.code);
    return jsonResponse(blocked ? 409 : validation ? 400 : 502, {
      ok: false,
      error: result.error,
      code: result.code,
      blockers: result.blockers,
      runId: result.runId,
      commercialActivationPerformed: false,
      marketplaceListingPerformed: false,
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, acquisition: result }, METHODS);
};
