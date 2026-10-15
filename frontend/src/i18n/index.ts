import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// The same gettext catalog the Phoenix app and the legacy frontend use. Keys are
// the English text, so English needs no catalog: a missing key renders itself.
// New UI strings need a hand-written entry in ru/default.po (gettext.extract
// doesn't scan JS).
import ru from '../../../priv/gettext/ru/LC_MESSAGES/default.po';

export const SUPPORTED_LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const normalize = (locale: unknown): Locale =>
  SUPPORTED_LOCALES.includes(locale as Locale) ? (locale as Locale) : 'en';

/** Call once before the first render, with the `locale` shared prop. */
export function initI18n(locale: unknown) {
  const lng = normalize(locale);

  void i18next.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    resources: { ru: { translation: ru } },
    // Keys contain ":" and "." (they're sentences), so no namespaces or nesting.
    nsSeparator: false,
    keySeparator: false,
    interpolation: { prefix: '%{', suffix: '}', escapeValue: false },
    returnEmptyString: false,
    react: { useSuspense: false },
  });

  document.documentElement.lang = lng;
}

/** Locale for Intl formatters (dates, relative times). */
export const getLocale = (): Locale => normalize(i18next.language);

export const t = i18next.t.bind(i18next);

export default i18next;
