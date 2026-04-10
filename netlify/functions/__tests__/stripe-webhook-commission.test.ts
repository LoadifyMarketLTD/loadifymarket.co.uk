/**
 * Unit tests for the dynamic commission-rate logic in stripe-webhook.ts.
 *
 * The platform runs a 0% commission promotion until 31 December 2026 23:59:59 GMT.
 * After that date the normal 7% rate must resume automatically.
 *
 * We use vi.useFakeTimers() + vi.setSystemTime() to pin Date.now() without
 * touching the real system clock.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCommissionRate, ZERO_COMMISSION_PROMO_END_UTC } from '../stripe-webhook';

describe('getCommissionRate – 0% commission promotion', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 one second before the promo deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(ZERO_COMMISSION_PROMO_END_UTC - 1_000);
    expect(getCommissionRate()).toBe(0);
  });

  it('returns 0 one day before the promo deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(ZERO_COMMISSION_PROMO_END_UTC - 24 * 60 * 60 * 1_000);
    expect(getCommissionRate()).toBe(0);
  });

  it('returns 0.07 exactly at the promo deadline (boundary — promo has ended)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(ZERO_COMMISSION_PROMO_END_UTC);
    expect(getCommissionRate()).toBe(0.07);
  });

  it('returns 0.07 one second after the promo deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(ZERO_COMMISSION_PROMO_END_UTC + 1_000);
    expect(getCommissionRate()).toBe(0.07);
  });

  it('returns 0.07 well after the promo has ended', () => {
    vi.useFakeTimers();
    // 1 January 2027 00:00:00 UTC — one day after the deadline
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z').getTime());
    expect(getCommissionRate()).toBe(0.07);
  });

  it('PROMO_END deadline is 31 December 2026 23:59:59 UTC (= 23:59:59 GMT)', () => {
    const d = new Date(ZERO_COMMISSION_PROMO_END_UTC);
    expect(d.toISOString()).toBe('2026-12-31T23:59:59.000Z');
  });
});
