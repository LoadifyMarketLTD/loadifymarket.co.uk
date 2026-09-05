const SITE_NAME = 'Loadify Market';

export function buildSeoTitle(title: string): string {
  const normalized = title.trim();
  if (
    normalized === SITE_NAME
    || normalized.startsWith(`${SITE_NAME} |`)
    || normalized.endsWith(` | ${SITE_NAME}`)
  ) {
    return normalized;
  }
  return `${normalized} | ${SITE_NAME}`;
}
