import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { mutateSupplierImport } from '../_shared/supplierImport';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const runtimeGuards = repo('supabase/624_supplier_import_runtime_guards.sql');
const shared = repo('netlify/functions/_shared/supplierImport.ts');
const adminApi = repo('netlify/functions/admin-supplier-import.ts');

const ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BATCH_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Phase F runtime import closure', () => {
  it('enforces the Phase C import kill switch before a batch can be created', () => {
    expect(runtimeGuards).toContain("public.server_supplier_commerce_control_decision_v1(");
    expect(runtimeGuards).toContain("'import'");
    expect(runtimeGuards).toContain("'providerRef'");
    expect(runtimeGuards).toContain("'supplierRef'");
    expect(runtimeGuards).toContain('supplier import blocked by Phase C control');
    expect(runtimeGuards).toContain('BEFORE INSERT ON private.supplier_import_batches');
    expect(runtimeGuards).not.toContain('SET enabled = true');
  });

  it('makes normalized fact recording idempotent', () => {
    expect(runtimeGuards).toContain('fact_idempotency_key text');
    expect(runtimeGuards).toContain('normalized_product_fact_idempotency_unique');
    expect(runtimeGuards).toContain('server_record_supplier_import_fact_v1');
    expect(runtimeGuards).toContain('factIdempotencyKey is required');
    expect(runtimeGuards).toContain('ON CONFLICT (import_item_id, fact_idempotency_key)');
    expect(shared).toContain("action === 'record_normalized_fact'");
    expect(shared).toContain("client.rpc('server_record_supplier_import_fact_v1'");
  });

  it('provides durable resumable checkpoints without rewriting terminal batches', () => {
    expect(runtimeGuards).toContain('server_checkpoint_supplier_import_v1');
    expect(runtimeGuards).toContain('last_checkpoint = v_checkpoint');
    expect(runtimeGuards).toContain('resume_token = COALESCE');
    expect(runtimeGuards).toContain("v_batch.status IN ('accepted','rejected','failed')");
    expect(runtimeGuards).toContain('terminal import batch cannot be resumed');
    expect(shared).toContain("'checkpoint_import_batch'");
    expect(adminApi).toContain("'checkpoint_import_batch'");
  });

  it('routes fact writes through the dedicated idempotent server boundary', async () => {
    const rpc = vi.fn(async () => ({ data: { ok: true, factId: 'fact-1', idempotent: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await expect(mutateSupplierImport(client, ACTOR_ID, 'record_normalized_fact', {
      importItemId: BATCH_ID,
      canonicalProductId: BATCH_ID,
      factKey: 'material',
      factValue: 'steel',
      factIdempotencyKey: 'source:item:material:v1',
      sourceClass: 'supplier_source',
    })).resolves.toEqual({ ok: true, data: { ok: true, factId: 'fact-1', idempotent: true } });

    expect(rpc).toHaveBeenCalledWith('server_record_supplier_import_fact_v1', {
      p_actor_id: ACTOR_ID,
      p_payload: expect.objectContaining({ factIdempotencyKey: 'source:item:material:v1' }),
    });
  });

  it('routes checkpoints through the dedicated resumable server boundary', async () => {
    const rpc = vi.fn(async () => ({ data: { ok: true, batchId: BATCH_ID, resumable: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await expect(mutateSupplierImport(client, ACTOR_ID, 'checkpoint_import_batch', {
      batchId: BATCH_ID,
      checkpoint: 'compliance_review',
      resumeToken: 'page:42',
    })).resolves.toEqual({ ok: true, data: { ok: true, batchId: BATCH_ID, resumable: true } });

    expect(rpc).toHaveBeenCalledWith('server_checkpoint_supplier_import_v1', {
      p_actor_id: ACTOR_ID,
      p_batch_id: BATCH_ID,
      p_checkpoint: 'compliance_review',
      p_resume_token: 'page:42',
    });
  });

  it('fails checkpoint validation closed before calling the DB', async () => {
    const rpc = vi.fn();
    const client = { rpc } as unknown as SupabaseClient;
    await expect(mutateSupplierImport(client, ACTOR_ID, 'checkpoint_import_batch', {
      batchId: 'not-a-uuid',
      checkpoint: '',
    })).resolves.toEqual({ ok: false, error: 'valid batchId and checkpoint are required' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
