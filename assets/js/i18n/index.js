import i18next from 'i18next';
import getVar from '../lib/phxVariables';

i18next.init({
  nsSeparator: false,
  keySeparator: false,
  lng : getVar('locale'),
  resources: {
    en: {
      translation: require('../../../priv/gettext/en/LC_MESSAGES/default.po')
    },
    ru: {
      translation: require('../../../priv/gettext/ru/LC_MESSAGES/default.po')
    }
  }
});

export default i18next;
