import type {
  SupplierAdapterContext,
  SupplierAdapterResult,
  SupplierAdapterV1,
  SupplierOrderAcknowledgement,
  SupplierOrderRequest,
  SupplierPriceSnapshot,
  SupplierStockSnapshot,
  SupplierTrackingEvent,
} from './supplierAdapter';

export const SUPPLIER_SIMULATOR_INTERFACE_VERSION = 1 as const;

export type SupplierSimulatorScenario =
  | 'happy_path'
  | 'stock_zero'
  | 'price_change'
  | 'timeout'
  | 'provider_500'
  | 'duplicate_acknowledgement'
  | 'lost_response_after_accept'
  | 'partial_fulfilment'
  | 'tracking'
  | 'dispatch'
  | 'delivery'
  | 'lost_shipment'
  | 'cancellation'
  | 'return'
  | 'refund'
  | 'reimbursement';

export interface SupplierSimulatorOptions {
  scenario: SupplierSimulatorScenario;
  providerKey?: string;
  supplierOrderRef?: string;
  externalVariantRef?: string;
  basePriceMinor?: number;
  currency?: string;
  now?: () => string;
}

export interface SupplierSimulatorDiagnostics {
  scenario: SupplierSimulatorScenario;
  submitCalls: number;
  recoveryLookupCalls: number;
  acknowledgementCalls: number;
  trackingCalls: number;
  cancellationCalls: number;
  returnCalls: number;
  reimbursementCalls: number;
  acceptedIdempotencyKeys: string[];
  customerRefundRequired: boolean;
  partialFulfilment: boolean;
}

const ok = <T>(data: T, externalRef?: string): SupplierAdapterResult<T> => ({ ok: true, data, externalRef });
const fail = <T>(errorClass: 'AUTH_CONFIGURATION_FAILURE' | 'RATE_LIMITED' | 'RETRYABLE_FAILURE' | 'PERMANENT_REJECTION' | 'UNKNOWN_OUTCOME' | 'MALFORMED_RESPONSE' | 'CAPABILITY_UNAVAILABLE', message: string): SupplierAdapterResult<T> => ({ ok: false, errorClass, message });

const requestFingerprint = (input: SupplierOrderRequest): string => JSON.stringify({
  externalOfferRef: input.externalOfferRef,
  quantity: input.quantity,
  shippingServiceRef: input.shippingServiceRef ?? null,
  destinationCountry: input.destinationCountry,
});

/**
 * Deterministic non-production SupplierAdapterV1 used by Phase N.
 * It never calls a supplier, payment processor, carrier or production webhook.
 * Lost-response scenarios persist simulated acceptance by idempotency key so
 * recovery is query-before-retry with the exact submit key.
 */
