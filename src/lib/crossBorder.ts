import type { CurrencyCode } from './money';
import type { MarketCode } from './marketConfig';

export type SupportedCountryCode = MarketCode;
export type CrossBorderDecisionContext = 'display' | 'offer' | 'checkout' | 'return';
export type CrossBorderDecisionResult = 'eligible' | 'blocked' | 'review_required';

export const CROSS_BORDER_BLOCKER_CODES = [
  'ROUTE_DISABLED',
  'ROUTE_PRELAUNCH',
  'ROUTE_SUSPENDED',
  'SELLER_MARKET_UNSUPPORTED',
  'SELLER_DELIVERY_MARKET_UNSUPPORTED',
  'SELLER_ACCOUNT_UNAVAILABLE',
  'SUPPLIER_MARKET_UNSUPPORTED',
  'SUPPLIER_DELIVERY_MARKET_UNSUPPORTED',
  'ACTOR_ROUTE_CAPABILITY_MISSING',
  'ACTOR_ROUTE_CAPABILITY_UNVERIFIED',
  'DISPATCH_LOCATION_MISSING',
  'DISPATCH_LOCATION_UNVERIFIED',
  'INVENTORY_LOCATION_MISSING',
  'INSUFFICIENT_STOCK',
  'MARKET_OFFER_MISSING',
  'MARKET_PRICE_EVIDENCE_INCOMPLETE',
  'FX_EVIDENCE_MISSING',
  'SHIPPING_ROUTE_UNAVAILABLE',
  'SHIPPING_SERVICE_UNAVAILABLE',
  'SHIPMENT_PROFILE_UNSUPPORTED',
  'TAX_READINESS_INCOMPLETE',
  'CUSTOMS_READINESS_INCOMPLETE',
  'EORI_EVIDENCE_MISSING',
  'IMPORT_RESPONSIBILITY_UNRESOLVED',
  'PRODUCT_MARKETABILITY_UNVERIFIED',
  'SELLER_PRODUCT_COMPLIANCE_EVIDENCE_MISSING',
  'GPSR_EVIDENCE_INCOMPLETE',
  'RESPONSIBLE_PERSON_EVIDENCE_MISSING',
  'LOCAL_LANGUAGE_SAFETY_INFO_MISSING',
  'PRODUCT_ROUTE_RESTRICTED',
  'PAYMENT_MARKET_DISABLED',
  'PAYMENT_CURRENCY_UNSUPPORTED',
  'PAYMENT_READINESS_INCOMPLETE',
  'LEGAL_POLICY_READINESS_INCOMPLETE',
  'RETURN_ROUTE_UNAVAILABLE',
  'RETURN_DESTINATION_MISSING',
] as const;

export type CrossBorderBlockerCode = typeof CROSS_BORDER_BLOCKER_CODES[number];

export interface CrossBorderBlocker {
  code: CrossBorderBlockerCode;
  domain:
    | 'route'
    | 'actor'
    | 'inventory'
    | 'pricing'
    | 'shipping'
    | 'tax'
    | 'customs'
    | 'compliance'
    | 'payment'
    | 'returns';
  message?: string;
}

export interface CrossBorderCurrencySnapshot {
  listing: CurrencyCode;
  buyerDisplay: CurrencyCode;
  transaction: CurrencyCode;
  settlement: CurrencyCode;
}

export interface CrossBorderDecision {
  routeKey: string;
  originCountry: SupportedCountryCode;
  destinationCountry: SupportedCountryCode;
  destinationMarket: MarketCode;
  context: CrossBorderDecisionContext;
  result: CrossBorderDecisionResult;
  displayEligible: boolean;
  offerEligible: boolean;
  shippingEligible: boolean;
  checkoutEligible: boolean;
  returnEligible: boolean;
  blockers: CrossBorderBlocker[];
  currencies?: Partial<CrossBorderCurrencySnapshot>;
  selectedDispatchLocationId?: string;
  selectedInventoryPositionId?: string;
  selectedShippingServiceId?: string;
  evidenceVersions?: Record<string, string | number | null>;
  interfaceVersion: number;
}

export function buildRouteKey(
  originCountry: SupportedCountryCode,
  destinationCountry: SupportedCountryCode,
): string {
  return `${originCountry}-${destinationCountry}`;
}

export function isDomesticRoute(routeKey: string): boolean {
  const [origin, destination, ...rest] = routeKey.split('-');
  return rest.length === 0 && Boolean(origin) && origin === destination;
}
