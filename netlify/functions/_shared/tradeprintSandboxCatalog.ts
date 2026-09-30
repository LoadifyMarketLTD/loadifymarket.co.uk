export interface TradeprintSandboxCatalogFamily {
  productName: string;
  rawVariantRows: number;
  sandboxAvailable: true;
  publicationAllowed: false;
}

/**
 * Verified against Tradeprint Connect Sandbox on 2026-09-29.
 * These are technical discovery candidates only. They do not imply
 * marketplace publication rights, production credentials, or commercial activation.
 */
export const TRADEPRINT_SANDBOX_CATALOG_FAMILIES: readonly TradeprintSandboxCatalogFamily[] = [
  { productName: 'Comp slips', rawVariantRows: 216, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Custom Roll - Top Backpack', rawVariantRows: 60, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Deskpads', rawVariantRows: 18, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Envelopes', rawVariantRows: 60, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Feather Flags', rawVariantRows: 311, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Flyers', rawVariantRows: 10565, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Folded & Laminated Leaflets', rawVariantRows: 80, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Folded Leaflets', rawVariantRows: 8825, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Letterheads', rawVariantRows: 216, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Long Run Posters', rawVariantRows: 56, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Mesh Banners', rawVariantRows: 91, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Perfect Bound Booklets', rawVariantRows: 185839, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'PVC Banners', rawVariantRows: 20, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Roller Banners', rawVariantRows: 49, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Standard BC', rawVariantRows: 66, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Teardrop Flags', rawVariantRows: 126, sandboxAvailable: true, publicationAllowed: false },
  { productName: 'Triplex BC', rawVariantRows: 4, sandboxAvailable: true, publicationAllowed: false },
] as const;

export const TRADEPRINT_SANDBOX_DISCOVERED_FAMILY_COUNT = TRADEPRINT_SANDBOX_CATALOG_FAMILIES.length;
export const TRADEPRINT_SANDBOX_DISCOVERED_VARIANT_ROW_COUNT = TRADEPRINT_SANDBOX_CATALOG_FAMILIES.reduce(
  (total, family) => total + family.rawVariantRows,
  0,
);

export interface TradeprintSandboxSelectedCandidate {
  family: 'Flyers';
  productKey: string;
  serviceLevel: 'Saver';
  quantity: number;
  productionData: Readonly<Record<string, string>>;
  sandboxObservedPriceGbp?: number;
  publicationAllowed: false;
  blockers: readonly string[];
}

/**
 * Operator-selected sandbox configuration captured for controlled mapping.
 * Sandbox prices are not production commercial truth and MUST NOT be published.
 */
export const TRADEPRINT_SANDBOX_SELECTED_CANDIDATES: readonly TradeprintSandboxSelectedCandidate[] = [
  {
    family: 'Flyers',
    productKey: 'PRD-WLPVQMTE',
    serviceLevel: 'Saver',
    quantity: 5000,
    productionData: {
      'Paper Type': '130gsm Art Paper Gloss Finish',
      Size: 'A5',
      'Sides Printed': 'Double Sided',
      Lamination: 'None',
      Sets: '1',
    },
    sandboxObservedPriceGbp: 75.50,
    publicationAllowed: false,
    blockers: [
      'production_credentials_required',
      'production_price_truth_required',
      'commercial_profile_required',
      'integration_profile_required',
      'verified_media_required',
      'approved_pricing_snapshot_required',
      'fresh_stock_or_availability_evidence_required',
    ],
  },
] as const;