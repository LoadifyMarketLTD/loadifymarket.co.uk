import type { SupplierAdapterCapability, SupplierAdapterResult } from './supplierAdapter';

export const BIGBUY_EVIDENCE_ASSESSMENT_INTERFACE_VERSION = 1 as const;
export const BIGBUY_SANDBOX_EVIDENCE_GATE = 'bigbuy-sandbox-readonly-contract-probe' as const;
export const BIGBUY_SANDBOX_HOST = 'https://api.sandbox.bigbuy.eu' as const;

export const BIGBUY_READ_EVIDENCE_CAPABILITIES = [
  'catalog',
  'variants',
  'stock',
  'price',
] as const satisfies readonly SupplierAdapterCapability[];

export type BigBuyReadEvidenceCapability = (typeof BIGBUY_READ_EVIDENCE_CAPABILITIES)[number];
export type BigBuyEvidenceDecisionStatus = 'CANDIDATE_EVIDENCE_COMPLETE' | 'BLOCKED';

export interface BigBuyEvidenceCapabilityDecisionV1 {
  capability: BigBuyReadEvidenceCapability;
  status: BigBuyEvidenceDecisionStatus;
  blockers: readonly string[];
  registryPromotionAllowed: false;
  automatedExecutionAllowed: false;
}

export interface BigBuySandboxEvidenceAssessmentV1 {
  interfaceVersion: typeof BIGBUY_EVIDENCE_ASSESSMENT_INTERFACE_VERSION;
  provider: 'bigbuy';
  sourceGate: typeof BIGBUY_SANDBOX_EVIDENCE_GATE;
  environment: 'sandbox';
  host: typeof BIGBUY_SANDBOX_HOST;
  manualReviewRequired: true;
  automaticRegistryPromotionPerformed: false;
  decisions: readonly BigBuyEvidenceCapabilityDecisionV1[];
}

interface ParsedProbeEvidence {
  gate: string;
  environment: string;
  host: string;
  authentication: {
    negativeControlStatus: number;
    bearerAuthenticated: boolean;
  };
  controlledScope: {
    parentTaxonomy: number;
    product: { id: number; skuMatched: boolean };
    variation: { id: number; skuMatched: boolean; productBindingMatched: boolean };
  };
  verifiedReadContracts: {
    products: { matched: boolean; wholesalePriceNumeric: boolean; activeFlagValid: boolean };
    variations: { matched: boolean; wholesalePriceNumeric: boolean; productBindingMatched: boolean };
    productStock: { matched: boolean; stockBucketsValid: boolean };
    variationStock: { matched: boolean; stockBucketsValid: boolean };
  };
  safety: {
    ordersCalled: boolean;
    piiProcessed: boolean;
    capabilityPromotionPerformed: boolean;
    fullProviderPayloadLogged: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformed<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'MALFORMED_RESPONSE', message };
}

