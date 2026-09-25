import { beforeEach, describe, expect, it } from 'vitest';
import { MARKET_CONFIG, readMarket, writeMarket } from './marketConfig';

describe('marketConfig', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('defaults safely to GB', () => {
    expect(readMarket()).toBe('GB');
    expect(MARKET_CONFIG.GB.currency).toBe('GBP');
  });

  it('persists Romania and updates document language', () => {
    writeMarket('RO');
    expect(readMarket()).toBe('RO');
    expect(document.documentElement.lang).toBe('ro');
    expect(MARKET_CONFIG.RO.currency).toBe('RON');
  });

  it('falls back to GB for an invalid stored market', () => {
    window.localStorage.setItem('loadify-market-country', 'XX');
    expect(readMarket()).toBe('GB');
  });
});
