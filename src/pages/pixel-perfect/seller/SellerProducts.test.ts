import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'SellerProducts.tsx'), 'utf8');

describe('SellerProducts publication-state contract', () => {
  it('uses moderation hold instead of the removed mandatory review state', () => {
    expect(source).toContain('moderation_hold');
    expect(source).toContain('Moderation Hold');
    expect(source).not.toContain('pending_review');
    expect(source).not.toContain('Pending Review');
  });

  it('only offers public sharing for listings that are actually visible', () => {
    expect(source).toContain('function isPubliclyShareable');
    expect(source).toContain('if (!p.isActive || !p.isApproved) return false;');
    expect(source).toContain('return (p.stockQuantity ?? 0) > 0;');
  });

  it('does not maintain a seller-written share counter', () => {
    expect(source).not.toContain('persistShareCount');
    expect(source).not.toContain('shareCount?:');
    expect(source).not.toContain('· Shares:');
    expect(source).not.toContain('>Shares<');
  });

  it('routes destructive deletion through the authenticated server contract', () => {
    expect(source).toContain('authorizedFetch("/.netlify/functions/delete-product"');
    expect(source).not.toContain('.from("products")\n        .delete()');
    expect(source).not.toContain('Could not pre-check listing order history');
  });

  it('keeps mobile, tablet, and desktop actions touch-sized', () => {
    expect(source).toContain('className="shrink-0 h-11 w-11 p-0"');
    expect(source).toContain('className="min-h-11" onClick={() => shareOnFacebook(p)}');
    expect(source).toContain('className={`min-h-11 px-3 py-1.5 rounded-full');
    expect(source).toContain('className="pl-9 h-11"');
    expect(source).toContain('className="min-h-11 text-xs"');
    expect(source).toContain('className="h-11 w-11 p-0"');
    expect(source).not.toContain('className="h-8 w-8 p-0"');
  });
});
