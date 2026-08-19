import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(
  httpMethod: string,
  path: string,
  body: unknown,
  authorization = 'Bearer valid-token',
): HandlerEvent {
  return {
    httpMethod,
    body: body === undefined ? null : JSON.stringify(body),
    headers: { authorization },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: `http://localhost${path}`,
  };
}

describe('canonical shipment write boundary', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    process.env.URL = 'https://test.example';
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function installSharedMocks() {
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/orderTransitionGuards', () => ({
      enforcePaymentBackedTransition: vi.fn().mockResolvedValue({
        ok: true,
        statusCode: 200,
        hasValidPaymentEvidence: true,
        paymentEvidenceSource: 'order.stripePaymentIntentId',
        requiresPaymentEvidence: true,
        allowedNonStripeFlow: null,
      }),
    }));
  }

  it('rejects fulfilment-time attempts to rewrite paid shipping terms', async () => {
    const rpc = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      from: vi.fn((table: string) => {
        if (table !== 'users') throw new Error(`Unexpected table before rejection: ${table}`);
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
        };
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    installSharedMocks();

    const { handler } = await import('../create-shipment');
    const res = await handler(
      makeEvent('POST', '/.netlify/functions/create-shipment', {
        order_id: 'order-1',
        shipping_cost: 999,
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toContain('fixed at checkout');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('routes shipment create/update through the atomic server RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        shipment: { id: 'shipment-1', order_id: 'order-1' },
        created: true,
        changed: true,
      },
      error: null,
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'order-1',
                orderNumber: 'LM-1',
                status: 'paid',
                productId: 'product-1',
                sellerId: 'seller-1',
                buyerId: 'buyer-1',
                stripePaymentIntentId: 'pi_1',
                rfqId: null,
                rfqResponseId: null,
                escrowStatus: 'held',
              },
              error: null,
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'product-1', listingContext: 'product' },
              error: null,
            }),
          };
        }
        throw new Error(`Direct shipment table mutation is not allowed in this handler: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    installSharedMocks();

    const { handler } = await import('../create-shipment');
    const res = await handler(
      makeEvent('POST', '/.netlify/functions/create-shipment', {
        order_id: 'order-1',
        courier_name: 'Carrier',
        tracking_number: 'TRACK-1',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).changed).toBe(true);
    expect(rpc).toHaveBeenCalledWith('server_upsert_shipment', {
      p_order_id: 'order-1',
      p_actor_id: 'seller-1',
      p_courier_name: 'Carrier',
      p_set_courier_name: true,
      p_tracking_number: 'TRACK-1',
      p_set_tracking_number: true,
      p_dispatched_at: null,
      p_set_dispatched_at: false,
    });
  });

  it('routes shipment status + audit + order mapping through one atomic RPC', async () => {
    const notificationInsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: { shipment: { id: 'shipment-1', status: 'Processing' }, changed: true },
      error: null,
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
          };
        }
        if (table === 'shipments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'shipment-1',
                order_id: 'order-1',
                seller_id: 'seller-1',
                buyer_id: 'buyer-1',
                orders: {
                  id: 'order-1',
                  orderNumber: 'LM-1',
                  status: 'paid',
                  productId: 'product-1',
                  stripePaymentIntentId: 'pi_1',
                  rfqId: null,
                  rfqResponseId: null,
                  buyerId: 'buyer-1',
                },
              },
              error: null,
            }),
          };
        }
        if (table === 'notifications') {
          return { insert: notificationInsert };
        }
        throw new Error(`Unexpected direct table access after transition: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    installSharedMocks();

    const { handler } = await import('../update-shipment-status');
    const res = await handler(
      makeEvent(
        'PUT',
        '/.netlify/functions/shipments/shipment-1/status',
        { status: 'Processing', message: 'Packing complete' },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).changed).toBe(true);
    expect(rpc).toHaveBeenCalledWith('server_transition_shipment', {
      p_shipment_id: 'shipment-1',
      p_actor_id: 'seller-1',
      p_status: 'Processing',
      p_message: 'Packing complete',
    });
    expect(notificationInsert).toHaveBeenCalledTimes(1);
  });

  it('suppresses duplicate user-facing side effects on an idempotent status retry', async () => {
    const notificationInsert = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const rpc = vi.fn().mockResolvedValue({
      data: { shipment: { id: 'shipment-1', status: 'Delivered' }, changed: false },
      error: null,
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
          };
        }
        if (table === 'shipments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'shipment-1',
                order_id: 'order-1',
                seller_id: 'seller-1',
                buyer_id: 'buyer-1',
                orders: {
                  id: 'order-1',
                  orderNumber: 'LM-1',
                  status: 'delivered',
                  productId: 'product-1',
                  stripePaymentIntentId: 'pi_1',
                  rfqId: null,
                  rfqResponseId: null,
                  buyerId: 'buyer-1',
                },
              },
              error: null,
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'product-1', listingContext: 'product' },
              error: null,
            }),
          };
        }
        if (table === 'notifications') {
          return { insert: notificationInsert };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    installSharedMocks();

    const { handler } = await import('../update-shipment-status');
    const res = await handler(
      makeEvent(
        'PUT',
        '/.netlify/functions/shipments/shipment-1/status',
        { status: 'Delivered' },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).changed).toBe(false);
    expect(notificationInsert).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires shipped payment evidence for Out for Delivery', async () => {
    const paymentGuard = vi.fn().mockResolvedValue({
      ok: true,
      statusCode: 200,
      hasValidPaymentEvidence: true,
      paymentEvidenceSource: 'order.stripePaymentIntentId',
      requiresPaymentEvidence: true,
      allowedNonStripeFlow: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: { shipment: { id: 'shipment-1', status: 'Out for Delivery' }, changed: true },
      error: null,
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
          };
        }
        if (table === 'shipments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'shipment-1',
                order_id: 'order-1',
                seller_id: 'seller-1',
                buyer_id: 'buyer-1',
                orders: {
                  id: 'order-1',
                  orderNumber: 'LM-1',
                  status: 'paid',
                  productId: 'product-1',
                  stripePaymentIntentId: 'pi_1',
                  rfqId: null,
                  rfqResponseId: null,
                  buyerId: 'buyer-1',
                },
              },
              error: null,
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'product-1', listingContext: 'product' },
              error: null,
            }),
          };
        }
        if (table === 'notifications') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/orderTransitionGuards', () => ({
      enforcePaymentBackedTransition: paymentGuard,
    }));

    const { handler } = await import('../update-shipment-status');
    const res = await handler(
      makeEvent(
        'PUT',
        '/.netlify/functions/shipments/shipment-1/status',
        { status: 'Out for Delivery' },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(paymentGuard).toHaveBeenCalledWith(expect.objectContaining({ nextStatus: 'shipped' }));
  });

  it('does not mint a new POD upload URL after canonical proof is attached', async () => {
    const createSignedUploadUrl = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc: vi.fn(),
      storage: {
        from: vi.fn(() => ({ createSignedUploadUrl })),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
          };
        }
        if (table === 'shipments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'shipment-1',
                seller_id: 'seller-1',
                buyer_id: 'buyer-1',
                status: 'Delivered',
                proof_of_delivery_url: 'shipment-1/shipment-1-1.jpg',
              },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));

    const { handler } = await import('../upload-proof-of-delivery');
    const res = await handler(
      makeEvent(
        'POST',
        '/.netlify/functions/shipments/shipment-1/proof',
        { contentType: 'image/jpeg', fileSize: 100 },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(409);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('treats confirmation of the exact canonical POD path as an idempotent success', async () => {
    const filePath = 'shipment-1/shipment-1-123.jpg';
    const rpc = vi.fn();
    const remove = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
          };
        }
        if (table === 'shipments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'shipment-1',
                seller_id: 'seller-1',
                buyer_id: 'buyer-1',
                status: 'Delivered',
                proof_of_delivery_url: filePath,
              },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));

    const { handler } = await import('../upload-proof-of-delivery');
    const res = await handler(
      makeEvent('PUT', '/.netlify/functions/shipments/shipment-1/proof', { filePath }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).attached).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes an uploaded POD object when the atomic DB attachment is rejected', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const filePath = 'shipment-1/shipment-1-123.jpg';
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'proof is already attached' },
    });
    const storageApi = {
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'shipment-1-123.jpg', metadata: { size: 100, mimetype: 'image/jpeg' } }],
        error: null,
      }),
      download: vi.fn(),
      remove,
    };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } }, error: null }),
      },
      rpc,
      storage: { from: vi.fn(() => storageApi) },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'seller-1', role: 'seller' }, error: null }),
          };
        }
        if (table === 'shipments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'shipment-1',
                seller_id: 'seller-1',
                buyer_id: 'buyer-1',
                status: 'Delivered',
                proof_of_delivery_url: null,
              },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));

    const { handler } = await import('../upload-proof-of-delivery');
    const res = await handler(
      makeEvent('PUT', '/.netlify/functions/shipments/shipment-1/proof', { filePath }),
      {} as never,
    );

    expect(res.statusCode).toBe(409);
    expect(rpc).toHaveBeenCalledWith('server_attach_shipment_proof', {
      p_shipment_id: 'shipment-1',
      p_actor_id: 'seller-1',
      p_file_path: filePath,
    });
    expect(remove).toHaveBeenCalledWith([filePath]);
  });

  it('keeps the DB migration service-role-only, atomic, idempotent and one-shipment-per-order', () => {
    const sql = readFileSync(
      new URL('../../../supabase/607_lock_shipment_writes_to_server.sql', import.meta.url),
      'utf8',
    );

    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS shipments_one_per_order');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.server_upsert_shipment');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.server_transition_shipment');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.server_attach_shipment_proof');
    expect(sql).toContain("ARRAY['Dispatched', 'In Transit', 'Out for Delivery']");
    expect(sql).toContain("'changed', false");
    expect(sql).toContain("'attached', false");
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.server_upsert_shipment');
    expect(sql).toContain('TO service_role;');
    expect(sql).toContain('FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('proof of delivery is already attached and cannot be overwritten');
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER');
  });
});
