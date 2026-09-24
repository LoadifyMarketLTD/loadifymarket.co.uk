import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateSupplierCatalog } from './supplierCatalog';
import { evaluateSupplierEconomics } from './supplierEconomics';
import { evaluateSupplierStockPrice } from './supplierSync';
import {
  selectFallbackSupplierOffer,
  selectSupplierOffer,
  type SupplierOfferSelectionCandidate,
  type SupplierOfferSelectionResult,
  type SupplierPromiseEnvelope,
} from './supplierOfferSelection';

interface ProjectionOfferRow {
  supplier_offer_id: string;
  supplier_id: string;
  supplier_key: string;
  canonical_product_id: string;
  supplier_catalog_item_id: string;
  external_variant_ref: string;
  territory: string;
  fallback_allowed: boolean;
  dispatch_hours: number | null;
  return_window_days: number | null;
  tracking_deadline_hours: number | null;
  pricing_snapshot_id: string | null;
  currency: string | null;
  gross_customer_price: number | string | null;
  expected_contribution: number | string | null;
  minimum_contribution: number | string | null;
}

interface FoundationDecision {
  eligible: boolean;
  reason: string;
  interfaceVersion: number;
}

interface ProductMarketComplianceDecision {
  eligible: boolean;
  reason: string;
  interfaceVersion: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberOrNaN = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  return Number.NaN;
};

function asProjectionOfferRows(value: unknown): ProjectionOfferRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(row => ({
    supplier_offer_id: String(row.supplier_offer_id ?? ''),
    supplier_id: String(row.supplier_id ?? ''),
    supplier_key: String(row.supplier_key ?? ''),
    canonical_product_id: String(row.canonical_product_id ?? ''),
    supplier_catalog_item_id: String(row.supplier_catalog_item_id ?? ''),
    external_variant_ref: String(row.external_variant_ref ?? ''),
    territory: String(row.territory ?? ''),
    fallback_allowed: row.fallback_allowed === true,
    dispatch_hours: row.dispatch_hours === null || row.dispatch_hours === undefined
      ? null
      : numberOrNaN(row.dispatch_hours),
    return_window_days: row.return_window_days === null || row.return_window_days === undefined
      ? null
      : numberOrNaN(row.return_window_days),
    tracking_deadline_hours: row.tracking_deadline_hours === null || row.tracking_deadline_hours === undefined
      ? null
      : numberOrNaN(row.tracking_deadline_hours),
    pricing_snapshot_id: row.pricing_snapshot_id == null ? null : String(row.pricing_snapshot_id),
    currency: row.currency == null ? null : String(row.currency),
    gross_customer_price: row.gross_customer_price as number | string | null,
    expected_contribution: row.expected_contribution as number | string | null,
    minimum_contribution: row.minimum_contribution as number | string | null,
  }));
}

async function foundationCapability(
  client: SupabaseClient,
  supplierKey: string,
  territory: string,
  capability: 'shipping' | 'order_submission' | 'acknowledgement' | 'tracking' | 'returns',
): Promise<FoundationDecision> {
  try {
    const { data, error } = await client.rpc('server_supplier_foundation_decision_v1', {
      p_supplier_key: supplierKey,
      p_territory: territory,
      p_required_capability: capability,
    });
    if (error || !isRecord(data)) {
      return { eligible: false, reason: 'supplier_foundation_unavailable', interfaceVersion: 1 };
    }
    if (typeof data.eligible !== 'boolean' || typeof data.reason !== 'string' || data.interfaceVersion !== 1) {
      return { eligible: false, reason: 'supplier_foundation_unavailable', interfaceVersion: 1 };
    }
    return data as unknown as FoundationDecision;
  } catch {
    return { eligible: false, reason: 'supplier_foundation_unavailable', interfaceVersion: 1 };
  }
}

async function productMarketCompliance(
  client: SupabaseClient,
  row: ProjectionOfferRow,
): Promise<ProductMarketComplianceDecision> {
  if (row.territory !== 'RO') {
    return { eligible: true, reason: 'existing_market_boundary', interfaceVersion: 1 };
  }

  try {
    const { data, error } = await client.rpc('server_product_market_compliance_decision_v1', {
      p_supplier_catalog_item_id: row.supplier_catalog_item_id,
      p_canonical_product_id: row.canonical_product_id,
      p_market_code: row.territory,
    });
    if (error || !isRecord(data)
      || typeof data.eligible !== 'boolean'
      || typeof data.reason !== 'string'
      || data.interfaceVersion !== 1) {
      return { eligible: false, reason: 'product_market_compliance_unavailable', interfaceVersion: 1 };
    }
    return data as unknown as ProductMarketComplianceDecision;
  } catch {
    return { eligible: false, reason: 'product_market_compliance_unavailable', interfaceVersion: 1 };
  }
}

