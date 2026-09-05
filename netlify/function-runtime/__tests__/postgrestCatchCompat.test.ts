// @vitest-environment node

import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { installPostgrestCatchCompat } from '../postgrestCatchCompat';

type LegacyMutationResult = {
  data: Array<{ id: string }>;
  error: null;
  count: number | null;
  status: number;
  statusText: string;
};

type LegacyMutationBuilder = {
  then: (onFulfilled: (result: LegacyMutationResult) => unknown) => Promise<unknown>;
  select: (
    columns: string,
    options: { count: 'exact'; head: true },
  ) => Promise<LegacyMutationResult>;
};

describe('postgrestCatchCompat', () => {
  it('adds Promise-style catch to RPC and table builders without executing them', () => {
    installPostgrestCatchCompat();

    const client = createClient('https://example.supabase.co', 'public-anon-probe-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const rpcBuilder = client.rpc('__loadify_probe_rpc__') as unknown as { catch?: unknown; then?: unknown };
    const tableBuilder = client.from('__loadify_probe__').select('*') as unknown as { catch?: unknown; then?: unknown };

    expect(typeof rpcBuilder.then).toBe('function');
    expect(typeof rpcBuilder.catch).toBe('function');
    expect(typeof tableBuilder.then).toBe('function');
    expect(typeof tableBuilder.catch).toBe('function');
  });

  it('derives an exact mutation count from returned reservation rows for the legacy checkout call shape', async () => {
    installPostgrestCatchCompat();

    const client = createClient('https://example.supabase.co', 'public-anon-probe-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const builder = client
      .from('__loadify_probe__')
      .update({ marker: true })
      .eq('id', '__probe__') as unknown as LegacyMutationBuilder;

    Object.defineProperty(builder, 'then', {
      configurable: true,
      value(onFulfilled: (result: LegacyMutationResult) => unknown) {
        return Promise.resolve(onFulfilled({
          data: [{ id: '__probe__' }],
          error: null,
          count: null,
          status: 200,
          statusText: 'OK',
        }));
      },
    });

    const result = await builder.select('id', { count: 'exact', head: true });
    expect(result.error).toBeNull();
    expect(result.count).toBe(1);
    expect(result.data).toEqual([{ id: '__probe__' }]);
  });

  it('keeps a zero-row reservation conflict at count zero', async () => {
    installPostgrestCatchCompat();

    const client = createClient('https://example.supabase.co', 'public-anon-probe-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const builder = client
      .from('__loadify_probe__')
      .update({ marker: true })
      .eq('id', '__missing__') as unknown as LegacyMutationBuilder;

    Object.defineProperty(builder, 'then', {
      configurable: true,
      value(onFulfilled: (result: LegacyMutationResult) => unknown) {
        return Promise.resolve(onFulfilled({
          data: [],
          error: null,
          count: null,
          status: 200,
          statusText: 'OK',
        }));
      },
    });

    const result = await builder.select('id', { count: 'exact', head: true });
    expect(result.error).toBeNull();
    expect(result.count).toBe(0);
    expect(result.data).toEqual([]);
  });
});
