export const CUSTOMER_ORDER_SUPPORT_INTERFACE_VERSION = 1 as const;

export interface CustomerOrderSupportEvent {
  status?: string | null;
  created_at?: string | null;
  occurred_at?: string | null;
  description?: string | null;
  location?: string | null;
}

export interface CustomerOrderSupportInput {
  order: {
    orderNumber: string;
    status: string;
    createdAt: string;
  };
  shipment: {
    status: string;
    courierName?: string | null;
    trackingNumber?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
  events: CustomerOrderSupportEvent[];
  now?: Date;
  stallAfterHours?: number;
}

export type CustomerOrderSupportState =
  | 'being_prepared'
  | 'in_transit'
  | 'delivered'
  | 'delivery_stalled'
  | 'exception'
  | 'unknown';

export interface CustomerOrderSupportAnswer {
  interfaceVersion: typeof CUSTOMER_ORDER_SUPPORT_INTERFACE_VERSION;
  state: CustomerOrderSupportState;
  answer: string;
  groundedFacts: string[];
  needsHumanEscalation: boolean;
  latestObservedAt: string | null;
  trackingNumber: string | null;
  courierName: string | null;
}

const TERMINAL_DELIVERED = new Set(['delivered', 'completed']);
const EXCEPTION_STATES = new Set(['failed', 'exception', 'returned', 'return_to_sender', 'lost', 'damaged']);
const TRANSIT_STATES = new Set(['shipped', 'dispatched', 'in transit', 'in_transit', 'out for delivery', 'out_for_delivery']);

function iso(value: string | null | undefined): string | null {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function latestEventAt(events: CustomerOrderSupportEvent[]): string | null {
  let latest: number | null = null;
  for (const event of events) {
    const value = iso(event.occurred_at) ?? iso(event.created_at);
    if (!value) continue;
    const time = Date.parse(value);
    if (latest === null || time > latest) latest = time;
  }
  return latest === null ? null : new Date(latest).toISOString();
}

/**
 * Grounded WISMO response builder. It intentionally produces deterministic
 * customer-facing text from order/shipment facts instead of allowing an LLM to
 * invent delivery promises, carrier actions or refund outcomes.
 */
export function buildCustomerOrderSupportAnswer(input: CustomerOrderSupportInput): CustomerOrderSupportAnswer {
  const now = input.now ?? new Date();
  const stallAfterHours = input.stallAfterHours ?? 48;
  if (!Number.isFinite(stallAfterHours) || stallAfterHours <= 0) throw new Error('stallAfterHours must be positive');

  const orderStatus = input.order.status.trim().toLowerCase();
  const shipmentStatus = input.shipment?.status?.trim().toLowerCase() ?? '';
  const latestObservedAt = latestEventAt(input.events)
    ?? iso(input.shipment?.updatedAt)
    ?? iso(input.shipment?.createdAt)
    ?? iso(input.order.createdAt);
  const ageHours = latestObservedAt
    ? Math.max(0, (now.getTime() - Date.parse(latestObservedAt)) / 3_600_000)
    : null;

  const groundedFacts = [
    `Order ${input.order.orderNumber} status: ${input.order.status}`,
  ];
  if (input.shipment) groundedFacts.push(`Shipment status: ${input.shipment.status}`);
  if (input.shipment?.courierName) groundedFacts.push(`Courier: ${input.shipment.courierName}`);
  if (input.shipment?.trackingNumber) groundedFacts.push(`Tracking reference: ${input.shipment.trackingNumber}`);
  if (latestObservedAt) groundedFacts.push(`Latest recorded activity: ${latestObservedAt}`);

  const base = {
    interfaceVersion: CUSTOMER_ORDER_SUPPORT_INTERFACE_VERSION,
    groundedFacts,
    latestObservedAt,
    trackingNumber: input.shipment?.trackingNumber ?? null,
    courierName: input.shipment?.courierName ?? null,
  };

  if (TERMINAL_DELIVERED.has(shipmentStatus) || TERMINAL_DELIVERED.has(orderStatus)) {
    return {
      ...base,
      state: 'delivered',
      answer: `Order ${input.order.orderNumber} is recorded as delivered.`,
      needsHumanEscalation: false,
    };
  }

  if (EXCEPTION_STATES.has(shipmentStatus)) {
    return {
      ...base,
      state: 'exception',
      answer: `Order ${input.order.orderNumber} has a delivery exception on its latest recorded shipment status. Support review is required.`,
      needsHumanEscalation: true,
    };
  }

  if (input.shipment && ageHours !== null && ageHours >= stallAfterHours && !TERMINAL_DELIVERED.has(shipmentStatus)) {
    return {
      ...base,
      state: 'delivery_stalled',
      answer: `Order ${input.order.orderNumber} has not received a recorded shipment update within the expected monitoring window. The delivery should be investigated.`,
      needsHumanEscalation: true,
    };
  }

  if (!input.shipment) {
    return {
      ...base,
      state: 'being_prepared',
      answer: `Order ${input.order.orderNumber} is recorded but does not have shipment tracking yet. It is still being prepared for dispatch.`,
      needsHumanEscalation: false,
    };
  }

  if (TRANSIT_STATES.has(shipmentStatus) || TRANSIT_STATES.has(orderStatus)) {
    return {
      ...base,
      state: 'in_transit',
      answer: `Order ${input.order.orderNumber} is in the delivery process according to the latest recorded shipment status.`,
      needsHumanEscalation: false,
    };
  }

  return {
    ...base,
    state: 'unknown',
    answer: `Order ${input.order.orderNumber} has a recorded status, but there is not enough verified tracking information to give a more specific delivery answer.`,
    needsHumanEscalation: true,
  };
}