export function createSupplierSimulator(options: SupplierSimulatorOptions): SupplierAdapterV1 & { diagnostics(): SupplierSimulatorDiagnostics } {
  const now = options.now ?? (() => '2026-08-21T12:00:00.000Z');
  const providerKey = options.providerKey ?? 'loadify-supplier-simulator';
  const supplierOrderRef = options.supplierOrderRef ?? 'SIM-ORDER-1';
  const externalVariantRef = options.externalVariantRef ?? 'SIM-VARIANT-1';
  const currency = options.currency ?? 'GBP';
  const basePriceMinor = options.basePriceMinor ?? 1000;
  const acceptedByKey = new Map<string, { fingerprint: string; acknowledgement: SupplierOrderAcknowledgement }>();
  let submitCalls = 0;
  let recoveryLookupCalls = 0;
  let acknowledgementCalls = 0;
  let trackingCalls = 0;
  let cancellationCalls = 0;
  let returnCalls = 0;
  let reimbursementCalls = 0;

  const acceptedAcknowledgement = (): SupplierOrderAcknowledgement => ({
    supplierOrderRef,
    state: 'accepted',
    acknowledgedAt: now(),
  });

  const adapter: SupplierAdapterV1 & { diagnostics(): SupplierSimulatorDiagnostics } = {
    interfaceVersion: 1,
    providerKey,
    adapterVersion: 'phase-n-simulator-v1',
    capabilities: ['stock', 'price', 'shipping', 'order_submission', 'acknowledgement', 'tracking', 'cancellation', 'returns', 'reimbursement'],

    async getStock(_context: SupplierAdapterContext, refs: string[]): Promise<SupplierAdapterResult<SupplierStockSnapshot[]>> {
      if (options.scenario === 'timeout') return fail('RETRYABLE_FAILURE', 'simulated supplier timeout');
      if (options.scenario === 'provider_500') return fail('RETRYABLE_FAILURE', 'simulated provider 500');
      return ok(refs.map((ref) => ({
        externalVariantRef: ref,
        quantity: options.scenario === 'stock_zero' ? 0 : options.scenario === 'partial_fulfilment' ? 1 : 25,
        availability: options.scenario === 'stock_zero' ? 'out_of_stock' : options.scenario === 'partial_fulfilment' ? 'limited' : 'in_stock',
        observedAt: now(),
      })));
    },

    async getPrices(_context: SupplierAdapterContext, refs: string[]): Promise<SupplierAdapterResult<SupplierPriceSnapshot[]>> {
      if (options.scenario === 'timeout') return fail('RETRYABLE_FAILURE', 'simulated supplier timeout');
      if (options.scenario === 'provider_500') return fail('RETRYABLE_FAILURE', 'simulated provider 500');
      return ok(refs.map((ref) => ({ externalVariantRef: ref, amountMinor: options.scenario === 'price_change' ? basePriceMinor + 500 : basePriceMinor, currency, observedAt: now() })));
    },

    async submitOrder(context: SupplierAdapterContext, input: SupplierOrderRequest): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>> {
      submitCalls += 1;
      const fingerprint = requestFingerprint(input);
      const existing = acceptedByKey.get(context.idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint) return fail('PERMANENT_REJECTION', 'simulator idempotency collision');
        return ok(existing.acknowledgement, supplierOrderRef);
      }
      if (options.scenario === 'timeout') return fail('UNKNOWN_OUTCOME', 'simulated timeout with unknown outcome');
      if (options.scenario === 'provider_500') return fail('RETRYABLE_FAILURE', 'simulated provider 500');
      if (options.scenario === 'stock_zero') return fail('PERMANENT_REJECTION', 'simulated stock unavailable');

      const acknowledgement = acceptedAcknowledgement();
      acceptedByKey.set(context.idempotencyKey, { fingerprint, acknowledgement });
      if (options.scenario === 'lost_response_after_accept') {
        return fail('UNKNOWN_OUTCOME', 'simulated response lost after supplier accepted');
      }
      return ok(acknowledgement, supplierOrderRef);
    },

    async findOrderByIdempotencyKey(context: SupplierAdapterContext): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>> {
      recoveryLookupCalls += 1;
      const existing = acceptedByKey.get(context.idempotencyKey);
      return existing ? ok(existing.acknowledgement, supplierOrderRef) : fail('UNKNOWN_OUTCOME', 'simulated order not found by idempotency key');
    },

    async getOrderAcknowledgement(_context: SupplierAdapterContext, ref: string): Promise<SupplierAdapterResult<SupplierOrderAcknowledgement>> {
      acknowledgementCalls += 1;
      if (ref !== supplierOrderRef) return fail('PERMANENT_REJECTION', 'unknown simulated supplier order');
      const acknowledgement = acceptedAcknowledgement();
      return ok(acknowledgement, supplierOrderRef);
    },

    async getTracking(_context: SupplierAdapterContext, ref: string): Promise<SupplierAdapterResult<SupplierTrackingEvent[]>> {
      trackingCalls += 1;
      if (ref !== supplierOrderRef) return fail('PERMANENT_REJECTION', 'unknown simulated supplier order');
      const event = (status: string, occurredAt = now()): SupplierTrackingEvent => ({ supplierOrderRef, carrierRef: 'SIM-CARRIER', trackingRef: 'SIM-TRACK-1', status, occurredAt });
      if (options.scenario === 'lost_shipment') return ok([event('dispatched'), event('in_transit'), event('lost')]);
      if (options.scenario === 'dispatch') return ok([event('dispatched')]);
      if (options.scenario === 'delivery') return ok([event('dispatched'), event('in_transit'), event('delivered')]);
      if (options.scenario === 'duplicate_acknowledgement') return ok([event('in_transit'), event('in_transit')]);
      return ok([event('in_transit')]);
    },

    async cancelOrder(_context: SupplierAdapterContext, ref: string) {
      cancellationCalls += 1;
      if (ref !== supplierOrderRef) return fail<{ cancelled: boolean }>('PERMANENT_REJECTION', 'unknown simulated supplier order');
      return ok({ cancelled: options.scenario === 'cancellation' || options.scenario === 'happy_path' });
    },

    async requestReturn(_context: SupplierAdapterContext, ref: string, _reasonCode: string) {
      returnCalls += 1;
      if (ref !== supplierOrderRef) return fail<{ returnRef: string }>('PERMANENT_REJECTION', 'unknown simulated supplier order');
      return ok({ returnRef: 'SIM-RETURN-1' });
    },

    async getReimbursement(_context: SupplierAdapterContext, ref: string) {
      reimbursementCalls += 1;
      if (ref !== supplierOrderRef) return fail<{ amountMinor?: number; currency?: string; state: string }>('PERMANENT_REJECTION', 'unknown simulated supplier order');
      if (options.scenario === 'reimbursement') return ok({ amountMinor: basePriceMinor, currency, state: 'reimbursed' });
      return ok({ state: 'pending' });
    },

    diagnostics() {
      return {
        scenario: options.scenario,
        submitCalls,
        recoveryLookupCalls,
        acknowledgementCalls,
        trackingCalls,
        cancellationCalls,
        returnCalls,
        reimbursementCalls,
        acceptedIdempotencyKeys: [...acceptedByKey.keys()],
        customerRefundRequired: options.scenario === 'refund',
        partialFulfilment: options.scenario === 'partial_fulfilment',
      };
    },
  };

  void externalVariantRef;
  return adapter;
}
