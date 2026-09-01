import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import {
  compareShadowProposal,
  createShadowProposal,
  isShadowAction,
  type ShadowOperatorOutcome,
} from './_shared/shadowMode';
import { evaluateShipmentStall } from './_shared/shipmentStallAutomation';

const METHODS = 'POST, OPTIONS';

interface RequestBody {
  shipmentId?: string;
  thresholdHours?: number;
  operatorOutcome?: {
    action?: string;
    status?: 'resolved' | 'unresolved';
    rationaleCode?: string | null;
  } | null;
}

function boundedThreshold(value: number | undefined): number {
  if (value === undefined) return 48;
  if (!Number.isFinite(value) || value < 1 || value > 720) return 48;
  return value;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || '{}') as RequestBody;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const shipmentId = typeof body.shipmentId === 'string' ? body.shipmentId.trim() : '';
  if (!shipmentId) return jsonResponse(400, { error: 'shipmentId is required' }, METHODS);

  let operatorOutcome: ShadowOperatorOutcome | null = null;
  if (body.operatorOutcome) {
    const action = body.operatorOutcome.action;
    const status = body.operatorOutcome.status;
    if (!isShadowAction(action) || (status !== 'resolved' && status !== 'unresolved')) {
      return jsonResponse(400, { error: 'Invalid operatorOutcome' }, METHODS);
    }
    operatorOutcome = {
      action,
      status,
      rationaleCode: body.operatorOutcome.rationaleCode ?? null,
    };
  }

  const { data: shipment, error: shipmentError } = await admin
    .from('shipments')
    .select('id, order_id, status, created_at, updated_at')
    .eq('id', shipmentId)
    .maybeSingle<{
      id: string;
      order_id: string;
      status: string;
      created_at: string;
      updated_at: string | null;
    }>();
  if (shipmentError || !shipment) return jsonResponse(404, { error: 'Shipment not found' }, METHODS);

  const { data: latestEvent } = await admin
    .from('shipment_events')
    .select('id, created_at')
    .eq('shipment_id', shipment.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; created_at: string }>();

  const thresholdHours = boundedThreshold(body.thresholdHours);
  const stallDecision = evaluateShipmentStall({
    shipmentStatus: shipment.status,
    shipmentCreatedAt: shipment.created_at,
    shipmentUpdatedAt: shipment.updated_at,
    latestEventAt: latestEvent?.created_at ?? null,
    thresholdHours,
  });

  const proposedAction = stallDecision.stalled ? 'investigate_shipment' : 'no_action';
  const secondaryRecommendations = stallDecision.stalled
    ? [
        ...(stallDecision.shouldNotifyCustomer ? ['notify_customer'] : []),
        ...(stallDecision.shouldCreateCarrierCase ? ['open_carrier_case'] : []),
      ]
    : [];

  const evidenceRefs = [
    `shipment:${shipment.id}`,
    `order:${shipment.order_id}`,
    ...(latestEvent?.id ? [`shipment-event:${latestEvent.id}`] : []),
  ];

  const proposal = createShadowProposal({
    proposalId: `shadow:shipment-stall:${shipment.id}:${stallDecision.latestObservedAt ?? 'unknown'}`,
    correlationId: `shipment:${shipment.id}`,
    capability: 'shipment_stall_review',
    proposedAction,
    rationaleCode: stallDecision.reason,
    inputFacts: {
      shipmentId: shipment.id,
      orderId: shipment.order_id,
      thresholdHours,
      stallDecision,
      secondaryRecommendations,
    },
    evidenceRefs,
    policyVersion: 'shipment-shadow-v1',
  });

  const comparison = compareShadowProposal(proposal, operatorOutcome);

  return jsonResponse(200, {
    ok: true,
    interfaceVersion: 1,
    shadowOnly: true,
    thresholdHours,
    proposal,
    comparison,
    secondaryRecommendations,
    operatorRelativeClassification: true,
    persistencePerformed: false,
    providerMutationPerformed: false,
    customerNotificationPerformed: false,
    carrierCaseCreationPerformed: false,
    customerPiiDisclosurePerformed: false,
    paymentMutationPerformed: false,
    automaticRefundExecutionPerformed: false,
  }, METHODS);
};
