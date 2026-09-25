import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MARKET_CONFIG } from '@/lib/marketConfig';
import { resolveInitialMarket } from '@/lib/marketResolver';
import { en, ro } from './resources';

const initialMarket = resolveInitialMarket();
const initialLanguage = MARKET_CONFIG[initialMarket].language;

void i18n
  .use(initReactI18next)
  .init({
    resources: { en, ro },
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ro'],
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

export default i18n;
