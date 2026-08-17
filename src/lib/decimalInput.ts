/**
 * Normalise a user-entered decimal string without assuming UK/US separators.
 *
 * Examples:
 *  - 39,99      -> 39.99
 *  - 13.150     -> 13150
 *  - 1,000.50   -> 1000.50
 *  - 1.000,50   -> 1000.50
 *  - 1.000.000  -> 1000000
 *  - 1,000      -> 1000
 *  - 1.99       -> 1.99
 */
export function normalizeDecimalInput(value: string): string {
  const v = value.trim();
  if (!v) return v;

  const periodCount = (v.match(/\./g) ?? []).length;
  const commaCount = (v.match(/,/g) ?? []).length;

  if (periodCount > 0 && commaCount > 0) {
    if (v.lastIndexOf(',') > v.lastIndexOf('.')) {
      return v.replace(/\./g, '').replace(',', '.');
    }
    return v.replace(/,/g, '');
  }

  if (commaCount > 0) {
    if (/^\d{1,3}(,\d{3})+$/.test(v)) return v.replace(/,/g, '');
    return v.replace(',', '.');
  }

  if (periodCount > 1) return v.replace(/\./g, '');

  if (periodCount === 1) {
    if (/^\d+\.\d{3}$/.test(v)) return v.replace('.', '');
    return v;
  }

  return v;
}

export function parseDecimalInput(value: string): number | null {
  const normalized = normalizeDecimalInput(value);
  if (!normalized || !/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
