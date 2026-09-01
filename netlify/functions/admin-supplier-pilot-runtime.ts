import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { handler as canonicalPilotHandler } from './admin-supplier-pilot';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { createProviderExecutionCapabilityRegistry } from './_shared/providerExecutionContracts';
import { jsonResponse } from './_shared/http';
import {
  PHASE_O_SHADOW_REVIEW_CAPABILITY,
  PHASE_O_SHADOW_REVIEW_SOURCE,
  evaluatePhaseOPilotAutonomyReadiness,
} from './_shared/phaseOPilotAutonomyReadiness';

const METHODS = 'POST, OPTIONS';

interface RuntimeBody {
  action?: string;
  pilotId?: string;
}

interface PilotStatusShape {
  exists?: boolean;
  pilotId?: string;
  providerKey?: string;
}

interface CanonicalReadinessShape {
  ready?: boolean;
  reason?: string;
  failures?: unknown[];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Deployable Phase O runtime boundary.
 *
 * The original admin-supplier-pilot handler remains the canonical action/RPC
 * implementation. This wrapper adds the newer Autonomous Operations gates in
 * front of activation and otherwise delegates unchanged. The SQL activation
 * function still re-runs its own canonical readiness check, so this is defense
 * in depth rather than a replacement for the database boundary.
 */
export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return canonicalPilotHandler(event, context);

  let body: RuntimeBody;
  try {
    body = JSON.parse(event.body || '{}') as RuntimeBody;
  } catch {
    return canonicalPilotHandler(event, context);
  }

  if (body.action !== 'activate' && body.action !== 'autonomous_readiness') {
    return canonicalPilotHandler(event, context);
  }

  const pilotId = text(body.pilotId);
  if (!pilotId) return jsonResponse(400, { error: 'pilotId is required' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  const { data: rawStatus, error: statusError } = await admin.rpc('server_admin_supplier_pilot_status_v1', {
    p_actor_id: auth.actor.id,
    p_pilot_id: pilotId,
  });
  if (statusError) return jsonResponse(500, { error: 'Unable to read controlled pilot status' }, METHODS);

  const status = (rawStatus && typeof rawStatus === 'object' && !Array.isArray(rawStatus))
    ? rawStatus as PilotStatusShape
    : null;
  if (!status?.exists) return jsonResponse(404, { error: 'Controlled pilot not found' }, METHODS);

  const providerKey = text(status.providerKey).toLowerCase();
  if (!providerKey) return jsonResponse(409, { error: 'Controlled pilot provider is unavailable' }, METHODS);

  const { data: rawCanonicalReadiness, error: readinessError } = await admin.rpc(
    'server_supplier_pilot_activation_readiness_v1',
    { p_pilot_id: pilotId },
  );
  if (readinessError) return jsonResponse(500, { error: 'Unable to evaluate pilot activation readiness' }, METHODS);

  const canonicalReadiness = (
    rawCanonicalReadiness
    && typeof rawCanonicalReadiness === 'object'
    && !Array.isArray(rawCanonicalReadiness)
  ) ? rawCanonicalReadiness as CanonicalReadinessShape : null;

  const capabilityRegistry = createProviderExecutionCapabilityRegistry();
  const providerOrderExecution = capabilityRegistry.resolve({
    provider: providerKey,
    capability: PHASE_O_SHADOW_REVIEW_CAPABILITY,
  });

  const shadowReviewRequiredBinding = Object.freeze({
    pilotId,
    providerKey,
    capability: PHASE_O_SHADOW_REVIEW_CAPABILITY,
    source: PHASE_O_SHADOW_REVIEW_SOURCE,
    persistenceBound: true,
  });

  const autonomyReadiness = evaluatePhaseOPilotAutonomyReadiness({
    pilotId,
    providerKey,
    canonicalReady: canonicalReadiness?.ready === true,
    providerOrderExecution: {
      registered: providerOrderExecution.found,
      availability: providerOrderExecution.availability,
      reason: providerOrderExecution.reason,
      externalMutationAllowed: providerOrderExecution.externalMutationAllowed,
      piiDisclosureAllowed: providerOrderExecution.piiDisclosureAllowed,
    },
    // Lane H remains side-effect free today. No durable server-derived reader
    // exists yet for the exact pilot + provider + order_submission tuple, so
    // activation stays fail-closed rather than accepting caller self-attestation
    // or unrelated Shadow Mode evidence such as shipment-stall evaluation.
    shadowReview: null,
  });

  if (body.action === 'autonomous_readiness') {
    return jsonResponse(200, {
      ok: true,
      pilotId,
      providerKey,
      canonicalReadiness,
      autonomyReadiness,
      shadowReviewPersistenceBound: false,
      shadowReviewRequiredBinding,
      activationPerformed: false,
      providerMutationPerformed: false,
      customerPiiDisclosurePerformed: false,
      paymentMutationPerformed: false,
    }, METHODS);
  }

  if (!autonomyReadiness.ready) {
    return jsonResponse(200, {
      ok: false,
      reason: 'autonomous_pilot_readiness_failed',
      pilotId,
      providerKey,
      canonicalReadiness,
      autonomyReadiness,
      shadowReviewPersistenceBound: false,
      shadowReviewRequiredBinding,
      activationPerformed: false,
      providerMutationPerformed: false,
      customerPiiDisclosurePerformed: false,
      paymentMutationPerformed: false,
    }, METHODS);
  }

  // Canonical SQL activation re-validates server_supplier_pilot_activation_readiness_v1.
  return canonicalPilotHandler(event, context);
};
