import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), 'utf8');

const imageUpload = read('src/components/ImageUpload.tsx');
const editorCss = read('src/seller-listing-editor-light.css');

describe('Seller listing desktop density', () => {
  it('uses the available desktop width and explicit 12-column section spans', () => {
    expect(editorCss).toContain('max-width: 94rem !important');
    expect(editorCss).toContain('max-width: 100rem !important');
    expect(editorCss).toContain('form:has(input[name="listingContext"])');
    expect(editorCss).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
    expect(editorCss).toContain('grid-column: 1 / span 3;');
    expect(editorCss).toContain('grid-column: 4 / span 5;');
    expect(editorCss).toContain('grid-column: 9 / -1;');
  });
});

describe('Product photo automatic optimisation', () => {
  it('accepts large phone photos and converts them before the 5MB storage boundary', () => {
    expect(imageUpload).toContain('SOURCE_MAX_IMAGE_SIZE');
    expect(imageUpload).toContain('STORAGE_MAX_IMAGE_SIZE');
    expect(imageUpload).toContain('TARGET_UPLOAD_SIZE');
    expect(imageUpload).toContain('MAX_IMAGE_EDGE = 2400');
    expect(imageUpload).toContain("canvas.toBlob");
    expect(imageUpload).toContain("'image/webp'");
    expect(imageUpload).toContain('optimiseProductImage');
  });

  it('processes multiple photos sequentially and explains that sellers do not resize manually', () => {
    expect(imageUpload).toContain('for (let index = 0; index < selectedFiles.length; index += 1)');
    expect(imageUpload).toContain('You do not need to resize photos yourself.');
    expect(imageUpload).toContain('accept="image/*,.heic,.heif"');
  });
});
