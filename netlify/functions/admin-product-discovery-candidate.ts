import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { previewOperatorProductUrl } from './_shared/operatorProductUrlPreview';

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

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!url || url.length > 2048 || note.length > 2000) {
    return jsonResponse(400, { error: 'Valid URL and optional note are required' }, METHODS);
  }

  let preview;
  try {
    preview = await previewOperatorProductUrl(url);
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : 'Product source preview failed',
    }, METHODS);
  }

  if (
    preview.governance.candidateOnly !== true
    || preview.governance.marketplaceListingAllowed !== false
    || preview.governance.commercialActivationAllowed !== false
    || preview.governance.supplierIdentityRequired !== true
  ) {
    return jsonResponse(409, { error: 'Product discovery governance boundary is invalid' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_save_product_discovery_candidate_v1', {
    p_actor_id: auth.actor.id,
    p_source_url: preview.requestedUrl,
    p_final_url: preview.finalUrl,
    p_source_host: preview.sourceHost,
    p_source_digest: preview.sourceDigest,
    p_source_type: preview.sourceType,
    p_observed_at: preview.observedAt,
    p_facts_snapshot: preview.facts,
    p_operator_note: note,
  });

  if (error) {
    console.error('admin-product-discovery-candidate: save failed:', error);
    return jsonResponse(500, { error: 'Unable to save discovery candidate' }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    candidate: data,
    preview,
    supplierCreated: false,
    canonicalProductCreated: false,
    marketplaceListingCreated: false,
    commercialActivationPerformed: false,
  }, METHODS);
};
