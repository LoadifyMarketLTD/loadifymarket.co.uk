import { describe, expect, it } from 'vitest';
import {
  CROSS_BORDER_BLOCKER_CODES,
  buildRouteKey,
  isDomesticRoute,
} from './crossBorder';

describe('cross-border domain helpers', () => {
  it('builds directional route keys', () => {
    expect(buildRouteKey('GB', 'RO')).toBe('GB-RO');
    expect(buildRouteKey('RO', 'GB')).toBe('RO-GB');
  });

  it('distinguishes domestic from cross-border routes', () => {
    expect(isDomesticRoute('GB-GB')).toBe(true);
    expect(isDomesticRoute('RO-RO')).toBe(true);
    expect(isDomesticRoute('GB-RO')).toBe(false);
  });

  it('keeps explicit blocker codes for route and compliance failures', () => {
    expect(CROSS_BORDER_BLOCKER_CODES).toContain('ROUTE_PRELAUNCH');
    expect(CROSS_BORDER_BLOCKER_CODES).toContain('DISPATCH_LOCATION_MISSING');
    expect(CROSS_BORDER_BLOCKER_CODES).toContain('SELLER_PRODUCT_COMPLIANCE_EVIDENCE_MISSING');
    expect(CROSS_BORDER_BLOCKER_CODES).toContain('PAYMENT_READINESS_INCOMPLETE');
  });
});
