import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const orders = read('src/pages/MobileOrdersPage.tsx');
const evidence = read('src/lib/caseEvidence.ts');
const migration = read('supabase/migrations/20260914220000_case_evidence_and_timeline.sql');
const returnAction = read('netlify/functions/return-action.ts');
const sellerReturns = read('src/pages/pixel-perfect/seller/SellerReturns.tsx');
const disputeAction = read('netlify/functions/dispute-action.ts');

describe('mobile return and dispute evidence contract', () => {
  it('uses a private, size-limited image bucket', () => {
    expect(migration).toContain("'case-evidence'");
    expect(migration).toContain('public = false');
    expect(migration).toContain('file_size_limit = EXCLUDED.file_size_limit');
    expect(migration).toContain("ARRAY['image/jpeg', 'image/png', 'image/webp']");
  });

  it('restricts access to order participants and owner paths', () => {
    expect(migration).toContain('auth.uid() IN (o."buyerId", o."sellerId")');
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(migration).toContain("public.is_admin()");
  });
  it('validates immutable buyer and seller evidence paths', () => {
    expect(migration).toContain('private.valid_case_evidence_paths');
    expect(migration).toContain('NEW.images := OLD.images');
    expect(migration).toContain('NEW."sellerEvidence" := OLD."sellerEvidence"');
    expect(migration).toContain("'seller-response'");
  });

  it('cleans uploaded objects when a case write fails', () => {
    expect(evidence).toContain('await supabase.storage.from(CASE_EVIDENCE_BUCKET).remove(uploaded)');
    expect(orders).toContain('await removeCaseEvidence(evidencePaths)');
  });

  it('uses the native Android gallery and preserves partial valid selections', () => {
    expect(orders).toContain('NativeCamera.chooseFromGallery');
    expect(orders).toContain('Promise.allSettled');
    expect(orders).toContain('Some photos were skipped');
  });

  it('routes seller decisions through the authenticated server and sends buyer push deep links', () => {
    expect(returnAction).toContain("current.sellerId !== auth.actor.id");
    expect(returnAction).toContain("action === 'received' && !current.buyerTrackingNumber");
    expect(returnAction).toContain('sendPushToUser(admin, current.buyerId');
    expect(returnAction).toContain('/orders?mode=buy&orderId=');
    expect(orders).toContain('/.netlify/functions/return-action');
    expect(sellerReturns).toContain('/.netlify/functions/return-action');
    expect(disputeAction).toContain("dispute.sellerId !== auth.actor.id");
    expect(disputeAction).toContain('sendPushToUser(admin, targetId');
    expect(orders).toContain('/.netlify/functions/dispute-action');
  });

  it('shows participant evidence and a case timeline', () => {
    expect(orders).toContain('Buyer evidence');
    expect(orders).toContain('Seller evidence');
    expect(orders).toContain('Case timeline');
    expect(orders).toContain('Return tracking added');
    expect(orders).toContain('Escalated to Loadify');
  });
});
