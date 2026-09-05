// @vitest-environment node

import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { installPostgrestCatchCompat } from '../postgrestCatchCompat';

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
});
