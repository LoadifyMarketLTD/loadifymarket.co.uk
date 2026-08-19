import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const limit = vi.fn();
  const order = vi.fn(() => ({ limit }));
  const lt = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ lt }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table !== 'payment_sessions') throw new Error(`Unexpected table: ${table}`);
    return { select };
  });

  return { rpc, limit, order, lt, eq, select, from };
});

vi.mock('@netlify/functions', () => ({
  schedule: vi.fn((_cron: string, callback: () => unknown) => callback),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { retrieve: vi.fn(), expire: vi.fn() } },
    paymentIntents: { retrieve: vi.fn(), cancel: vi.fn() },
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mocks.rpc,
    from: mocks.from,
  })),
}));

describe('payment-session-cleanup scheduled order cleanup', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_cleanup';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

    mocks.rpc.mockReset();
    mocks.limit.mockReset();
    mocks.limit.mockResolvedValue({ data: [], error: null });
    mocks.from.mockClear();
    mocks.select.mockClear();
    mocks.eq.mockClear();
    mocks.lt.mockClear();
    mocks.order.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('releases stale awaiting-payment orders even when no payment sessions exist', async () => {
    mocks.rpc.mockResolvedValue({ data: 1, error: null });
    const { handler } = await import('../payment-session-cleanup');

    const result = await handler({} as never, {} as never);

    expect(mocks.rpc).toHaveBeenCalledWith('release_stale_unpaid_listing_locks');
    expect(mocks.from).toHaveBeenCalledWith('payment_sessions');
    expect(result).toEqual({ statusCode: 200 });
  });

  it('keeps payment-session cleanup running when stale-order cleanup fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'rpc unavailable' } });
    const { handler } = await import('../payment-session-cleanup');

    const result = await handler({} as never, {} as never);

    expect(consoleError).toHaveBeenCalledWith(
      'payment-session-cleanup: stale unpaid order cleanup failed:',
      'rpc unavailable',
    );
    expect(mocks.from).toHaveBeenCalledWith('payment_sessions');
    expect(result).toEqual({ statusCode: 200 });
    consoleError.mockRestore();
  });
});
