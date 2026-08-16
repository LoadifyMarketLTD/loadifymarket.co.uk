import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown): HandlerEvent {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer admin-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/save-admin-settings',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/save-admin-settings',
  };
}

describe('save-admin-settings product approval cleanup', () => {
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

  it('strips autoApproveProducts while preserving real feature flags', async () => {
    const upserts: Array<{ key: string; value: unknown }> = [];
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'admin-1',
              app_metadata: { role: 'admin' },
            },
          },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'platform_settings') {
          return {
            upsert: vi.fn((payload: { key: string; value: unknown }) => {
              upserts.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        };
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabase),
    }));

    const { handler } = await import('../save-admin-settings');
    const res = await handler(
      makeEvent({
        settings: [
          {
            key: 'feature_flags',
            value: {
              sellerRegistration: true,
              reviewSystem: true,
              requireCompanyApproval: false,
              autoApproveProducts: false,
            },
          },
        ],
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toEqual({
      key: 'feature_flags',
      value: {
        sellerRegistration: true,
        reviewSystem: true,
        requireCompanyApproval: false,
      },
    });
  });
});
