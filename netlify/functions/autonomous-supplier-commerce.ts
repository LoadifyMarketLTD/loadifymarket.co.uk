import { randomUUID } from 'node:crypto';
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { createAvasamAdapterV1 } from './_shared/avasamAdapter';
import { AVASAM_PILOT_SKU } from './_shared/avasamSupplierPolicy';
import { resolveAutonomousSupplierCommercePolicy } from './_shared/autonomousSupplierCommercePolicy';
import { evaluateSupplierFeedBatch } from './_shared/supplierFeedBatchAutomation';
import { evaluateSupplierStockPrice } from './_shared/supplierSync';
import { persistSupplierStockPriceSnapshots } from './_shared/supplierSyncRuntime';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCHEDULE = '17 * * * *';

/**
 * Hourly autonomous supplier read-sync runner.
 *
 * It is inert unless the independent runtime switches are enabled. The only
 * provider currently eligible for execution here is the already verified
 * Avasam read-only pilot. BigBuy remains scaffolded/unverified and is not
 * instantiated by this job.
 */
export const handler = schedule(SCHEDULE, async () => {
  const policy = resolveAutonomousSupplierCommercePolicy();
  if (!policy.enabled || !policy.providerReadsAllowed) {
    console.log('autonomous-supplier-commerce: inert', { mode: policy.mode, policyVersion: policy.policyVersion });
    return { statusCode: 200 };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('autonomous-supplier-commerce: Supabase server configuration unavailable');
    return { statusCode: 200 };
  }

  const supplierOfferId = (process.env.AUTONOMOUS_AVASAM_SUPPLIER_OFFER_ID || '').trim();
  const canonicalProductId = (process.env.AUTONOMOUS_AVASAM_CANONICAL_PRODUCT_ID || '').trim();
  const offerKey = (process.env.AUTONOMOUS_AVASAM_OFFER_KEY || '').trim();
  if (!UUID_RE.test(supplierOfferId) || !UUID_RE.test(canonicalProductId) || !offerKey) {
    console.warn('autonomous-supplier-commerce: Avasam pilot target is not configured');
    return { statusCode: 200 };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adapter = createAvasamAdapterV1();
  const correlationId = randomUUID();
  const context = {
    correlationId,
    idempotencyKey: `autonomous-avasam-sync:${new Date().toISOString().slice(0, 13)}`,
    supplierKey: 'avasam',
    territory: 'GB',
  };

  const baseline = await evaluateSupplierStockPrice(admin, {
    supplierOfferId,
    canonicalProductId,
    commercialMode: 'loadify_supplier_fulfilled',
    territory: 'GB',
    externalVariantRef: AVASAM_PILOT_SKU,
  });

  const [stock, prices] = await Promise.all([
    adapter.getStock(context, [AVASAM_PILOT_SKU]),
    adapter.getPrices(context, [AVASAM_PILOT_SKU]),
  ]);
  if (!stock.ok || !prices.ok) {
    console.warn('autonomous-supplier-commerce: provider read failed', {
      stock: stock.ok ? 'ok' : stock.errorClass,
      price: prices.ok ? 'ok' : prices.errorClass,
    });
    return { statusCode: 200 };
  }

  const stockRow = stock.data.find(row => row.externalVariantRef === AVASAM_PILOT_SKU);
  const priceRow = prices.data.find(row => row.externalVariantRef === AVASAM_PILOT_SKU);
  if (!stockRow || !priceRow || priceRow.currency.toUpperCase() !== 'GBP') {
    console.warn('autonomous-supplier-commerce: incomplete or invalid pilot observation');
    return { statusCode: 200 };
  }

  const batch = evaluateSupplierFeedBatch([
    {
      externalVariantRef: AVASAM_PILOT_SKU,
      previous: baseline.eligible && typeof baseline.supplierPriceMinor === 'number'
        ? {
            amountMinor: baseline.supplierPriceMinor,
            stockQuantity: typeof baseline.sellableQuantity === 'number' ? baseline.sellableQuantity : undefined,
          }
        : undefined,
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

  console.log('autonomous-supplier-commerce: Avasam pilot pre-admission decision', {
    decision: batch.decision,
    reasons: batch.candidates[0]?.circuit.reasons ?? [],
    publicSellabilityAllowed: batch.publicSellabilityAllowed,
  });

  if (policy.observationWritesAllowed) {
    const persisted = await persistSupplierStockPriceSnapshots(admin, adapter, context, {
      supplierOfferId,
      supplierKey: 'avasam',
      offerKey,
      canonicalProductId,
      externalVariantRefs: [AVASAM_PILOT_SKU],
      territory: 'GB',
    }, {
      stock: stock.data,
      prices: prices.data,
    });
    console.log('autonomous-supplier-commerce: observation persistence result', persisted);
  }

  return { statusCode: 200 };
});
