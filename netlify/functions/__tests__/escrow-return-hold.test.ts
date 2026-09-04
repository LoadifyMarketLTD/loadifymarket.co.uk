import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(resolve(process.cwd(), 'netlify/functions/escrow-release.ts'), 'utf8');

describe('escrow release return hold boundary', () => {
  it('holds seller release while a customer return remains active', () => {
    const escrowRelease = source();

    expect(escrowRelease).toContain(".from('returns')");
    expect(escrowRelease).toContain(".neq('status', 'rejected')");
    expect(escrowRelease).toContain('getActiveReturn(supabase, order.id)');
    expect(escrowRelease).toContain('held because a return is open or in progress');
  });

  it('re-checks active returns after the Stripe transfer and compensates the race', () => {
    const escrowRelease = source();

    expect(escrowRelease).toContain('postTransferReturn');
    expect(escrowRelease).toContain('returnId: postTransferReturn?.id');
    expect(escrowRelease).toContain('finalReturn');
    expect(escrowRelease).toContain('returnId: finalReturn?.id');
    expect(escrowRelease).toContain('order-return-transfer:');
  });
});
