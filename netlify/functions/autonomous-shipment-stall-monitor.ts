import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { resolveAutonomousSupplierCommercePolicy } from './_shared/autonomousSupplierCommercePolicy';
import { evaluateShipmentStall } from './_shared/shipmentStallAutomation';

const SCHEDULE = '43 * * * *';
const ACTIVE_SHIPMENT_STATUSES = ['Pending', 'Processing', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivery Failed'];

/**
 * Hourly 48h stall monitor. The monitor is intentionally side-effect free until
 * a verified carrier-case sink and a deduplicated transactional notification
 * sink are configured. It surfaces the exact actions that would be required.
 */
export const handler = schedule(SCHEDULE, async () => {
  const policy = resolveAutonomousSupplierCommercePolicy();
  if (!policy.enabled) {
    console.log('autonomous-shipment-stall-monitor: inert');
    return { statusCode: 200 };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('autonomous-shipment-stall-monitor: Supabase server configuration unavailable');
    return { statusCode: 200 };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: shipments, error } = await admin
    .from('shipments')
    .select('id, order_id, status, created_at, updated_at')
    .in('status', ACTIVE_SHIPMENT_STATUSES)
    .order('updated_at', { ascending: true })
    .limit(250);
  if (error) {
    console.error('autonomous-shipment-stall-monitor: unable to read active shipments');
    return { statusCode: 200 };
  }

  let stalled = 0;
  for (const shipment of shipments ?? []) {
    const { data: latestEvent } = await admin
      .from('shipment_events')
      .select('created_at')
      .eq('shipment_id', shipment.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>();

    const decision = evaluateShipmentStall({
      shipmentStatus: shipment.status,
      shipmentCreatedAt: shipment.created_at,
      shipmentUpdatedAt: shipment.updated_at,
      latestEventAt: latestEvent?.created_at ?? null,
      thresholdHours: 48,
    });
    if (!decision.stalled) continue;
    stalled += 1;

    console.warn('autonomous-shipment-stall-monitor: stalled shipment action required', {
      shipmentId: shipment.id,
      orderId: shipment.order_id,
      latestObservedAt: decision.latestObservedAt,
      ageHours: decision.ageHours,
      carrierCaseRequested: decision.shouldCreateCarrierCase,
      customerNotificationRequested: decision.shouldNotifyCustomer,
      carrierCaseExecutionEnabled: policy.carrierCaseCreationAllowed,
      customerNotificationExecutionEnabled: policy.proactiveCustomerNotificationsAllowed,
      externalMutationPerformed: false,
    });
  }

  console.log('autonomous-shipment-stall-monitor: completed', {
    scanned: shipments?.length ?? 0,
    stalled,
    externalMutationPerformed: false,
  });
  return { statusCode: 200 };
});
