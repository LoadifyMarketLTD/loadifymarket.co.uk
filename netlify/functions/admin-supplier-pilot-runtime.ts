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
  type PhaseOShadowReviewEvidence,
} from './_shared/phaseOPilotAutonomyReadiness';

const METHODS = 'POST, OPTIONS';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ShadowOperatorAction = 'submit_order' | 'no_action';
type ShadowOperatorStatus = 'resolved' | 'unresolved';

interface RuntimeBody {
  action?: string;
  pilotId?: string;
  orderId?: string;
  operatorOutcome?: {
    action?: string;
    status?: string;
    rationaleCode?: string | null;
  } | null;
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

interface DurableShadowReviewShape {
  exists?: boolean;
  pilotId?: string;
  providerKey?: string;
  capability?: string;
  source?: string;
  persistenceBound?: boolean;
  evidenceRef?: string | null;
  policyVersion?: string;
  reviewedAt?: string | null;
  sampleSize?: number;
  resolvedComparisons?: number;
  operatorRelative?: boolean;
  passed?: boolean;
  passPolicyConfigured?: boolean;
  reason?: string;
  metrics?: unknown;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isShadowOperatorAction(value: unknown): value is ShadowOperatorAction {
  return value === 'submit_order' || value === 'no_action';
}

function isShadowOperatorStatus(value: unknown): value is ShadowOperatorStatus {
  return value === 'resolved' || value === 'unresolved';
}

function toDurableShadowEvidence(
  raw: unknown,
  expected: { pilotId: string; providerKey: string },
): PhaseOShadowReviewEvidence | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const review = raw as DurableShadowReviewShape;
  if (review.exists !== true) return null;
  if (text(review.pilotId) !== expected.pilotId) return null;
  if (text(review.providerKey).toLowerCase() !== expected.providerKey) return null;
  if (text(review.capability) !== PHASE_O_SHADOW_REVIEW_CAPABILITY) return null;
  if (text(review.source) !== PHASE_O_SHADOW_REVIEW_SOURCE) return null;
  if (review.persistenceBound !== true || review.operatorRelative !== true) return null;
  if (!text(review.evidenceRef) || !text(review.policyVersion) || !text(review.reviewedAt)) return null;
  if (!Number.isSafeInteger(review.sampleSize) || (review.sampleSize ?? 0) <= 0) return null;
  if (!Number.isSafeInteger(review.resolvedComparisons) || (review.resolvedComparisons ?? 0) < 0) return null;

  return {
    pilotId: expected.pilotId,
    providerKey: expected.providerKey,
    capability: PHASE_O_SHADOW_REVIEW_CAPABILITY,
    source: PHASE_O_SHADOW_REVIEW_SOURCE,
    persistenceBound: true,
    evidenceRef: text(review.evidenceRef),
    policyVersion: text(review.policyVersion),
    reviewedAt: text(review.reviewedAt),
    sampleSize: review.sampleSize as number,
    resolvedComparisons: review.resolvedComparisons as number,
    operatorRelative: true,
    passed: review.passed === true,
  };
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

  if (
    body.action !== 'activate'
    && body.action !== 'autonomous_readiness'
    && body.action !== 'shadow_observe'
  ) {
    return canonicalPilotHandler(event, context);
  }

  const pilotId = text(body.pilotId);
  if (!pilotId || !isUuid(pilotId)) return jsonResponse(400, { error: 'Valid pilotId is required' }, METHODS);

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
  const providerOrderContractReady = providerOrderExecution.found
    && providerOrderExecution.availability === 'available'
    && providerOrderExecution.externalMutationAllowed
    && providerOrderExecution.piiDisclosureAllowed;

  const shadowReviewRequiredBinding = Object.freeze({
    pilotId,
    providerKey,
    capability: PHASE_O_SHADOW_REVIEW_CAPABILITY,
    source: PHASE_O_SHADOW_REVIEW_SOURCE,
    persistenceBound: true,
  });

  if (body.action === 'shadow_observe') {
    const orderId = text(body.orderId);
    const operatorAction = body.operatorOutcome?.action;
    const operatorStatus = body.operatorOutcome?.status;
    if (!orderId || !isUuid(orderId)) return jsonResponse(400, { error: 'Valid orderId is required' }, METHODS);
    if (!isShadowOperatorAction(operatorAction) || !isShadowOperatorStatus(operatorStatus)) {
      return jsonResponse(400, { error: 'Valid operatorOutcome is required' }, METHODS);
    }

    const { data: observationId, error: observationError } = await admin.rpc(
      'server_record_supplier_pilot_shadow_observation_v1',
      {
        p_actor_id: auth.actor.id,
        p_pilot_id: pilotId,
        p_order_id: orderId,
        p_operator_action: operatorAction,
        p_operator_status: operatorStatus,
        p_operator_rationale_code: body.operatorOutcome?.rationaleCode ?? null,
        p_provider_contract_ready: providerOrderContractReady,
        p_provider_contract_reason: providerOrderExecution.reason,
      },
    );
    if (observationError) {
      return jsonResponse(409, {
        error: 'Unable to record durable Shadow observation',
        reason: 'shadow_observation_rejected',
        activationPerformed: false,
        providerMutationPerformed: false,
        customerPiiDisclosurePerformed: false,
        paymentMutationPerformed: false,
      }, METHODS);
    }

    const { data: rawShadowReview, error: shadowReviewError } = await admin.rpc(
      'server_get_supplier_pilot_shadow_review_v1',
      { p_actor_id: auth.actor.id, p_pilot_id: pilotId },
    );
    const shadowReview = shadowReviewError
      ? null
      : toDurableShadowEvidence(rawShadowReview, { pilotId, providerKey });

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
      shadowReview,
    });

    return jsonResponse(200, {
      ok: true,
      pilotId,
      providerKey,
      observationId,
      canonicalReadiness,
      shadowReview: rawShadowReview ?? null,
      shadowReviewPersistenceBound: shadowReview?.persistenceBound === true,
      shadowReviewReadAvailable: !shadowReviewError,
      shadowReviewRequiredBinding,
      autonomyReadiness,
      activationPerformed: false,
      providerMutationPerformed: false,
      customerPiiDisclosurePerformed: false,
      paymentMutationPerformed: false,
    }, METHODS);
  }

  // Deploy-before-migration remains fail-closed: if the durable reader is not
  // available yet, activation is blocked exactly as before instead of returning
  // a false readiness signal.
  const { data: rawShadowReview, error: shadowReviewError } = await admin.rpc(
    'server_get_supplier_pilot_shadow_review_v1',
    { p_actor_id: auth.actor.id, p_pilot_id: pilotId },
  );
  const shadowReview = shadowReviewError
    ? null
    : toDurableShadowEvidence(rawShadowReview, { pilotId, providerKey });

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
    shadowReview,
  });

  if (body.action === 'autonomous_readiness') {
    return jsonResponse(200, {
      ok: true,
      pilotId,
      providerKey,
      canonicalReadiness,
      shadowReview: rawShadowReview ?? null,
      autonomyReadiness,
      shadowReviewPersistenceBound: shadowReview?.persistenceBound === true,
      shadowReviewReadAvailable: !shadowReviewError,
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
      shadowReview: rawShadowReview ?? null,
      autonomyReadiness,
      shadowReviewPersistenceBound: shadowReview?.persistenceBound === true,
      shadowReviewReadAvailable: !shadowReviewError,
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
