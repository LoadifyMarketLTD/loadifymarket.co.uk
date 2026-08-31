import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupplierAdapterContext, SupplierAdapterV1, SupplierPriceSnapshot, SupplierStockSnapshot } from './supplierAdapter';
import { adapterSupports } from './supplierAdapter';
import { recordSupplierCommerceOperation } from './supplierCommerceControl';

export interface SupplierSyncTarget {
  supplierOfferId: string;
  supplierKey: string;
  offerKey: string;
  canonicalProductId: string;
  externalVariantRefs: string[];
  territory: string;
}

export interface SupplierSyncRunResult {
  ok: boolean;
  stockAccepted: number;
  priceAccepted: number;
  blocked?: boolean;
  errorClass?: string;
}

export interface SupplierStockPriceSnapshots {
  stock: SupplierStockSnapshot[];
  prices: SupplierPriceSnapshot[];
}

function eventKey(kind: 'stock' | 'price', target: SupplierSyncTarget, variant: string, observedAt: string): string {
  return createHash('sha256').update([kind, target.supplierOfferId, variant, observedAt].join('|')).digest('hex');
}

async function persistStock(client: SupabaseClient, adapter: SupplierAdapterV1, target: SupplierSyncTarget, row: SupplierStockSnapshot) {
  return client.rpc('server_record_supplier_sync_observation_v1', {
    p_kind: 'stock',
    p_supplier_offer_id: target.supplierOfferId,
    p_external_variant_ref: row.externalVariantRef,
    p_provider_event_key: eventKey('stock', target, row.externalVariantRef, row.observedAt),
    p_observed_at: row.observedAt,
    p_adapter_version: adapter.adapterVersion,
    p_availability: row.availability,
    p_quantity: row.quantity ?? null,
    p_amount_minor: null,
    p_currency: null,
    p_source_ref: null,
    p_evidence: { providerKey: adapter.providerKey, interfaceVersion: adapter.interfaceVersion },
  });
}

async function persistPrice(client: SupabaseClient, adapter: SupplierAdapterV1, target: SupplierSyncTarget, row: SupplierPriceSnapshot) {
  return client.rpc('server_record_supplier_sync_observation_v1', {
    p_kind: 'price',
    p_supplier_offer_id: target.supplierOfferId,
    p_external_variant_ref: row.externalVariantRef,
    p_provider_event_key: eventKey('price', target, row.externalVariantRef, row.observedAt),
    p_observed_at: row.observedAt,
    p_adapter_version: adapter.adapterVersion,
    p_availability: null,
    p_quantity: null,
    p_amount_minor: row.amountMinor,
    p_currency: row.currency,
    p_source_ref: null,
    p_evidence: { providerKey: adapter.providerKey, interfaceVersion: adapter.interfaceVersion },
  });
}

/**
 * Persists already validated provider observations through the existing
 * server-only Supplier Sync RPC. It does not publish products or alter buyer
 * price truth; the database remains the authoritative fail-closed boundary.
 */
export async function persistSupplierStockPriceSnapshots(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  context: SupplierAdapterContext,
  target: SupplierSyncTarget,
  snapshots: SupplierStockPriceSnapshots,
): Promise<SupplierSyncRunResult> {
  const startedAt = new Date().toISOString();
  let stockAccepted = 0;
  let priceAccepted = 0;
  let blocked = false;

  for (const row of snapshots.stock) {
    const { data, error } = await persistStock(client, adapter, target, row);
    const accepted = !error && data && typeof data === 'object' && (data as { accepted?: unknown }).accepted === true;
    if (accepted) stockAccepted += 1;
    else blocked = true;
  }
  for (const row of snapshots.prices) {
    const { data, error } = await persistPrice(client, adapter, target, row);
    const accepted = !error && data && typeof data === 'object' && (data as { accepted?: unknown }).accepted === true;
    if (accepted) priceAccepted += 1;
    else blocked = true;
  }

  await recordSupplierCommerceOperation(client, {
    correlationId: context.correlationId,
    requestId: context.idempotencyKey,
    operation: 'stock_price_sync',
    providerRef: adapter.providerKey,
    supplierRef: target.supplierKey,
    entityType: 'supplier_offer',
    entityRef: target.offerKey,
    resultClass: blocked ? 'BLOCKED_BY_CONTROL' : 'SUCCESS',
    recoveryState: blocked ? 'none' : 'resolved',
    startedAt,
    finishedAt: new Date().toISOString(),
  });

  return { ok: !blocked, stockAccepted, priceAccepted, blocked };
}

export async function runSupplierStockPriceSync(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  context: SupplierAdapterContext,
  target: SupplierSyncTarget,
): Promise<SupplierSyncRunResult> {
  const startedAt = new Date().toISOString();
  if (!adapterSupports(adapter, 'stock') || !adapterSupports(adapter, 'price') || !adapter.getStock || !adapter.getPrices) {
    return { ok: false, stockAccepted: 0, priceAccepted: 0, errorClass: 'CAPABILITY_UNAVAILABLE' };
  }

  const [stock, prices] = await Promise.all([
    adapter.getStock(context, target.externalVariantRefs),
    adapter.getPrices(context, target.externalVariantRefs),
  ]);

  if (!stock.ok || !prices.ok) {
    const errorClass = !stock.ok ? stock.errorClass : !prices.ok ? prices.errorClass : 'UNKNOWN_OUTCOME';
    await recordSupplierCommerceOperation(client, {
      correlationId: context.correlationId,
      requestId: context.idempotencyKey,
      operation: 'stock_price_sync',
      providerRef: adapter.providerKey,
      supplierRef: target.supplierKey,
      entityType: 'supplier_offer',
      entityRef: target.offerKey,
      resultClass: errorClass === 'RATE_LIMITED' ? 'RATE_LIMITED' : errorClass === 'AUTH_CONFIGURATION_FAILURE' ? 'AUTH_CONFIGURATION_FAILURE' : 'RETRYABLE_FAILURE',
      errorClass,
      recoveryState: errorClass === 'PERMANENT_REJECTION' ? 'manual_review' : 'retry_pending',
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    return { ok: false, stockAccepted: 0, priceAccepted: 0, errorClass };
  }

  return persistSupplierStockPriceSnapshots(client, adapter, context, target, {
    stock: stock.data,
    prices: prices.data,
  });
}
