export const RO_MARKETPLACE_TAX_INTERFACE_VERSION = 1 as const;

export type RoMarketplaceOriginScope = 'RO' | 'EU' | 'NON_EU';
export type RoMarketplaceSellerTaxStatus =
  | 'private_non_taxable_reviewed'
  | 'taxable_eu'
  | 'taxable_non_eu';
export type RoMarketplaceSupplyClass =
  | 'domestic_goods'
  | 'intra_eu_distance_goods'
  | 'import_distance_goods';
export type RoMarketplaceConsignmentValueClass =
  | 'not_applicable'
  | 'lte_150_eur'
  | 'gt_150_eur';
export type RoMarketplaceProductVatClass =
  | 'standard'
  | 'reduced_11'
  | 'outside_scope_reviewed';
export type RoMarketplaceInterfaceVatRole = 'underlying_supplier' | 'deemed_supplier';
export type RoMarketplaceVatScheme =
  | 'none_reviewed'
  | 'ro_domestic'
  | 'union_oss'
  | 'ioss'
  | 'import_vat_non_ioss';
export type RoMarketplacePriceTaxMode = 'no_vat' | 'vat_inclusive';

export interface RoMarketplaceTaxRuleEvidence {
  eligible: boolean;
  reason: string;
  market?: string;
  destinationCountry?: string;
  originScope?: RoMarketplaceOriginScope;
  sellerTaxStatus?: RoMarketplaceSellerTaxStatus;
  buyerTaxStatus?: 'consumer_non_taxable';
  supplyClass?: RoMarketplaceSupplyClass;
  consignmentValueClass?: RoMarketplaceConsignmentValueClass;
  productVatClass?: RoMarketplaceProductVatClass;
  interfaceVatRole?: RoMarketplaceInterfaceVatRole;
  vatScheme?: RoMarketplaceVatScheme;
  vatRateBps?: 0 | 1100 | 2100;
  priceTaxMode?: RoMarketplacePriceTaxMode;
  legalBasisVersion?: string;
  legalEffectiveFrom?: string;
  legalEffectiveTo?: string | null;
  evidenceHash?: string;
  reviewedAt?: string;
  interfaceVersion?: number;
}

export type RoMarketplaceTaxContractDecision =
  | {
      ok: true;
      snapshot: {
        version: 1;
        jurisdiction: 'RO';
        destinationCountry: 'RO';
        originScope: RoMarketplaceOriginScope;
        sellerTaxStatus: RoMarketplaceSellerTaxStatus;
        buyerTaxStatus: 'consumer_non_taxable';
        supplyClass: RoMarketplaceSupplyClass;
        consignmentValueClass: RoMarketplaceConsignmentValueClass;
        productVatClass: RoMarketplaceProductVatClass;
        interfaceVatRole: RoMarketplaceInterfaceVatRole;
        vatScheme: RoMarketplaceVatScheme;
        vatRateBps: 0 | 1100 | 2100;
        priceTaxMode: RoMarketplacePriceTaxMode;
        legalBasisVersion: string;
        evidenceHash: string;
        reviewedAt: string;
      };
    }
  | {
      ok: false;
      code:
        | 'RO_TAX_EVIDENCE_MISSING'
        | 'RO_TAX_EVIDENCE_MALFORMED'
        | 'RO_TAX_DESTINATION_UNSUPPORTED';
      message: string;
    };

const isNonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function resolveRoMarketplaceTaxContract(
  evidence: RoMarketplaceTaxRuleEvidence,
): RoMarketplaceTaxContractDecision {
  if (evidence.market && evidence.market !== 'RO') {
    return {
      ok: false,
      code: 'RO_TAX_DESTINATION_UNSUPPORTED',
      message: 'Romania Marketplace Seller tax evidence is not valid for this market.',
    };
  }

  if (!evidence.eligible) {
    return {
      ok: false,
      code: 'RO_TAX_EVIDENCE_MISSING',
      message: 'Reviewed Romanian Marketplace Seller tax evidence is required before checkout can be enabled.',
    };
  }

  const validRate = evidence.vatRateBps === 0
    || evidence.vatRateBps === 1100
    || evidence.vatRateBps === 2100;

  const complete =
    evidence.interfaceVersion === RO_MARKETPLACE_TAX_INTERFACE_VERSION
    && evidence.market === 'RO'
    && evidence.destinationCountry === 'RO'
    && Boolean(evidence.originScope)
    && Boolean(evidence.sellerTaxStatus)
    && evidence.buyerTaxStatus === 'consumer_non_taxable'
    && Boolean(evidence.supplyClass)
    && Boolean(evidence.consignmentValueClass)
    && Boolean(evidence.productVatClass)
    && Boolean(evidence.interfaceVatRole)
    && Boolean(evidence.vatScheme)
    && validRate
    && Boolean(evidence.priceTaxMode)
    && isNonEmpty(evidence.legalBasisVersion)
    && isNonEmpty(evidence.evidenceHash)
    && isNonEmpty(evidence.reviewedAt);

  if (!complete) {
    return {
      ok: false,
      code: 'RO_TAX_EVIDENCE_MALFORMED',
      message: 'Romanian Marketplace Seller tax evidence is incomplete or malformed.',
    };
  }

  if (
    (evidence.priceTaxMode === 'no_vat' && evidence.vatRateBps !== 0)
    || (evidence.priceTaxMode === 'vat_inclusive' && evidence.vatRateBps === 0)
  ) {
    return {
      ok: false,
      code: 'RO_TAX_EVIDENCE_MALFORMED',
      message: 'Romanian Marketplace Seller tax evidence contains an inconsistent VAT rate and price treatment.',
    };
  }

  return {
    ok: true,
    snapshot: {
      version: RO_MARKETPLACE_TAX_INTERFACE_VERSION,
      jurisdiction: 'RO',
      destinationCountry: 'RO',
      originScope: evidence.originScope!,
      sellerTaxStatus: evidence.sellerTaxStatus!,
      buyerTaxStatus: 'consumer_non_taxable',
      supplyClass: evidence.supplyClass!,
      consignmentValueClass: evidence.consignmentValueClass!,
      productVatClass: evidence.productVatClass!,
      interfaceVatRole: evidence.interfaceVatRole!,
      vatScheme: evidence.vatScheme!,
      vatRateBps: evidence.vatRateBps!,
      priceTaxMode: evidence.priceTaxMode!,
      legalBasisVersion: evidence.legalBasisVersion!,
      evidenceHash: evidence.evidenceHash!,
      reviewedAt: evidence.reviewedAt!,
    },
  };
}
