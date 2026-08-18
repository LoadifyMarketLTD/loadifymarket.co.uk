/**
 * Normalize the fast-list mobile price input without guessing thousands separators.
 *
 * The mobile `/sell` flow accepts plain amounts with an optional decimal point or
 * decimal comma and at most two decimal places. Ambiguous values such as `1,000`
 * or `1.000` are intentionally left untouched so parsing rejects them instead of
 * silently publishing the wrong price.
 */
export function normalizeDecimalInput(value: string): string {
  const v = value.trim();
  if (!v) return v;

  if (/^\d+(?:[.,]\d{0,2})?$/.test(v)) {
    return v.replace(',', '.');
  }

  return v;
}

export function parseDecimalInput(value: string): number | null {
  const normalized = normalizeDecimalInput(value);
  if (!normalized || !/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
