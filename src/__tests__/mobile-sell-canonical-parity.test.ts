import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const mobileSellGate = readRepo('src/components/MobileSellGate.tsx');
const app = readRepo('src/App.tsx');
const canonicalEditor = readRepo('src/pages/ProductFormPage.tsx');
const imageUpload = readRepo('src/components/ImageUpload.tsx');

describe('mobile seller canonical listing parity', () => {
  it('keeps /sell as the mobile entry point but routes authenticated sellers to the canonical editor', () => {
    expect(app).toContain('path="sell"');
    expect(app).toContain('<MobileSellGate>');
    expect(mobileSellGate).toContain('<Navigate to="/seller/products/new" replace />');
    expect(mobileSellGate).toContain('hasSellerAccess(user)');
    expect(mobileSellGate).toContain('user.isActive !== true');
    expect(mobileSellGate).toContain('<RequireEmailVerified>');
  });

  it('does not duplicate publication or tax-gate semantics in the mobile entry gate', () => {
    expect(mobileSellGate).not.toContain('TAX_EVIDENCE_REQUIRED');
    expect(mobileSellGate).not.toContain('isActive: false');
    expect(mobileSellGate).not.toContain('Complete tax setup');
  });

  it('inherits the canonical editor image and listing contract on mobile', () => {
    expect(canonicalEditor).toContain('<ImageUpload');
    expect(canonicalEditor).toContain('maxImages={10}');
    expect(imageUpload).toContain('SOURCE_MAX_IMAGE_SIZE = 40 * 1024 * 1024');
    expect(imageUpload).toContain('MAX_IMAGE_EDGE = 2400');
    expect(imageUpload).toContain('TARGET_UPLOAD_SIZE');
    expect(imageUpload).toContain('Process sequentially');
  });
});
