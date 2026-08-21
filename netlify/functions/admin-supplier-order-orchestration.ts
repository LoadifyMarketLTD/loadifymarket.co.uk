import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import {
  mutateSupplierRiskPolicy,
  readSupplierOrderOrchestrationStatus,
  type RiskPolicyInput,
} from './_shared/supplierOrderOrchestrator';

const METHODS = 'POST, OPTIONS';

type AdminAction =
  | { action: 'risk_policy'; policy: RiskPolicyInput }
  | { action: 'status'; orderId: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: AdminAction;
  try { body = JSON.parse(event.body || '{}') as AdminAction; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  if (!body || typeof body !== 'object' || Array.isArray(body) || !('action' in body)) {
    return jsonResponse(400, { error: 'A valid Phase I admin action is required' }, METHODS);
  }

  const serialized = JSON.stringify(body);
  if (/password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|card(number)?/i.test(serialized)) {
    return jsonResponse(400, { error: 'Secrets or payment credentials are not accepted in order-risk governance payloads' }, METHODS);
  }

  if (body.action === 'status') {
    if (typeof body.orderId !== 'string' || !body.orderId.trim()) return jsonResponse(400, { error: 'orderId is required' }, METHODS);
    const result = await readSupplierOrderOrchestrationStatus(admin, auth.actor.id, body.orderId.trim());
    if (!result.ok) return jsonResponse(500, { error: 'Unable to read supplier order orchestration status' }, METHODS);
    return jsonResponse(200, { ok: true, result: result.data }, METHODS);
  }

  if (body.action === 'risk_policy') {
    const p = body.policy;
    if (!p || typeof p !== 'object' || Array.isArray(p)
      || typeof p.policyKey !== 'string' || !p.policyKey.trim()
      || !Number.isInteger(p.version) || p.version <= 0
      || !['draft', 'approved'].includes(p.status)
      || !Number.isInteger(p.reviewScore) || !Number.isInteger(p.holdScore)
      || !Number.isInteger(p.restrictScore) || !Number.isInteger(p.blockScore)
      || p.reviewScore < 0 || p.blockScore > 100
      || p.reviewScore > p.holdScore || p.holdScore > p.restrictScore || p.restrictScore > p.blockScore
      || !p.evidence || typeof p.evidence !== 'object' || Array.isArray(p.evidence)) {
      return jsonResponse(400, { error: 'A complete, ordered risk policy is required' }, METHODS);
    }
    const result = await mutateSupplierRiskPolicy(admin, auth.actor.id, p);
    if (!result.ok) {
      const forbidden = /authority|admin|permission/i.test(result.error);
      const validation = /required|invalid|policy|threshold|evidence|retire|version|secret/i.test(result.error);
      return jsonResponse(forbidden ? 403 : validation ? 400 : 500, {
        error: forbidden ? 'Unauthorized' : validation ? result.error : 'Unable to update commerce risk policy',
      }, METHODS);
    }
    return jsonResponse(200, { ok: true, result: result.data }, METHODS);
  }

  return jsonResponse(400, { error: 'Unsupported Phase I admin action' }, METHODS);
};
