import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// The same gettext catalog the Phoenix app and the legacy frontend use. Keys are
// the English text, so English needs no catalog: a missing key renders itself.
// New UI strings need entries in each locale's default.po (gettext.extract
// doesn't scan JS).
import es from '../../../priv/gettext/es/LC_MESSAGES/default.po';
import ru from '../../../priv/gettext/ru/LC_MESSAGES/default.po';
import zh from '../../../priv/gettext/zh/LC_MESSAGES/default.po';

export const SUPPORTED_LOCALES = ['en', 'ru', 'es', 'zh'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  zh: '简体中文',
};

export const isLocale = (locale: unknown): locale is Locale =>
  SUPPORTED_LOCALES.includes(locale as Locale);

export const normalizeLocale = (locale: unknown): Locale => isLocale(locale) ? locale : 'en';

/** Call once before the first render, with the `locale` shared prop. */
export function initI18n(locale: unknown) {
  const lng = normalizeLocale(locale);

  void i18next.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    resources: { ru: { translation: ru }, es: { translation: es }, zh: { translation: zh } },
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
export const getLocale = (): Locale => normalizeLocale(i18next.language);

export const t = i18next.t.bind(i18next);

export default i18next;