function booleanField(record: Record<string, unknown>, key: string): boolean | null {
  return typeof record[key] === 'boolean' ? record[key] : null;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function parseProbeEvidence(value: unknown): SupplierAdapterResult<ParsedProbeEvidence> {
  if (!isRecord(value)) return malformed('BigBuy sandbox evidence must be an object');
  const authentication = value.authentication;
  const controlledScope = value.controlledScope;
  const verifiedReadContracts = value.verifiedReadContracts;
  const safety = value.safety;

  if (
    typeof value.gate !== 'string'
    || typeof value.environment !== 'string'
    || typeof value.host !== 'string'
    || !isRecord(authentication)
    || !isRecord(controlledScope)
    || !isRecord(verifiedReadContracts)
    || !isRecord(safety)
  ) {
    return malformed('BigBuy sandbox evidence top-level shape is invalid');
  }

  const product = controlledScope.product;
  const variation = controlledScope.variation;
  const products = verifiedReadContracts.products;
  const variations = verifiedReadContracts.variations;
  const productStock = verifiedReadContracts.productStock;
  const variationStock = verifiedReadContracts.variationStock;

  if (
    !positiveSafeInteger(controlledScope.parentTaxonomy)
    || !isRecord(product)
    || !positiveSafeInteger(product.id)
    || booleanField(product, 'skuMatched') === null
    || !isRecord(variation)
    || !positiveSafeInteger(variation.id)
    || booleanField(variation, 'skuMatched') === null
    || booleanField(variation, 'productBindingMatched') === null
  ) {
    return malformed('BigBuy sandbox evidence controlled scope is invalid');
  }

  if (
    typeof authentication.negativeControlStatus !== 'number'
    || !Number.isSafeInteger(authentication.negativeControlStatus)
    || booleanField(authentication, 'bearerAuthenticated') === null
  ) {
    return malformed('BigBuy sandbox evidence authentication shape is invalid');
  }

  const readContractRecords = [products, variations, productStock, variationStock];
  if (readContractRecords.some(record => !isRecord(record))) {
    return malformed('BigBuy sandbox evidence read-contract shape is invalid');
  }

  const productRecord = products as Record<string, unknown>;
  const variationRecord = variations as Record<string, unknown>;
  const productStockRecord = productStock as Record<string, unknown>;
  const variationStockRecord = variationStock as Record<string, unknown>;

  if (
    booleanField(productRecord, 'matched') === null
    || booleanField(productRecord, 'wholesalePriceNumeric') === null
    || booleanField(productRecord, 'activeFlagValid') === null
    || booleanField(variationRecord, 'matched') === null
    || booleanField(variationRecord, 'wholesalePriceNumeric') === null
    || booleanField(variationRecord, 'productBindingMatched') === null
    || booleanField(productStockRecord, 'matched') === null
    || booleanField(productStockRecord, 'stockBucketsValid') === null
    || booleanField(variationStockRecord, 'matched') === null
    || booleanField(variationStockRecord, 'stockBucketsValid') === null
  ) {
    return malformed('BigBuy sandbox evidence read-contract flags are invalid');
  }

  if (
    booleanField(safety, 'ordersCalled') === null
    || booleanField(safety, 'piiProcessed') === null
    || booleanField(safety, 'capabilityPromotionPerformed') === null
    || booleanField(safety, 'fullProviderPayloadLogged') === null
  ) {
    return malformed('BigBuy sandbox evidence safety flags are invalid');
  }

  return {
    ok: true,
    data: {
      gate: value.gate,
      environment: value.environment,
      host: value.host,
      authentication: {
        negativeControlStatus: authentication.negativeControlStatus,
        bearerAuthenticated: authentication.bearerAuthenticated as boolean,
      },
      controlledScope: {
        parentTaxonomy: controlledScope.parentTaxonomy,
        product: {
          id: product.id,
          skuMatched: product.skuMatched as boolean,
        },
        variation: {
          id: variation.id,
          skuMatched: variation.skuMatched as boolean,
          productBindingMatched: variation.productBindingMatched as boolean,
        },
      },
      verifiedReadContracts: {
        products: {
          matched: productRecord.matched as boolean,
          wholesalePriceNumeric: productRecord.wholesalePriceNumeric as boolean,
          activeFlagValid: productRecord.activeFlagValid as boolean,
        },
        variations: {
          matched: variationRecord.matched as boolean,
          wholesalePriceNumeric: variationRecord.wholesalePriceNumeric as boolean,
          productBindingMatched: variationRecord.productBindingMatched as boolean,
        },
        productStock: {
          matched: productStockRecord.matched as boolean,
          stockBucketsValid: productStockRecord.stockBucketsValid as boolean,
        },
        variationStock: {
          matched: variationStockRecord.matched as boolean,
          stockBucketsValid: variationStockRecord.stockBucketsValid as boolean,
        },
      },
      safety: {
        ordersCalled: safety.ordersCalled as boolean,
        piiProcessed: safety.piiProcessed as boolean,
        capabilityPromotionPerformed: safety.capabilityPromotionPerformed as boolean,
        fullProviderPayloadLogged: safety.fullProviderPayloadLogged as boolean,
      },
    },
  };
}

function globalBlockers(evidence: ParsedProbeEvidence): string[] {
  const blockers: string[] = [];
  if (evidence.gate !== BIGBUY_SANDBOX_EVIDENCE_GATE) blockers.push('unexpected_evidence_gate');
  if (evidence.environment !== 'sandbox') blockers.push('evidence_not_from_sandbox');
  if (evidence.host !== BIGBUY_SANDBOX_HOST) blockers.push('untrusted_bigbuy_host');
  if (evidence.authentication.negativeControlStatus !== 401 && evidence.authentication.negativeControlStatus !== 403) {
    blockers.push('negative_authentication_control_failed');
  }
  if (!evidence.authentication.bearerAuthenticated) blockers.push('bearer_authentication_not_proven');
  if (!evidence.controlledScope.product.skuMatched) blockers.push('controlled_product_identity_not_matched');
  if (!evidence.controlledScope.variation.skuMatched) blockers.push('controlled_variation_identity_not_matched');
  if (!evidence.controlledScope.variation.productBindingMatched) blockers.push('controlled_variation_binding_not_matched');
  if (evidence.safety.ordersCalled) blockers.push('order_endpoint_was_called');
  if (evidence.safety.piiProcessed) blockers.push('pii_was_processed');
  if (evidence.safety.capabilityPromotionPerformed) blockers.push('capability_promotion_occurred_during_probe');
  if (evidence.safety.fullProviderPayloadLogged) blockers.push('full_provider_payload_was_logged');
  return blockers;
}

function capabilityBlockers(
  capability: BigBuyReadEvidenceCapability,
  evidence: ParsedProbeEvidence,
): string[] {
  const blockers: string[] = [];
  const contracts = evidence.verifiedReadContracts;

  if (capability === 'catalog') {
    if (!contracts.products.matched) blockers.push('controlled_product_not_matched');
    if (!contracts.products.activeFlagValid) blockers.push('product_active_flag_not_validated');
  }

  if (capability === 'variants') {
    if (!contracts.variations.matched) blockers.push('controlled_variation_not_matched');
    if (!contracts.variations.productBindingMatched) blockers.push('variation_product_binding_not_validated');
  }

  if (capability === 'stock') {
    if (!contracts.productStock.matched) blockers.push('controlled_product_stock_not_matched');
    if (!contracts.productStock.stockBucketsValid) blockers.push('product_stock_buckets_not_validated');
    if (!contracts.variationStock.matched) blockers.push('controlled_variation_stock_not_matched');
    if (!contracts.variationStock.stockBucketsValid) blockers.push('variation_stock_buckets_not_validated');
  }

  if (capability === 'price') {
    if (!contracts.products.matched) blockers.push('controlled_product_not_matched_for_price');
    if (!contracts.products.wholesalePriceNumeric) blockers.push('product_wholesale_price_not_numeric');
    if (!contracts.variations.matched) blockers.push('controlled_variation_not_matched_for_price');
    if (!contracts.variations.wholesalePriceNumeric) blockers.push('variation_wholesale_price_not_numeric');
  }

  return blockers;
}

/**
 * Reviews sanitized BigBuy sandbox probe evidence without changing runtime state.
 *
 * A CANDIDATE_EVIDENCE_COMPLETE decision means only that the supplied evidence
 * satisfies this narrow evidence checklist. It is not a verified capability,
 * adapter advertisement, hosted activation, Production approval or permission
 * to execute automated commerce.
 */
export function assessBigBuySandboxProbeEvidence(
  value: unknown,
): SupplierAdapterResult<BigBuySandboxEvidenceAssessmentV1> {
  const parsed = parseProbeEvidence(value);
  if (!parsed.ok) return parsed;

  const sharedBlockers = globalBlockers(parsed.data);
  const decisions = BIGBUY_READ_EVIDENCE_CAPABILITIES.map(capability => {
    const blockers = [...sharedBlockers, ...capabilityBlockers(capability, parsed.data)];
    return {
      capability,
      status: blockers.length === 0 ? 'CANDIDATE_EVIDENCE_COMPLETE' : 'BLOCKED',
      blockers,
      registryPromotionAllowed: false,
      automatedExecutionAllowed: false,
    } as const satisfies BigBuyEvidenceCapabilityDecisionV1;
  });

  return {
    ok: true,
    data: {
      interfaceVersion: BIGBUY_EVIDENCE_ASSESSMENT_INTERFACE_VERSION,
      provider: 'bigbuy',
      sourceGate: BIGBUY_SANDBOX_EVIDENCE_GATE,
      environment: 'sandbox',
      host: BIGBUY_SANDBOX_HOST,
      manualReviewRequired: true,
      automaticRegistryPromotionPerformed: false,
      decisions,
    },
  };
}
