// apps/codebattle/assets/js/i18n/index.js
import Gon from "gon";
import i18next from "i18next";

// ESM imports for translations (no require)
import en from "../../../priv/gettext/en/LC_MESSAGES/default.po";
import ru from "../../../priv/gettext/ru/LC_MESSAGES/default.po";

const supportedLocales = ["en", "ru"];
const normalizeLocale = (locale) => (supportedLocales.includes(locale) ? locale : "en");
const lng = normalizeLocale(Gon?.getAsset?.("locale"));

export const getLocale = () => lng;
export const getSupportedLocale = normalizeLocale;

i18next.init({
  nsSeparator: false,
  keySeparator: false,
  lng,
  interpolation: {
    prefix: "%{",
    suffix: "}",
  },
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
});

export default i18next;
