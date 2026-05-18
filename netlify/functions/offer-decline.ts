import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface RequestBody {
  offerId?: string;
}

interface OfferActionRpcResult {
  ok: boolean;
  offerId: string;
  status: string;
  orderId: string | null;
  alreadyDone: boolean;
}

function jsonResponse(statusCode: number, payload: Record<string, unknown>) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function getServerConfig():
  | { supabaseUrl: string; serviceRoleKey: string }
  | { errorResponse: { statusCode: number; headers: Record<string, string>; body: string } } {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return { errorResponse: jsonResponse(500, { error: 'Server misconfiguration', details: 'Missing Supabase environment variables' }) };
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:') {
      return { errorResponse: jsonResponse(500, { error: 'Server misconfiguration', details: 'SUPABASE_URL must use https' }) };
    }
  } catch {
    return { errorResponse: jsonResponse(500, { error: 'Server misconfiguration', details: 'SUPABASE_URL is invalid' }) };
  }

  if (serviceRoleKey.length < 20 || /\s/.test(serviceRoleKey)) {
    return { errorResponse: jsonResponse(500, { error: 'Server misconfiguration', details: 'SUPABASE_SERVICE_ROLE_KEY is invalid' }) };
  }

  return { supabaseUrl, serviceRoleKey };
}

function normalizeRpcResult(value: unknown, fallbackOfferId: string): OfferActionRpcResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    candidate.ok === true
    && typeof candidate.offerId === 'string'
    && typeof candidate.status === 'string'
    && (candidate.orderId === null || typeof candidate.orderId === 'string')
    && typeof candidate.alreadyDone === 'boolean'
  ) {
    return {
      ok: true,
      offerId: candidate.offerId,
      status: candidate.status,
      orderId: candidate.orderId,
      alreadyDone: candidate.alreadyDone,
    };
  }

  if (
    typeof candidate.already_done === 'boolean'
    && (candidate.order_id === null || candidate.order_id === undefined || typeof candidate.order_id === 'string')
  ) {
    return {
      ok: true,
      offerId: typeof candidate.offer_id === 'string' ? candidate.offer_id : fallbackOfferId,
      status: typeof candidate.status === 'string' ? candidate.status : 'declined',
      orderId: candidate.order_id === undefined ? null : candidate.order_id,
      alreadyDone: candidate.already_done,
    };
  }

  return null;
}

function mapRpcErrorStatus(message: string, code?: string | null): number {
  if (message.includes('offer_not_found') || message.includes('conversation_not_found')) return 404;
  if (message.includes('not_authorized') || message.includes('not_participant')) return 403;
  if (
    message.includes('offer_not_actionable')
    || message.includes('offer_not_pending')
    || message.includes('offer_expired')
    // PostgreSQL integrity-constraint violations (23xxx)
    || (typeof code === 'string' && code.startsWith('23'))
  ) return 409;
  return 500;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    const config = getServerConfig();
    if ('errorResponse' in config) {
      return config.errorResponse;
    }

    const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = event.headers.authorization ?? event.headers.Authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Authentication required', details: 'Missing bearer token' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return jsonResponse(401, { error: 'Authentication required', details: 'Empty bearer token' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('offer-decline auth error:', authError?.message ?? 'no user');
      return jsonResponse(401, { error: 'Invalid authentication token', details: authError?.message ?? 'Token verification failed' });
    }

    let body: RequestBody;
    try {
      body = JSON.parse(event.body ?? '{}') as RequestBody;
    } catch {
      return jsonResponse(400, { error: 'Invalid request body', details: 'Body must be valid JSON' });
    }

    const offerId = typeof body.offerId === 'string' ? body.offerId.trim() : '';
    if (!offerId) {
      return jsonResponse(400, { error: 'Invalid request body', details: 'offerId is required' });
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('decline_offer', {
      p_offer_id: offerId,
      p_actor_id: user.id,
    });

    if (rpcError) {
      const safeDetails = `${rpcError.code ?? 'rpc_error'}: ${rpcError.message ?? 'Unknown RPC error'}`;
      console.error('offer-decline RPC error:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        offerId,
        actorId: user.id,
      });
      return jsonResponse(mapRpcErrorStatus(rpcError.message ?? '', rpcError.code), {
        error: 'Failed to decline offer',
        details: safeDetails,
      });
    }

    const normalized = normalizeRpcResult(rpcData, offerId);
    if (!normalized) {
      console.error('offer-decline invalid RPC payload:', rpcData);
      return jsonResponse(500, {
        error: 'Failed to decline offer',
        details: 'RPC returned invalid payload shape',
      });
    }

    return jsonResponse(200, {
      ok: normalized.ok,
      offerId: normalized.offerId,
      status: normalized.status,
      orderId: normalized.orderId,
      alreadyDone: normalized.alreadyDone,
    });
  } catch (error) {
    console.error('offer-decline unhandled error:', error);
    return jsonResponse(500, {
      error: 'Failed to decline offer',
      details: error instanceof Error ? error.message : 'Unhandled server error',
    });
  }
};
