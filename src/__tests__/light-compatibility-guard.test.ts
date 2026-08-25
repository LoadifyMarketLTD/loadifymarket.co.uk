import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/light-compat.css', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');

describe('global light compatibility guard', () => {
  it('loads the compatibility layer after the base theme', () => {
    expect(main.indexOf('"./light-compat.css"')).toBeGreaterThan(main.indexOf('"./index.css"'));
  });

  it('keeps footer outside every compatibility selector', () => {
    expect(css).toContain(':not(footer):not(footer *)');
    expect(css).not.toMatch(/\nfooter\s*\{/);
    expect(css).not.toMatch(/\n\.\w*footer/i);
  });

  it('neutralises legacy dark page surfaces without globally rewriting white text', () => {
    for (const token of ['bg-slate-950', 'bg-slate-900', 'bg-gray-950', 'bg-gray-900', 'bg-black', 'bg-[#0A0E1A]', 'bg-[#121A2B]', 'bg-[#182235]']) {
      expect(css).toContain(token);
    }
    expect(css).not.toContain(':not(footer):not(footer *)[class*="text-white"] {');
  });

  it('keeps placeholder and disabled states visible on light surfaces', () => {
    expect(css).toContain('input::placeholder');
    expect(css).toContain('textarea::placeholder');
    expect(css).toContain(':disabled');
  });
});
