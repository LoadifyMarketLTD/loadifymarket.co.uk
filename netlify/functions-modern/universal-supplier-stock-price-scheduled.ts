import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Config, Context } from '@netlify/functions';
import { resolveAutonomousSupplierCommercePolicy } from '../functions/_shared/autonomousSupplierCommercePolicy';
import { evaluateSupplierCommerceControl, recordSupplierCommerceOperation } from '../functions/_shared/supplierCommerceControl';
import { evaluateSupplierFeedBatch } from '../functions/_shared/supplierFeedBatchAutomation';
import { loadSupplierIntegrationRuntime } from '../functions/_shared/supplierIntegrationRuntime';
import { persistSupplierStockPriceSnapshots } from '../functions/_shared/supplierSyncRuntime';
import { UniversalDirectSupplierAdapterV1 } from '../functions/_shared/universalDirectSupplierAdapter';

interface SyncTarget {
  supplierId: string;
  supplierKey: string;
  supplierOfferId: string;
  offerKey: string;
  canonicalProductId: string;
  territory: string;
  externalVariantRefs: string[];
  lastStockQuantity?: number;
  lastPriceMinor?: number;
  lastPriceCurrency?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseTarget(value: unknown): SyncTarget | null {
  if (!isRecord(value)) return null;
  const supplierId = typeof value.supplierId === 'string' ? value.supplierId.trim() : '';
  const supplierKey = typeof value.supplierKey === 'string' ? value.supplierKey.trim().toLowerCase() : '';
  const supplierOfferId = typeof value.supplierOfferId === 'string' ? value.supplierOfferId.trim() : '';
  const offerKey = typeof value.offerKey === 'string' ? value.offerKey.trim() : '';
  const canonicalProductId = typeof value.canonicalProductId === 'string' ? value.canonicalProductId.trim() : '';
  const territory = typeof value.territory === 'string' ? value.territory.trim().toUpperCase() : '';
  const externalVariantRefs = Array.isArray(value.externalVariantRefs)
    ? value.externalVariantRefs.map(item => String(item).trim()).filter(Boolean)
    : [];
  if (!supplierId || !supplierKey || !supplierOfferId || !offerKey || !canonicalProductId || !/^[A-Z]{2}$/.test(territory)) return null;
  if (externalVariantRefs.length !== 1) return null;

  return {
    supplierId,
    supplierKey,
    supplierOfferId,
    offerKey,
    canonicalProductId,
    territory,
    externalVariantRefs,
    lastStockQuantity: typeof value.lastStockQuantity === 'number' ? value.lastStockQuantity : undefined,
    lastPriceMinor: typeof value.lastPriceMinor === 'number' ? value.lastPriceMinor : undefined,
    lastPriceCurrency: typeof value.lastPriceCurrency === 'string' ? value.lastPriceCurrency.trim().toUpperCase() : undefined,
  };
}

function parseTargets(value: unknown): SyncTarget[] {
  if (!isRecord(value) || !Array.isArray(value.targets)) return [];
  return value.targets.map(parseTarget).filter((item): item is SyncTarget => !!item).slice(0, 5);
}

async function syncTarget(admin: ReturnType<typeof createClient>, target: SyncTarget) {
  const scope = {
    providerRef: 'direct_supplier',
    supplierRef: target.supplierKey,
    offerRef: target.offerKey,
    productRef: target.canonicalProductId,
    territory: target.territory,
  };
  const [stockControl, priceControl] = await Promise.all([
    evaluateSupplierCommerceControl(admin, 'stock_sync', scope),
    evaluateSupplierCommerceControl(admin, 'price_sync', scope),
  ]);
  if (!stockControl.enabled || !priceControl.enabled) {
    return { supplierKey: target.supplierKey, offerKey: target.offerKey, ok: false, code: 'SYNC_CONTROL_DISABLED' };
  }

  const runtime = await loadSupplierIntegrationRuntime(admin, target.supplierId, target.territory);
  if (!runtime || runtime.supplierKey !== target.supplierKey) {
    return { supplierKey: target.supplierKey, offerKey: target.offerKey, ok: false, code: 'RUNTIME_UNAVAILABLE' };
  }

  const adapter = new UniversalDirectSupplierAdapterV1(runtime);
  if (!adapter.capabilities.includes('stock') || !adapter.capabilities.includes('price')) {
    return { supplierKey: target.supplierKey, offerKey: target.offerKey, ok: false, code: 'SYNC_CAPABILITY_UNAVAILABLE' };
  }

  const correlationId = randomUUID();
  const context = {
    correlationId,
    idempotencyKey: `universal-stock-price-sync:${target.supplierOfferId}:${new Date().toISOString().slice(0, 13)}`,
    supplierKey: target.supplierKey,
    territory: target.territory,
  };
  const [stock, prices] = await Promise.all([
    adapter.getStock!(context, target.externalVariantRefs),
    adapter.getPrices!(context, target.externalVariantRefs),
  ]);

  if (!stock.ok || !prices.ok) {
    const errorClass = !stock.ok ? stock.errorClass : !prices.ok ? prices.errorClass : 'UNKNOWN_OUTCOME';
    await recordSupplierCommerceOperation(admin, {
      correlationId,
      requestId: context.idempotencyKey,
      operation: 'stock_price_sync',
      providerRef: adapter.providerKey,
      supplierRef: target.supplierKey,
      entityType: 'supplier_offer',
      entityRef: target.offerKey,
      resultClass: errorClass === 'RATE_LIMITED'
        ? 'RATE_LIMITED'
        : errorClass === 'AUTH_CONFIGURATION_FAILURE'
          ? 'AUTH_CONFIGURATION_FAILURE'
          : 'RETRYABLE_FAILURE',
      errorClass,
      recoveryState: errorClass === 'PERMANENT_REJECTION' ? 'manual_review' : 'retry_pending',
      finishedAt: new Date().toISOString(),
    });
    return { supplierKey: target.supplierKey, offerKey: target.offerKey, ok: false, code: errorClass };
  }

  const variant = target.externalVariantRefs[0];
  const requested = new Set(target.externalVariantRefs);
  if (stock.data.some(row => !requested.has(row.externalVariantRef)) || prices.data.some(row => !requested.has(row.externalVariantRef))) {
    await recordSupplierCommerceOperation(admin, {
      correlationId,
      requestId: context.idempotencyKey,
      operation: 'stock_price_sync',
      providerRef: adapter.providerKey,
      supplierRef: target.supplierKey,
      entityType: 'supplier_offer',
      entityRef: target.offerKey,
      resultClass: 'MANUAL_REVIEW_REQUIRED',
      errorClass: 'UNREQUESTED_VARIANT_RESPONSE',
      recoveryState: 'manual_review',
      finishedAt: new Date().toISOString(),
    });
    return { supplierKey: target.supplierKey, offerKey: target.offerKey, ok: false, code: 'UNREQUESTED_VARIANT_RESPONSE' };
  }
  const stockRow = stock.data.find(row => row.externalVariantRef === variant);
  const priceRow = prices.data.find(row => row.externalVariantRef === variant);
  if (!stockRow || !priceRow) {
    await recordSupplierCommerceOperation(admin, {
      correlationId,
      requestId: context.idempotencyKey,
      operation: 'stock_price_sync',
      providerRef: adapter.providerKey,
      supplierRef: target.supplierKey,
      entityType: 'supplier_offer',
      entityRef: target.offerKey,
      resultClass: 'MANUAL_REVIEW_REQUIRED',
      errorClass: 'MALFORMED_RESPONSE',
      recoveryState: 'manual_review',
      finishedAt: new Date().toISOString(),
    });
    return { supplierKey: target.supplierKey, offerKey: target.offerKey, ok: false, code: 'INCOMPLETE_OBSERVATION' };
  }

  const previous = target.lastPriceMinor !== undefined
    ? {
        amountMinor: target.lastPriceMinor,
        stockQuantity: target.lastStockQuantity,
      }
    : undefined;
  const batch = evaluateSupplierFeedBatch([
    {
      externalVariantRef: variant,
      previous,
      current: {
        amountMinor: priceRow.amountMinor,
        stockQuantity: stockRow.quantity,
      },
    },
  ], {
    maxPriceDropRatio: 0.5,
    maxPriceIncreaseRatio: 1,
    requireStockQuantity: true,
  });

  if (batch.decision !== 'allow_staging') {
    await recordSupplierCommerceOperation(admin, {
      correlationId,
      requestId: context.idempotencyKey,
      operation: 'stock_price_sync',
      providerRef: adapter.providerKey,
      supplierRef: target.supplierKey,
      entityType: 'supplier_offer',
      entityRef: target.offerKey,
      resultClass: 'MANUAL_REVIEW_REQUIRED',
      errorClass: batch.candidates[0]?.circuit.reasons.join(',') || 'CIRCUIT_BLOCKED',
      recoveryState: batch.decision === 'auto_quarantine' ? 'manual_review' : 'resolved',
      finishedAt: new Date().toISOString(),
    });
    return {
      supplierKey: target.supplierKey,
      offerKey: target.offerKey,
      ok: false,
      code: batch.decision === 'auto_quarantine' ? 'AUTO_QUARANTINE' : 'FAIL_CLOSED_INACTIVE',
      circuitDecision: batch.decision,
      publicSellabilityAllowed: false,
      marketplacePublicationAllowed: false,
    };
  }

  const persisted = await persistSupplierStockPriceSnapshots(admin, adapter, context, {
    supplierOfferId: target.supplierOfferId,
    supplierKey: target.supplierKey,
    offerKey: target.offerKey,
    canonicalProductId: target.canonicalProductId,
    externalVariantRefs: target.externalVariantRefs,
    territory: target.territory,
  }, {
    stock: [stockRow],
    prices: [priceRow],
  });


  return {
    supplierKey: target.supplierKey,
    offerKey: target.offerKey,
    ok: persisted.ok,
    stockAccepted: persisted.stockAccepted,
    priceAccepted: persisted.priceAccepted,
    circuitDecision: batch.decision,
    publicSellabilityAllowed: false,
    marketplacePublicationAllowed: false,
  };
}

export default async function universalSupplierStockPriceScheduled(
  _request: Request,
  _context: Context,
): Promise<Response> {
  const policy = resolveAutonomousSupplierCommercePolicy();
  if (!policy.enabled || !policy.providerReadsAllowed || !policy.observationWritesAllowed) {
    return new Response(null, { status: 204 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('universal-supplier-stock-price-scheduled: server configuration unavailable');
    return new Response(null, { status: 204 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc('server_supplier_stock_price_sync_due_v1', { p_limit: 5 });
  if (error) {
    console.error('universal-supplier-stock-price-scheduled: due selector failed');
    return new Response(null, { status: 204 });
  }

  const targets = parseTargets(data);
  for (const target of targets) {
    try {
      const result = await syncTarget(admin, target);
      console.log('universal-supplier-stock-price-scheduled:', JSON.stringify(result));
    } catch (caught) {
      console.error('universal-supplier-stock-price-scheduled: target failed', {
        supplierKey: target.supplierKey,
        offerKey: target.offerKey,
        message: caught instanceof Error ? caught.message : 'unknown error',
      });
    }
  }

  return new Response(null, { status: 204 });
}

export const config: Config = {
  schedule: '*/15 * * * *',
};
