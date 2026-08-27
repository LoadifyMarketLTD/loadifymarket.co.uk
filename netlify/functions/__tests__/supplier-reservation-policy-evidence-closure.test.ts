import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/684_supplier_reservation_policy_evidence_closure.sql');
const deploy = repo('supabase/migrations/20260827135000_supplier_reservation_policy_evidence_closure.sql');

describe('Supplier Commerce Stage 5B reservation policy evidence closure', () => {
  it('keeps canonical and deploy SQL identical', () => {
    expect(deploy).toBe(canonical);
  });

  for (const sql of [canonical, deploy]) {
    it(`persists exact sync policy evidence in ${sql === canonical ? 'canonical' : 'deploy'} SQL`, () => {
      expect(sql).toContain("NULLIF(v_sync->>'policyVersion','') IS NULL");
      expect(sql).toContain("v_existing.sync_policy_version IS DISTINCT FROM (v_sync->>'policyVersion')::integer");
      expect(sql).toContain("(v_sync->>'policyVersion')::integer");
      expect(sql).toContain("'syncPolicyVersion',v_reservation.sync_policy_version");
      expect(sql).not.toContain("(v_checkout->>'pricingSnapshotId')::uuid,1,now()+make_interval");
    });
  }
});