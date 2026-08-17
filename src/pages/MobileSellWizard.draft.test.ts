import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'MobileSellWizard.tsx'), 'utf8');

describe('MobileSellWizard durable seller draft contract', () => {
  it('hydrates the user-scoped draft before autosave can write initial state', () => {
    expect(source).toContain('loadSellerListingDraft');
    expect(source).toContain('draftHydratedUserId !== userId');
    expect(source).toContain('if (!userId || draftHydratedUserId !== userId || createdListing) return;');
    expect(source).toContain('Restoring your draft…');
  });

  it('serializes autosave and uses a memoized payload for exhaustive hook dependencies', () => {
    expect(source).toContain('useMemo<SellerListingDraftPayload>');
    expect(source).toContain('persistQueueRef.current');
    expect(source).toContain('saveSellerListingDraft(userId, payload)');
    expect(source).toContain('[createdListing, draftHydratedUserId, draftPayload, user?.id]');
  });

  it('clears the durable draft only after server-confirmed creation or explicit discard', () => {
    expect(source).toContain('await queueDraftClear(user.id);');
    expect(source).toContain('const handleDiscardDraft = async () =>');
    expect(source).toContain('Discard this draft?');
    expect(source).toContain('onClick={() => navigate(-1)}');
    expect(source).not.toContain("onClick={() => { clearSellerListingDraft");
  });

  it('keeps camera and gallery as separate mobile actions', () => {
    expect(source).toContain('const cameraInputRef = useRef<HTMLInputElement>(null);');
    expect(source).toContain('const galleryInputRef = useRef<HTMLInputElement>(null);');
    expect(source).toContain('capture="environment"');
    expect(source).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(source).toContain('Choose photos from gallery');
  });

  it('publishes the canonical Loadify product condition instead of a parallel mobile taxonomy', () => {
    expect(source).toContain("{ value: 'used', label: 'Used' }");
    expect(source).toContain("{ value: 'refurbished', label: 'Refurbished' }");
    expect(source).toContain("{ value: 'returns_stock', label: 'Returns stock' }");
    expect(source).toContain("{ value: 'mixed', label: 'Mixed condition' }");
    expect(source).toContain("condition: form.condition || undefined");
    expect(source).not.toContain("value: 'like_new'");
    expect(source).not.toContain("value: 'good'");
    expect(source).not.toContain("value: 'fair'");
    expect(source).not.toContain("value: 'poor'");
  });

  it('keeps critical mobile controls at least 44px tall', () => {
    expect(source).toContain("width: '44px'");
    expect(source).toContain("height: '44px'");
    expect(source).toContain('w-11 h-11');
    expect(source).toContain('min-h-12');
  });
});
