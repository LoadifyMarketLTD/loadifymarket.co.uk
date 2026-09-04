import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown): HandlerEvent {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer valid-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/create-shipment',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/create-shipment',
  };
}

describe('Loadify shipping carrier policy', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function installMocks() {
    const rpc = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      from: vi.fn((table: string) => {
        if (table !== 'users') throw new Error(`Unexpected table before carrier rejection: ${table}`);
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller', isActive: true }, error: null }),
        };
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/orderTransitionGuards', () => ({
      enforcePaymentBackedTransition: vi.fn(),
    }));

    return { rpc };
  }

  it('rejects new shipments for carriers outside Royal Mail and Evri', async () => {
    const { rpc } = installMocks();
    const { handler } = await import('../create-shipment');

    const res = await handler(
      makeEvent({ order_id: 'order-1', courier_name: 'DHL', tracking_number: 'TRACK-1' }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('Royal Mail and Evri');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects blank carrier names instead of silently creating an unclassified shipment', async () => {
    const { rpc } = installMocks();
    const { handler } = await import('../create-shipment');

    const res = await handler(
      makeEvent({ order_id: 'order-1', courier_name: '   ', tracking_number: 'TRACK-1' }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps checkout and seller shipment creation constrained to Royal Mail and Evri', () => {
    const checkoutSource = readFileSync(
      path.resolve(process.cwd(), 'netlify/functions/create-checkout.ts'),
      'utf8',
    );
    const sellerShipmentsSource = readFileSync(
      path.resolve(process.cwd(), 'src/pages/pixel-perfect/seller/SellerShipments.tsx'),
      'utf8',
    );

    expect(checkoutSource).toContain("const LOADIFY_SUPPORTED_CARRIERS = new Set(['Royal Mail', 'Evri'])");
    expect(checkoutSource).toContain('courier, shipping_rates(price)');
    expect(checkoutSource).toContain('!LOADIFY_SUPPORTED_CARRIERS.has(method.courier.trim())');
    expect(sellerShipmentsSource).toContain('<SelectItem value="Royal Mail">Royal Mail</SelectItem>');
    expect(sellerShipmentsSource).toContain('<SelectItem value="Evri">Evri</SelectItem>');
    expect(sellerShipmentsSource).not.toContain('Royal Mail, DPD, UPS');
  });
});
