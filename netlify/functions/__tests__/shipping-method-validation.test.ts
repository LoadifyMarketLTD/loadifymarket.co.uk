import { describe, expect, it, vi } from 'vitest';
import { validateActiveShippingMethodIds } from '../_shared/shippingMethods';

const FIRST_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_ID = '22222222-2222-4222-8222-222222222222';

function client(rows: Array<{ id: string }>, error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error });
  const inQuery = vi.fn().mockReturnValue({ eq });
  const select = vi.fn().mockReturnValue({ in: inQuery });
  return {
    from: vi.fn().mockReturnValue({ select }),
    calls: { select, inQuery, eq },
  };
}

describe('active shipping method validation', () => {
  it('deduplicates valid active method ids', async () => {
    const mock = client([{ id: FIRST_ID }, { id: SECOND_ID }]);
    const result = await validateActiveShippingMethodIds(
      mock as never,
      [FIRST_ID, SECOND_ID, FIRST_ID],
    );

    expect(result).toEqual({ ok: true, ids: [FIRST_ID, SECOND_ID] });
    expect(mock.calls.inQuery).toHaveBeenCalledWith('id', [FIRST_ID, SECOND_ID]);
    expect(mock.calls.eq).toHaveBeenCalledWith('active', true);
  });

  it('rejects malformed ids before querying Supabase', async () => {
    const mock = client([]);
    const result = await validateActiveShippingMethodIds(mock as never, ['not-a-uuid']);

    expect(result).toEqual({ ok: false, status: 400, error: 'One or more shipping methods are invalid.' });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('fails closed when any requested method is inactive or missing', async () => {
    const mock = client([{ id: FIRST_ID }]);
    const result = await validateActiveShippingMethodIds(mock as never, [FIRST_ID, SECOND_ID]);

    expect(result).toEqual({ ok: false, status: 400, error: 'One or more shipping methods are unavailable.' });
  });

  it('returns a server error when availability cannot be verified', async () => {
    const mock = client([], new Error('database unavailable'));
    const result = await validateActiveShippingMethodIds(mock as never, [FIRST_ID]);

    expect(result).toEqual({ ok: false, status: 500, error: 'Unable to validate shipping methods.' });
  });
});
