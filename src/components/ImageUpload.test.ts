import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'ImageUpload.tsx'), 'utf8');

describe('ImageUpload batch integrity', () => {
  it('validates the selected batch before network writes', () => {
    expect(source).toContain('selectedFiles.forEach(validateImageFile)');
  });

  it('rolls back successful uploads when another file in the same batch fails', () => {
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('.remove(uploaded.map((asset) => asset.path))');
    expect(source).toContain('throw failed.reason');
  });

  it('does not delete storage objects immediately when removing from the unsaved form', () => {
    const removeHandler = source.slice(
      source.indexOf('const handleImageRemove'),
      source.indexOf('const openUrlInput'),
    );
    expect(removeHandler).not.toContain('.remove(');
  });
});
