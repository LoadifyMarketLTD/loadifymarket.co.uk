import { afterEach, describe, expect, it } from 'vitest';
import i18n from './index';

describe('internationalisation', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('serves Romanian translations when RO is active', async () => {
    await i18n.changeLanguage('ro');
    expect(i18n.t('nav.home')).toBe('Acasă');
    expect(i18n.t('market.RO')).toBe('România');
  });

  it('serves English translations for the UK market', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('nav.shopAll')).toBe('Shop all');
    expect(i18n.t('market.GB')).toBe('UK');
  });

  it('falls back to English for unsupported languages', () => {
    expect(i18n.t('nav.help', { lng: 'fr' })).toBe('Help');
  });
});
