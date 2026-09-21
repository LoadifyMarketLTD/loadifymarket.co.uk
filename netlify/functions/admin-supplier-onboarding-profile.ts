import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { mutateSupplierOnboardingProfile } from './_shared/supplierOnboardingProfile';

const METHODS = 'POST, OPTIONS';
const ACTIONS = new Set(['get', 'upsert']);

interface Body {
  action?: string;
  payload?: Record<string, unknown>;
}

const FORBIDDEN_KEYS = /^(password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|credential|card(number)?)$/i;

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, child]) => FORBIDDEN_KEYS.test(key) || containsForbiddenKey(child),
  );
}

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

  let body: Body;
  try {
    body = JSON.parse(event.body || '{}') as Body;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const payload = body.payload;
  if (!ACTIONS.has(action) || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse(400, { error: 'A supported action and object payload are required' }, METHODS);
  }

  if (containsForbiddenKey(payload)) {
    return jsonResponse(400, { error: 'Secrets, credentials and payment data are not accepted in supplier onboarding profiles' }, METHODS);
  }
  const result = await mutateSupplierOnboardingProfile(
    admin,
    auth.actor.id,
    action as 'get' | 'upsert',
    payload,
  );

  if (!result.ok) {
    const validation = /required|invalid|unsupported|must|not found|approval/i.test(result.error);
    const forbidden = /authority|permission/i.test(result.error);
    console.error('admin-supplier-onboarding-profile: mutation failed:', result.error);
    return jsonResponse(validation ? 400 : forbidden ? 403 : 500, {
      error: validation ? result.error : forbidden ? 'Unauthorized' : 'Unable to update supplier onboarding profile',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, result: result.data }, METHODS);
};
