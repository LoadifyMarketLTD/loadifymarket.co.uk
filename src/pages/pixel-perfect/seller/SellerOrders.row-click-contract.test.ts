import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'src/pages/pixel-perfect/seller/SellerOrders.tsx'), 'utf8');

describe('seller order row click contract', () => {
  it('opens order details from the whole mobile card', () => {
    expect(source).toContain('role="button"');
    expect(source).toContain('onClick={() => navigate(`/seller/orders/${o.id}`)}');
  });

  it('opens order details from the whole desktop row', () => {
    expect(source).toContain('className="cursor-pointer hover:bg-muted/20 transition-colors');
    expect(source).toContain('tabIndex={0}');
  });

  it('keeps nested action controls independent', () => {
    expect(source).toContain('event.stopPropagation()');
  });
});