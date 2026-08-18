import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SUPABASE_DIR = resolve(process.cwd(), 'supabase');
const FORBIDDEN_FILENAME = /(xdrive|driver_workspace)/i;
const FORBIDDEN_SQL = [
  /driver_workspace/i,
  /xdriveRef/i,
  /xdriveQuoteId/i,
  /xdrive_webhook/i,
  /"carrierName"[^\n]*XDrive Logistics/i,
];

function sqlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sqlFiles(path);
    return entry.isFile() && entry.name.endsWith('.sql') ? [path] : [];
  });
}

describe('cross-project database guard', () => {
  it('keeps Loadify SQL source free of cross-project database identifiers', () => {
    const violations: string[] = [];

    for (const file of sqlFiles(SUPABASE_DIR)) {
      const repoPath = relative(process.cwd(), file).replaceAll('\\', '/');
      const contents = readFileSync(file, 'utf8');

      if (FORBIDDEN_FILENAME.test(repoPath)) {
        violations.push(`${repoPath}: forbidden cross-project filename`);
      }

      for (const pattern of FORBIDDEN_SQL) {
        if (pattern.test(contents)) {
          violations.push(`${repoPath}: matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
