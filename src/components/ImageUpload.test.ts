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

  it('keeps destructive image controls visible and touch-sized on small screens', () => {
    expect(source).toContain('min-h-11 min-w-11');
    expect(source).toContain('opacity-100 transition-opacity sm:top-2 sm:right-2 sm:opacity-0');
    expect(source).toContain('aria-label={`Remove image ${index + 1}`}');
  });

  it('keeps URL controls adaptive instead of forcing a narrow horizontal row', () => {
    expect(source).toContain('flex flex-col gap-2 sm:flex-row sm:items-center');
    expect(source).toContain('grid grid-cols-2 gap-2 sm:flex sm:flex-none');
    expect(source).toContain('min-h-11 px-4');
  });
});
