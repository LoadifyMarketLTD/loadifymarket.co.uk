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

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const JSON_HEADERS = { ...corsHeaders, 'Content-Type': 'application/json' };

// Only these keys may be upserted via this endpoint.
const ALLOWED_KEYS = new Set(['feature_flags', 'maintenance_mode', 'platform_config']);

async function authenticateAdmin(event: HandlerEvent) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7).trim();
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
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const auth = await authenticateAdmin(event);
  if (!auth) {
    return {
      statusCode: 401,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  let body: { settings?: Array<{ key: string; value: unknown }> } = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { settings } = body;
  if (!Array.isArray(settings) || settings.length === 0) {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'settings must be a non-empty array' }),
    };
  }

  // Validate all keys before writing anything
  for (const row of settings) {
    if (!ALLOWED_KEYS.has(row.key)) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: `Unknown settings key: ${row.key}` }),
      };
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
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: errors.join('; ') }),
    };
  }

  return {
    statusCode: 200,
    headers: JSON_HEADERS,
    body: JSON.stringify({ ok: true }),
  };
};
