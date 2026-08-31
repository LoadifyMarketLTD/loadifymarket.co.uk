import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function getCspDirectives() {
  const netlifyToml = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8');
  const match = netlifyToml.match(/Content-Security-Policy\s*=\s*"([^"]+)"/);

  if (!match) {
    throw new Error('Content-Security-Policy header is missing from netlify.toml');
  }

  return Object.fromEntries(
    match[1]
      .split(';')
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...sources] = directive.split(/\s+/);
        return [name, sources];
      }),
  );
}

describe('Netlify Google Identity Services CSP contract', () => {
  it('allows the Google GSI stylesheet without widening unrelated directives', () => {
    const directives = getCspDirectives();

    expect(directives['style-src']).toContain('https://accounts.google.com/gsi/style');
    expect(directives['style-src-elem']).toContain('https://accounts.google.com/gsi/style');

    expect(directives['script-src']).toContain('https://accounts.google.com');
    expect(directives['connect-src']).toContain('https://accounts.google.com');
    expect(directives['frame-src']).toContain('https://accounts.google.com');
  });
});
