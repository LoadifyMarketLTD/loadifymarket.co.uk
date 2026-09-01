import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import {
  buildCustomerOperationsExceptionQueue,
  createShipmentStallException,
} from './_shared/customerOperationsExceptionQueue';
import { evaluateCustomerNotificationPolicy } from './_shared/customerNotificationPolicy';
import { evaluateShipmentStall } from './_shared/shipmentStallAutomation';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'GET, OPTIONS';
const ACTIVE_SHIPMENT_STATUSES = ['Pending', 'Processing', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivery Failed'];
const MAX_SHIPMENTS = 250;

function boundedThreshold(value: string | undefined): number {
  if (!value) return 48;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 720) return 48;
  return parsed;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  const thresholdHours = boundedThreshold(event.queryStringParameters?.thresholdHours);
  const { data: shipments, error } = await admin
    .from('shipments')
    .select('id, order_id, status, created_at, updated_at')
    .in('status', ACTIVE_SHIPMENT_STATUSES)
    .order('updated_at', { ascending: true })
    .limit(MAX_SHIPMENTS);
  if (error) return jsonResponse(500, { error: 'Unable to read active shipments' }, METHODS);

  const queueCandidates = [];
  const notifications = [];

  for (const shipment of shipments ?? []) {
    const { data: latestEvent } = await admin
      .from('shipment_events')
      .select('id, created_at')
      .eq('shipment_id', shipment.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; created_at: string }>();

    const decision = evaluateShipmentStall({
      shipmentStatus: shipment.status,
      shipmentCreatedAt: shipment.created_at,
      shipmentUpdatedAt: shipment.updated_at,
      latestEventAt: latestEvent?.created_at ?? null,
      thresholdHours,
    });
    if (!decision.stalled) continue;

    const exception = createShipmentStallException({
      exceptionId: `shipment-stall:${shipment.id}:${decision.latestObservedAt ?? 'unknown'}`,
      correlationId: `shipment:${shipment.id}`,
      shipmentId: shipment.id,
      orderId: shipment.order_id,
      decision,
      evidenceRefs: [
        `shipment:${shipment.id}`,
        `order:${shipment.order_id}`,
        ...(latestEvent?.id ? [`shipment-event:${latestEvent.id}`] : []),
      ],
    });
    queueCandidates.push(exception);

    const observedAt = decision.latestObservedAt ?? shipment.updated_at ?? shipment.created_at;
    notifications.push({
      shipmentId: shipment.id,
      orderId: shipment.order_id,
      recommendation: evaluateCustomerNotificationPolicy({
        source: 'shipment_stall',
        entityRef: shipment.id,
        state: 'delivery_stalled',
        observedAt,
        materialChange: true,
        templateKey: 'shipment_stalled_v1',
        facts: decision,
        // No transactional notification channel is certified by this lane.
        // The recommendation therefore remains human-review-only until a
        // separately verified sender/channel capability is introduced.
        channels: {},
      }),
    });
  }

  const queue = buildCustomerOperationsExceptionQueue(queueCandidates);
  return jsonResponse(200, {
    ok: true,
    interfaceVersion: 1,
    thresholdHours,
    scannedShipments: shipments?.length ?? 0,
    exceptionCount: queue.length,
    queue,
    notifications,
    externalNotificationPerformed: false,
    carrierCaseCreationPerformed: false,
    paymentMutationPerformed: false,
  }, METHODS);
};
