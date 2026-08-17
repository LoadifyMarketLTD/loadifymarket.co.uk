import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'ShippingMethodSelector.tsx'), 'utf8');

describe('ShippingMethodSelector checkout compatibility', () => {
  it('does not hardcode a single courier', () => {
    expect(source).toContain(".eq('active', true)");
    expect(source).not.toContain(".eq('courier', 'Royal Mail')");
  });

  it('only exposes methods that have a checkout-valid numeric rate', () => {
    expect(source).toContain('getValidRates(method).length > 0');
    expect(source).toContain('Number.isFinite(price) && price >= 0');
    expect(source).not.toContain(": 'Free'");
  });

  it('keeps shipping choices touch-sized and exposes selection state accessibly', () => {
    expect(source).toContain('min-h-12 w-full');
    expect(source).toContain('aria-pressed={isSelected}');
    expect(source).toContain("border-white/10 bg-surface text-slate-300");
    expect(source).not.toContain('border-gray-200 bg-white text-gray-700');
  });
});
