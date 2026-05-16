/**
 * save-admin-settings
 *
 * Persists platform_settings rows on behalf of an authenticated admin user.
 * Uses the Supabase service-role key to bypass RLS, so the admin JWT only
 * needs to be valid — no INSERT/UPDATE RLS policy is evaluated.
 *
 * Security:
 *   – Requires Authorization: Bearer <admin-jwt>
 *   – JWT is validated via admin.auth.getUser()
 *   – Caller must have app_metadata.role === 'admin' OR users.role === 'admin'
 *   – Only the three canonical keys are accepted: feature_flags,
 *     maintenance_mode, platform_config (unknown keys are rejected)
 *
 * Method: POST
 * Body:   { settings: Array<{ key: string; value: unknown }> }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';
import { getBearerToken, jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

// Only these keys may be upserted via this endpoint.
const ALLOWED_KEYS = new Set(['feature_flags', 'maintenance_mode', 'platform_config']);

async function authenticateAdmin(event: HandlerEvent) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const token = getBearerToken(event);
  if (!token) return null;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;

  const authUser = data.user;

  // JWT fast-path: app_metadata.role (set by migration 340 sync trigger)
  const jwtRole = (authUser.app_metadata as Record<string, unknown> | undefined)?.role;
  if (jwtRole === 'admin') return { admin, userId: authUser.id };

  // DB fallback: query by user ID (not email) to handle edge-cases
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (dbUser?.role === 'admin') return { admin, userId: authUser.id };
  return null;
}

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

  const auth = await authenticateAdmin(event);
  if (!auth) {
    return jsonResponse(401, { error: 'Unauthorized' }, METHODS);
  }

  let body: { settings?: Array<{ key: string; value: unknown }> } = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const { settings } = body;
  if (!Array.isArray(settings) || settings.length === 0) {
    return jsonResponse(400, { error: 'settings must be a non-empty array' }, METHODS);
  }

  // Validate all keys before writing anything
  for (const row of settings) {
    if (!ALLOWED_KEYS.has(row.key)) {
      return jsonResponse(400, { error: `Unknown settings key: ${row.key}` }, METHODS);
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const errors: string[] = [];
  for (const row of settings) {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key: row.key, value: row.value }, { onConflict: 'key' });
    if (error) errors.push(`${row.key}: ${error.message}`);
  }

  if (errors.length > 0) {
    return jsonResponse(500, { error: errors.join('; ') }, METHODS);
  }

  return jsonResponse(200, { ok: true }, METHODS);
};
