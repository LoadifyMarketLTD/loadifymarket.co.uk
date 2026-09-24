import { beforeEach, describe, expect, it } from 'vitest';
import { marketFromHostname, resolveInitialMarket } from './marketResolver';

describe('market resolver', () => {
  beforeEach(() => window.localStorage.clear());

  it('maps Romanian domains to RO', () => {
    expect(marketFromHostname('loadifymarket.ro')).toBe('RO');
    expect(marketFromHostname('www.loadifymarket.ro')).toBe('RO');
  });

  it('maps UK domains to GB', () => {
    expect(marketFromHostname('loadifymarket.co.uk')).toBe('GB');
    expect(marketFromHostname('www.loadifymarket.co.uk')).toBe('GB');
  });

  it('returns null for unknown hosts', () => {
    expect(marketFromHostname('localhost')).toBeNull();
  });

  it('prioritises an explicit saved market choice', () => {
    window.localStorage.setItem('loadify-market-country', 'RO');
    expect(resolveInitialMarket()).toBe('RO');
  });
});
