import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface RequestBody {
  offerId?: string;
}

interface OfferRow {
  id: string;
  status: string;
  recipientId: string;
}

interface OfferActionRpcResult {
  ok: boolean;
  offerId: string;
  status: string;
  orderId: string | null;
  alreadyDone: boolean;
}

interface RpcErrorDebugPayload {
  offerId: string;
  actorId: string;
  payload: RequestBody;
  rpcErrorCode: string | null;
  rpcErrorMessage: string | null;
  rpcErrorDetails: string | null;
  rpcErrorHint: string | null;
  stack: string;
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

function isOfferAcceptDebugEnabled(): boolean {
  const raw = (process.env.OFFER_ACCEPT_DEBUG ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function isBypassRpcEnabled(): boolean {
  const raw = (process.env.OFFER_ACCEPT_BYPASS_RPC ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
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

  const legacyOrderId = candidate.order_id;
  const legacyAlreadyDone = candidate.already_done;
  if (typeof legacyAlreadyDone === 'boolean' && (legacyOrderId === null || typeof legacyOrderId === 'string')) {
    return {
      ok: true,
      offerId: fallbackOfferId,
      status: 'accepted',
      orderId: legacyOrderId,
      alreadyDone: legacyAlreadyDone,
    };
  }

  return null;
}

function mapRpcErrorStatus(message: string, code?: string | null): number {
  if (message.includes('offer_not_found') || message.includes('listing_not_found') || message.includes('conversation_not_found')) return 404;
  if (message.includes('not_authorized') || message.includes('not_participant')) return 403;
  if (
    message.includes('offer_not_actionable')
    || message.includes('offer_not_pending')
    || message.includes('listing_not_available')
    || message.includes('offer_expired')
    || message.includes('invalid_offer_participants')
    // PostgreSQL integrity-constraint violations (23xxx): duplicate order,
    // unique-index violation on one_active_order_per_listing, etc.
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
      console.error('offer-accept auth error:', authError?.message ?? 'no user');
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

    const rpcPayload = {
      p_offer_id: offerId,
      p_actor_id: user.id,
    };
    const debugEnabled = isOfferAcceptDebugEnabled();

    // ── DIAGNOSTIC BYPASS ──────────────────────────────────────────────────
    // Set OFFER_ACCEPT_BYPASS_RPC=true in Netlify env vars to skip the RPC
    // and perform a direct table update instead. If this succeeds where the
    // RPC fails, the accept_offer() function itself is the broken component.
    if (isBypassRpcEnabled()) {
      console.log('offer-accept: BYPASS mode active — skipping accept_offer() RPC');

      const { data: offerRow, error: fetchErr } = await supabase
        .from('offers')
        .select('id, status, "recipientId"')
        .eq('id', offerId)
        .single<OfferRow>();

      if (fetchErr || !offerRow) {
        console.error('offer-accept bypass: fetch offer failed', fetchErr);
        return jsonResponse(404, {
          error: 'Offer not found',
          details: fetchErr?.message ?? 'No row returned',
          _bypass: true,
        });
      }

      if (offerRow.recipientId !== user.id) {
        console.error('offer-accept bypass: actor is not recipient', { actor: user.id, recipient: offerRow.recipientId });
        return jsonResponse(403, {
          error: 'Not authorized — actor is not the offer recipient',
          _bypass: true,
        });
      }

      if (offerRow.status === 'accepted') {
        return jsonResponse(200, {
          ok: true,
          offerId,
          status: 'accepted',
          orderId: null,
          alreadyDone: true,
          _bypass: true,
        });
      }

      if (offerRow.status !== 'pending') {
        return jsonResponse(409, {
          error: 'Offer is not actionable',
          details: `current status: ${offerRow.status}`,
          _bypass: true,
        });
      }

      const { error: updateErr } = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offerId)
        .eq('status', 'pending');

      if (updateErr) {
        console.error('offer-accept bypass: direct update failed', {
          code: updateErr.code,
          message: updateErr.message,
          details: updateErr.details,
          hint: updateErr.hint,
          offerId,
          actorId: user.id,
        });
        return jsonResponse(500, {
          error: 'Direct update failed — RPC is not the cause',
          details: `${updateErr.code ?? 'update_error'}: ${updateErr.message}`,
          hint: updateErr.hint ?? null,
          _bypass: true,
        });
      }

      console.log('offer-accept bypass: direct update succeeded — RPC is likely the broken component');
      return jsonResponse(200, {
        ok: true,
        offerId,
        status: 'accepted',
        orderId: null,
        alreadyDone: false,
        _bypass: true,
      });
    }
    // ── END BYPASS ──────────────────────────────────────────────────────────

    if (debugEnabled) {
      console.log('offer-accept debug request:', {
        payload: { offerId },
        user: { id: user.id },
        rpcPayload,
      });
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('accept_offer', rpcPayload);
    if (debugEnabled) {
      console.log('offer-accept debug rpc result:', {
        payload: { offerId },
        user: { id: user.id },
        rpcData,
        rpcError,
        rpcErrorCode: rpcError?.code ?? null,
        rpcErrorDetails: rpcError?.details ?? null,
        rpcErrorHint: rpcError?.hint ?? null,
        stack: new Error('offer-accept rpc trace').stack ?? 'stack_unavailable',
      });
    }

    if (rpcError) {
      const safeDetails = `${rpcError.code ?? 'rpc_error'}: ${rpcError.message ?? 'Unknown RPC error'}`;
      const debugPayload: RpcErrorDebugPayload = {
        offerId,
        actorId: user.id,
        payload: { offerId },
        rpcErrorCode: rpcError.code ?? null,
        rpcErrorMessage: rpcError.message ?? null,
        rpcErrorDetails: rpcError.details ?? null,
        rpcErrorHint: rpcError.hint ?? null,
        stack: new Error('offer-accept rpc failure').stack ?? 'stack_unavailable',
      };
      console.error('offer-accept RPC error:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        offerId,
        actorId: user.id,
        payload: rpcPayload,
        stack: debugPayload.stack,
      });
      return jsonResponse(mapRpcErrorStatus(rpcError.message ?? '', rpcError.code), {
        error: 'Failed to accept offer',
        details: safeDetails,
        ...(debugEnabled ? { debug: debugPayload } : {}),
      });
    }

    const normalized = normalizeRpcResult(rpcData, offerId);
    if (!normalized) {
      console.error('offer-accept invalid RPC payload:', rpcData);
      return jsonResponse(500, {
        error: 'Failed to accept offer',
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
    const stack = error instanceof Error ? error.stack ?? 'stack_unavailable' : 'stack_unavailable';
    console.error('offer-accept unhandled error:', error, stack);
    return jsonResponse(500, {
      error: 'Failed to accept offer',
      details: error instanceof Error ? error.message : 'Unhandled server error',
      ...(isOfferAcceptDebugEnabled()
        ? {
            debug: {
              stack,
            },
          }
        : {}),
    });
  }
};
