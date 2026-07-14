// apps/codebattle/assets/js/i18n/index.ts
import i18next from 'i18next';

import { getPageProp } from '@/inertia/pageProps';

// ESM imports for translations (no require)
import en from '../../../priv/gettext/en/LC_MESSAGES/default.po';
import ru from '../../../priv/gettext/ru/LC_MESSAGES/default.po';

const supportedLocales = ['en', 'ru'] as const;
type SupportedLocale = (typeof supportedLocales)[number];

const normalizeLocale = (locale: unknown): SupportedLocale =>
  supportedLocales.includes(locale as SupportedLocale) ? (locale as SupportedLocale) : 'en';
const lng = normalizeLocale(getPageProp('locale'));
// const lng = "ru";

export const getLocale = () => lng;
export const getSupportedLocale = normalizeLocale;

i18next.init({
  nsSeparator: false,
  keySeparator: false,
  lng,
  interpolation: {
    prefix: '%{',
    suffix: '}',
  },
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
});

export default i18next;
