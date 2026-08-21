import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase/652_supplier_refund_idempotency_closure.sql'), 'utf8');

describe('Phase L refund replay idempotency closure', () => {
  it('resolves exact event-key replay before cumulative over-refund arithmetic', () => {
    const replayLookup = sql.indexOf('SELECT * INTO v_ref FROM private.supplier_customer_refund_evidence WHERE event_key=BTRIM(p_event_key)');
    const cumulativeLookup = sql.indexOf('SELECT COALESCE(SUM(amount),0) INTO v_total');
    expect(replayLookup).toBeGreaterThan(-1);
    expect(cumulativeLookup).toBeGreaterThan(replayLookup);
    expect(sql).toContain("'replayed',true");
  });

  it('rejects a reused event key when immutable financial identity differs', () => {
    expect(sql).toContain('customer refund evidence idempotency collision');
    expect(sql).toContain('v_ref.external_refund_ref<>BTRIM(p_external_refund_ref)');
    expect(sql).toContain('v_ref.amount<>p_amount');
    expect(sql).toContain('v_ref.currency<>upper(BTRIM(p_currency))');
  });

  it('keeps the over-refund guard and append-only ledger event after replay resolution', () => {
    expect(sql).toContain('cumulative customer refund exceeds customer order total');
    expect(sql).toContain("'phase-l-refund:'");
    expect(sql).toContain("'customer_refund','customer_refund'");
  });
});
