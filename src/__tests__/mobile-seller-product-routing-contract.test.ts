import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('native seller product editor routing contract', () => {
  it('uses reliable Capacitor-context detection for editor routing', () => {
    const header = readRepo('src/components/Header.tsx');
    const form = readRepo('src/pages/ProductFormPage.tsx');
    expect(header).toContain('isCapacitorContext() && isNativeSellerProductEditorRoute(pathname)');
    expect(header).toContain('isCapacitorContext() && isNativeProfessionalRoute(pathname)');
    expect(form).toContain("const sellerListingsRoute = () => isCapacitorContext() ? '/profile/listings' : '/seller';");
  });

  it('keeps save, cancel and delete returns on the native listings workspace', () => {
    const form = readRepo('src/pages/ProductFormPage.tsx');
    expect(form.match(/navigate\(sellerListingsRoute\(\)\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(form).toContain("(publishMode ? sellerListingsRoute() : '/onboarding')");
  });
});