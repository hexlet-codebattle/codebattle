/* eslint-disable global-require */
import i18next from 'i18next';
// import Gon from 'gon';
import { en } from 'virtual:i18next-loader';

const lng = (window.Gon.getAsset('locale') || navigator.language || navigator.userLanguage).slice(0, 2);

export const getLocale = () => lng;

i18next.init({
  nsSeparator: false,
  keySeparator: false,
  lng: 'en',
  interpolation: {
    prefix: '%{',
    suffix: '}',
  },
  resources: {
    en: {
      translation: en,
    },
  },
});

export default i18next;