async function buildCandidate(
  client: SupabaseClient,
  row: ProjectionOfferRow,
  requestedQuantity: number,
): Promise<SupplierOfferSelectionCandidate> {
  const [
    catalog,
    economics,
    sync,
    shipping,
    orderSubmission,
    acknowledgement,
    tracking,
    returns,
    marketCompliance,
  ] = await Promise.all([
    evaluateSupplierCatalog(client, {
      canonicalProductId: row.canonical_product_id,
      supplierOfferId: row.supplier_offer_id,
      territory: row.territory,
    }),
    evaluateSupplierEconomics(client, {
      canonicalProductId: row.canonical_product_id,
      supplierOfferId: row.supplier_offer_id,
      commercialMode: 'loadify_supplier_fulfilled',
      territory: row.territory,
    }),
    evaluateSupplierStockPrice(client, {
      canonicalProductId: row.canonical_product_id,
      supplierOfferId: row.supplier_offer_id,
      commercialMode: 'loadify_supplier_fulfilled',
      territory: row.territory,
      externalVariantRef: row.external_variant_ref,
    }),
    foundationCapability(client, row.supplier_key, row.territory, 'shipping'),
    foundationCapability(client, row.supplier_key, row.territory, 'order_submission'),
    foundationCapability(client, row.supplier_key, row.territory, 'acknowledgement'),
    foundationCapability(client, row.supplier_key, row.territory, 'tracking'),
    foundationCapability(client, row.supplier_key, row.territory, 'returns'),
    productMarketCompliance(client, row),
  ]);

  const economicsMatchesSnapshot = economics.eligible
    && !!economics.pricingSnapshotId
    && economics.pricingSnapshotId === row.pricing_snapshot_id;

  return {
    supplierOfferId: row.supplier_offer_id,
    supplierId: row.supplier_id,
    supplierKey: row.supplier_key,
    canonicalProductId: row.canonical_product_id,
    externalVariantRef: row.external_variant_ref,
    territory: row.territory,
    currency: String(row.currency ?? economics.currency ?? sync.currency ?? '').toUpperCase(),
    requestedQuantity,
    sellableQuantity: sync.sellableQuantity ?? null,
    grossCustomerPrice: numberOrNaN(row.gross_customer_price ?? economics.grossCustomerPrice),
    expectedContribution: numberOrNaN(row.expected_contribution),
    minimumContribution: numberOrNaN(row.minimum_contribution),
    dispatchHours: row.dispatch_hours,
    returnWindowDays: row.return_window_days,
    trackingDeadlineHours: row.tracking_deadline_hours,
    stockObservedAt: sync.stockObservedAt ?? '',
    priceObservedAt: sync.priceObservedAt ?? '',
    catalogEligible: catalog.eligible && marketCompliance.eligible,
    economicsEligible: economics.eligible && economicsMatchesSnapshot,
    stockPriceEligible: sync.eligible,
    shippingEligible: shipping.eligible,
    orderSubmissionEligible: orderSubmission.eligible,
    acknowledgementEligible: acknowledgement.eligible,
    trackingEligible: tracking.eligible,
    returnsEligible: returns.eligible,
  };
}

export async function evaluateProjectionSupplierOffers(
  client: SupabaseClient,
  input: {
    projectionId: string;
    requestedQuantity: number;
    territory?: string;
  },
): Promise<SupplierOfferSelectionResult> {
  try {
    const territory = (input.territory || 'GB').trim().toUpperCase();
    const { data, error } = await client.rpc('server_supplier_projection_offer_candidates_v1', {
      p_projection_id: input.projectionId,
      p_territory: territory,
    });
    if (error) {
      return {
        interfaceVersion: 1,
        eligible: false,
        reason: 'supplier_offer_candidates_unavailable',
        selected: null,
        ranked: [],
        rejected: [],
      };
    }

    const rows = asProjectionOfferRows(data);
    const candidates = await Promise.all(
      rows.map(row => buildCandidate(client, row, input.requestedQuantity)),
    );
    return selectSupplierOffer(candidates);
  } catch {
    return {
      interfaceVersion: 1,
      eligible: false,
      reason: 'supplier_offer_selection_unavailable',
      selected: null,
      ranked: [],
      rejected: [],
    };
  }
}

export async function evaluateProjectionSupplierFallback(
  client: SupabaseClient,
  input: {
    projectionId: string;
    requestedQuantity: number;
    failedSupplierOfferId: string;
    promise: SupplierPromiseEnvelope;
  },
): Promise<SupplierOfferSelectionResult> {
  try {
    const { data, error } = await client.rpc('server_supplier_projection_offer_candidates_v1', {
      p_projection_id: input.projectionId,
      p_territory: input.promise.territory,
    });
    if (error) {
      return {
        interfaceVersion: 1,
        eligible: false,
        reason: 'supplier_offer_candidates_unavailable',
        selected: null,
        ranked: [],
        rejected: [],
      };
    }

    const rows = asProjectionOfferRows(data).filter(row => row.fallback_allowed);
    const candidates = await Promise.all(
      rows.map(row => buildCandidate(client, row, input.requestedQuantity)),
    );
    return selectFallbackSupplierOffer({
      candidates,
      failedSupplierOfferId: input.failedSupplierOfferId,
      promise: input.promise,
    });
  } catch {
    return {
      interfaceVersion: 1,
      eligible: false,
      reason: 'supplier_offer_fallback_unavailable',
      selected: null,
      ranked: [],
      rejected: [],
    };
  }
}
