/**
 * save-admin-settings
 *
 * Persists platform_settings rows on behalf of an authenticated active admin.
 * Uses the Supabase service-role key to bypass RLS, so the server boundary must
 * re-read live account state before any write.
 *
 * Security:
 *   – Requires Authorization: Bearer <admin-jwt>
 *   – JWT is validated via admin.auth.getUser()
 *   – public.users must still exist with role=admin and isActive=true
 *   – stale app_metadata claims are never sufficient
 *   – Only the three canonical settings contracts are accepted
 *
 * Method: POST
 * Body:   { settings: Array<{ key: string; value: unknown }> }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { jsonResponse, optionsResponse } from './_shared/http';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { isValidAdminSettingsBatch } from './_shared/adminSettingsContract';

const METHODS = 'POST, OPTIONS';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse(METHODS);
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) {
    return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);
  }

  let body: { settings?: unknown } = {};
  try {
    body = JSON.parse(event.body || '{}') as { settings?: unknown };
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  if (!isValidAdminSettingsBatch(body.settings)) {
    return jsonResponse(400, { error: 'Invalid settings payload' }, METHODS);
  }

  const errors: string[] = [];
  for (const row of body.settings) {
    const { error } = await admin
      .from('platform_settings')
      .upsert({ key: row.key, value: row.value }, { onConflict: 'key' });
    if (error) errors.push(`${row.key}: ${error.message}`);
  }

  if (errors.length > 0) {
    return jsonResponse(500, { error: errors.join('; ') }, METHODS);
  }

  return jsonResponse(200, { ok: true }, METHODS);
};
