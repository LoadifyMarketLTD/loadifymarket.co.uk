import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'ProductFormPage.tsx'), 'utf8');

describe('ProductFormPage responsive/touch contract', () => {
  it('uses compact mobile section padding and responsive page typography', () => {
    expect(source).toContain('rounded-xl p-4 sm:p-6 mb-6');
    expect(source).toContain('container mx-auto px-3 sm:px-4');
    expect(source).toContain('text-2xl sm:text-3xl font-bold');
  });

  it('stacks listing type and post-publish actions on narrow screens', () => {
    expect(source).toContain('flex flex-col sm:flex-row gap-4');
    expect(source).toContain('flex flex-col sm:flex-row sm:flex-wrap gap-2');
    expect(source).toContain('min-h-11 w-full sm:w-auto');
  });

  it('keeps publish/save controls touch-sized and full-width on narrow screens', () => {
    expect(source).toContain('flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-shrink-0');
    expect(source).toContain('className="min-h-11 w-full sm:w-auto px-4 py-2 rounded-lg');
  });

  it('lets custom specifications wrap vertically and keeps destructive controls touch-sized', () => {
    expect(source).toContain('flex flex-col sm:flex-row gap-2 sm:items-center');
    expect(source).toContain('min-h-11 min-w-11');
  });

  it('lets shipping availability controls wrap without shrinking tap targets', () => {
    expect(source).toContain('flex flex-wrap gap-4 sm:gap-6 mb-4');
    expect(source).toContain('min-h-11 flex items-center gap-2 cursor-pointer');
  });

  it('uses lock-specific delete wording instead of claiming all completed orders are active locks', () => {
    expect(source).toContain('Cannot delete while this listing has an active reservation or paid order lock.');
    expect(source).not.toContain('Cannot delete — this product has active or completed orders.');
  });
});
