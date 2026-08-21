import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupplierAdapterContext, SupplierAdapterV1, SupplierTrackingEvent } from './supplierAdapter';
import { adapterSupports } from './supplierAdapter';
import { recordSupplierCommerceOperation } from './supplierCommerceControl';

export const SUPPLIER_TRACKING_INTERFACE_VERSION = 1 as const;

export interface SupplierTrackingContext {
  eligible: true;
  reason: 'supplier_tracking_ready';
  handshakeId: string;
  orderId: string;
  orchestrationId: string;
  fulfilmentLegId: string;
  supplierId: string;
  supplierKey: string;
  providerKey: string;
  adapterVersion: string;
  supplierOrderRef: string;
  correlationId: string;
  interfaceVersion: 1;
}

export interface SupplierTrackingSyncResult {
  ok: boolean;
  ingested: number;
  blocked?: number;
  reason?: string;
}

function isTrackingContext(value: unknown): value is SupplierTrackingContext {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.eligible === true
    && row.reason === 'supplier_tracking_ready'
    && typeof row.handshakeId === 'string'
    && typeof row.orderId === 'string'
    && typeof row.orchestrationId === 'string'
    && typeof row.fulfilmentLegId === 'string'
    && typeof row.supplierKey === 'string'
    && typeof row.providerKey === 'string'
    && typeof row.adapterVersion === 'string'
    && typeof row.supplierOrderRef === 'string'
    && typeof row.correlationId === 'string'
    && row.interfaceVersion === SUPPLIER_TRACKING_INTERFACE_VERSION;
}

function structurallyValidTrackingEvent(event: SupplierTrackingEvent): boolean {
  return Boolean(
    event
      && typeof event.supplierOrderRef === 'string'
      && event.supplierOrderRef.trim()
      && typeof event.status === 'string'
      && event.status.trim()
      && typeof event.occurredAt === 'string'
      && !Number.isNaN(Date.parse(event.occurredAt)),
  );
}

/**
 * Phase K provider-neutral tracking poll/ingest.
 * Supplier/carrier statuses are never trusted as canonical state directly;
 * the database applies an approved versioned mapping under tracking_ingest control.
 */
export async function syncSupplierTracking(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  handshakeId: string,
): Promise<SupplierTrackingSyncResult> {
  const startedAt = new Date().toISOString();
  const { data: rawContext, error: contextError } = await client.rpc('server_supplier_tracking_context_v1', {
    p_handshake_id: handshakeId,
  });
  if (contextError || !isTrackingContext(rawContext)) {
    const reason = rawContext && typeof rawContext === 'object' && typeof (rawContext as { reason?: unknown }).reason === 'string'
      ? String((rawContext as { reason: string }).reason)
      : 'supplier_tracking_context_unavailable';
    return { ok: false, ingested: 0, reason };
  }
  const context = rawContext;

  if (
    adapter.interfaceVersion !== SUPPLIER_TRACKING_INTERFACE_VERSION
    || adapter.providerKey !== context.providerKey
    || adapter.adapterVersion !== context.adapterVersion
    || !adapterSupports(adapter, 'tracking')
    || !adapter.getTracking
  ) {
    return { ok: false, ingested: 0, reason: 'tracking_adapter_identity_or_capability_mismatch' };
  }

  const adapterContext: SupplierAdapterContext = {
    correlationId: context.correlationId,
    idempotencyKey: `tracking:${context.handshakeId}`,
    supplierKey: context.supplierKey,
    territory: 'GB',
  };

  let events: SupplierTrackingEvent[];
  try {
    const result = await adapter.getTracking(adapterContext, context.supplierOrderRef);
    if (!result.ok) {
      await recordSupplierCommerceOperation(client, {
        correlationId: context.correlationId,
        requestId: `tracking:${context.handshakeId}`,
        operation: 'tracking_ingest',
        providerRef: adapter.providerKey,
        supplierRef: context.supplierKey,
        entityType: 'supplier_order_handshake',
        entityRef: context.handshakeId,
        resultClass: result.errorClass === 'AUTH_CONFIGURATION_FAILURE' ? 'AUTH_CONFIGURATION_FAILURE'
          : result.errorClass === 'RATE_LIMITED' ? 'RATE_LIMITED'
            : result.errorClass === 'PERMANENT_REJECTION' ? 'PERMANENT_REJECTION'
              : result.errorClass === 'CAPABILITY_UNAVAILABLE' ? 'MANUAL_REVIEW_REQUIRED'
                : 'RETRYABLE_FAILURE',
        errorClass: result.errorClass,
        recoveryState: 'tracking_exception_review',
        externalRef: result.externalRef,
        customerImpact: 'tracking_update_unavailable',
        financialImpact: 'delivery_exception_risk',
        startedAt,
        finishedAt: new Date().toISOString(),
      });
      return { ok: false, ingested: 0, reason: result.errorClass };
    }
    events = result.data;
  } catch {
    return { ok: false, ingested: 0, reason: 'tracking_provider_call_failed' };
  }

  let ingested = 0;
  let blocked = 0;
  for (const event of events) {
    if (!structurallyValidTrackingEvent(event) || event.supplierOrderRef !== context.supplierOrderRef) {
      blocked += 1;
      continue;
    }
    const { data, error } = await client.rpc('server_ingest_supplier_tracking_event_v1', {
      p_handshake_id: context.handshakeId,
      p_provider_status: event.status,
      p_carrier_ref: event.carrierRef ?? null,
      p_tracking_ref: event.trackingRef ?? null,
      p_provider_event_ref: null,
      p_occurred_at: event.occurredAt,
      p_raw_evidence: {
        supplierOrderRef: event.supplierOrderRef,
        carrierRef: event.carrierRef ?? null,
        trackingRef: event.trackingRef ?? null,
        providerStatus: event.status,
        occurredAt: event.occurredAt,
      },
    });
    if (error || !data || typeof data !== 'object' || (data as { ok?: unknown }).ok !== true) blocked += 1;
    else ingested += 1;
  }

  await client.rpc('server_detect_supplier_tracking_exceptions_v1', {
    p_now: new Date().toISOString(),
    p_no_tracking_after_minutes: 120,
    p_dispatch_delay_minutes: 60,
  });

  return { ok: blocked === 0, ingested, blocked };
}
