import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Google Play marketplace compliance boundaries', () => {
  it('fails closed on service commerce across listing and payment boundaries', () => {
    for (const path of [
      'netlify/functions/create-product.ts',
      'netlify/functions/update-product.ts',
      'netlify/functions/create-checkout.ts',
      'netlify/functions/create-payment-intent.ts',
    ]) expect(read(path)).toContain('PHYSICAL_GOODS_ONLY');

    const form = read('src/pages/ProductFormPage.tsx');
    expect(form).toContain('currently supports physical goods only');
    expect(form).not.toContain('Digital or in-person service');
  });

  it('provides dedicated in-app user and review reporting with hardened RLS', () => {
    const dialog = read('src/components/safety/SafetyReportDialog.tsx');
    expect(dialog).toContain('reported_users');
    expect(dialog).toContain('reported_reviews');
    expect(read('src/components/product/ProductReviews.tsx')).toContain('triggerLabel="Report review"');
    expect(read('src/components/product/ProductReviews.tsx')).toContain('triggerLabel="Report user"');
    expect(read('src/pages/SellerPublicProfilePage.tsx')).toContain('triggerLabel="Report seller"');
    const migration = read('supabase/migrations/20260908213000_play_v1_compliance_boundaries.sql');
    expect(migration).toContain('trg_guard_play_v1_physical_goods_only');
    expect(migration).toContain("NEW.\"listingContext\" = 'service'");
    expect(migration).toContain('ALTER TABLE public.reported_users ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE public.reported_reviews ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('NEW."reportedBy" := (SELECT auth.uid())');
    expect(migration).toContain('(SELECT public.is_active_user())');
    expect(migration).not.toContain('auth.role()');
    expect(read('src/pages/MobileChatPage.tsx')).toContain('triggerLabel={`Report ${otherName}`}');
  });
});
