import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('customer return eligibility boundary', () => {
  it('keeps the canonical automation anchored to delivered/completed orders and a 14-day window', () => {
    const automation = read('netlify/functions/_shared/customerReturnAutomation.ts');

    expect(automation).toContain("new Set(['delivered', 'completed'])");
    expect(automation).toContain('input.returnWindowDays ?? 14');
    expect(automation).toContain("return blocked('manual_review', 'delivery_date_unverified')");
    expect(automation).toContain("return blocked('ineligible', 'return_window_expired')");
  });

  it('enforces the same delivered evidence and 14-day window at the RLS helper boundary', () => {
    const migration = read('supabase/migrations/20260904192700_align_returns_to_delivery_boundary.sql');

    expect(migration).toContain("o.status IN ('delivered','completed')");
    expect(migration).toContain('FROM public.shipments s');
    expect(migration).toContain("lower(trim(s.status)) = 'delivered'");
    expect(migration).toContain("s.updated_at >= now() - interval '14 days'");
    expect(migration).toContain('s.updated_at <= now()');
  });
});
