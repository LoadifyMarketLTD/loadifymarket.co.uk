import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { upsertDirectSupplierFoundationCandidate } from './_shared/directSupplierFoundationCandidate';
import {
  DIRECT_SUPPLIER_MAX_ONBOARDING_BODY_BYTES,
  parseDirectSupplierOnboardingManifest,
} from './_shared/directSupplierOnboarding';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

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

  const rawBody = event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > DIRECT_SUPPLIER_MAX_ONBOARDING_BODY_BYTES) {
    return jsonResponse(413, { error: 'Direct Supplier onboarding manifest is too large' }, METHODS);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody || 'null') as unknown;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const parsed = parseDirectSupplierOnboardingManifest(parsedBody);
  if (!parsed.ok) {
    return jsonResponse(400, {
      error: 'Invalid Direct Supplier onboarding manifest',
      details: parsed.errors,
    }, METHODS);
  }

  const result = await upsertDirectSupplierFoundationCandidate({
    client: admin,
    actorId: auth.actor.id,
    manifest: parsed.manifest,
  });

  if (!result.ok) {
    const validation = /invalid|required|manifest|identity|verification lifecycle|not found|banned/i.test(result.error);
    console.error('admin-direct-supplier-foundation-candidate: candidate upsert failed:', result.error);
    return jsonResponse(validation ? 400 : 500, {
      error: validation ? result.error : 'Unable to create Direct Supplier Foundation candidate',
    }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    candidate: result.candidate,
  }, METHODS);
};
