export const SHIPMENT_STALL_AUTOMATION_INTERFACE_VERSION = 1 as const;

export interface ShipmentStallInput {
  shipmentStatus: string;
  shipmentCreatedAt: string;
  shipmentUpdatedAt?: string | null;
  latestEventAt?: string | null;
  now?: Date;
  thresholdHours?: number;
}

export interface ShipmentStallDecision {
  interfaceVersion: typeof SHIPMENT_STALL_AUTOMATION_INTERFACE_VERSION;
  stalled: boolean;
  reason: string;
  latestObservedAt: string | null;
  ageHours: number | null;
  shouldCreateCarrierCase: boolean;
  shouldNotifyCustomer: boolean;
  externalMutationPerformed: false;
}

const TERMINAL = new Set(['delivered', 'completed', 'cancelled', 'canceled', 'refunded', 'returned']);

function validIso(value: string | null | undefined): string | null {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

/**
 * Detects the 48-hour no-scan condition requested by the automation plan.
 * It emits intended actions only. External carrier/customer mutations remain
 * behind the autonomous runtime policy and are never performed here.
 */
export function evaluateShipmentStall(input: ShipmentStallInput): ShipmentStallDecision {
  const thresholdHours = input.thresholdHours ?? 48;
  if (!Number.isFinite(thresholdHours) || thresholdHours <= 0 || thresholdHours > 720) {
    throw new Error('thresholdHours must be between 0 and 720');
  }

  const status = input.shipmentStatus.trim().toLowerCase();
  if (TERMINAL.has(status)) {
    return {
      interfaceVersion: SHIPMENT_STALL_AUTOMATION_INTERFACE_VERSION,
      stalled: false,
      reason: 'terminal_shipment_state',
      latestObservedAt: validIso(input.latestEventAt) ?? validIso(input.shipmentUpdatedAt) ?? validIso(input.shipmentCreatedAt),
      ageHours: null,
      shouldCreateCarrierCase: false,
      shouldNotifyCustomer: false,
      externalMutationPerformed: false,
    };
  }

  const latestObservedAt = validIso(input.latestEventAt)
    ?? validIso(input.shipmentUpdatedAt)
    ?? validIso(input.shipmentCreatedAt);
  if (!latestObservedAt) {
    return {
      interfaceVersion: SHIPMENT_STALL_AUTOMATION_INTERFACE_VERSION,
      stalled: true,
      reason: 'tracking_timestamp_unavailable',
      latestObservedAt: null,
      ageHours: null,
      shouldCreateCarrierCase: true,
      shouldNotifyCustomer: true,
      externalMutationPerformed: false,
    };
  }

  const now = input.now ?? new Date();
  const ageHours = Math.max(0, (now.getTime() - Date.parse(latestObservedAt)) / 3_600_000);
  const stalled = ageHours >= thresholdHours;
  return {
    interfaceVersion: SHIPMENT_STALL_AUTOMATION_INTERFACE_VERSION,
    stalled,
    reason: stalled ? 'shipment_scan_stalled' : 'shipment_activity_fresh',
    latestObservedAt,
    ageHours,
    shouldCreateCarrierCase: stalled,
    shouldNotifyCustomer: stalled,
    externalMutationPerformed: false,
  };
}
