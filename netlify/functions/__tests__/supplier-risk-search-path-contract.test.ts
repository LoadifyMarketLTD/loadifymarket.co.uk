import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('supplier risk assessment pgcrypto contract', () => {
  it('keeps digest schema-qualified under an empty SECURITY DEFINER search_path', () => {
    const sql = readFileSync(
      join(root, 'supabase/655_zz_supplier_risk_digest_search_path_fix.sql'),
      'utf8',
    );

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.server_supplier_risk_assessment_v1');
    expect(sql).toContain("SET search_path TO ''");
    expect(sql).toContain('extensions.digest(');
    expect(sql).not.toContain(':=encode(digest(');
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.server_supplier_risk_assessment_v1(uuid) FROM PUBLIC, anon, authenticated;',
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.server_supplier_risk_assessment_v1(uuid) TO service_role;',
    );
  });
});
