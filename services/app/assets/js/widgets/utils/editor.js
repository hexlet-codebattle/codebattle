import languageTabSizes from '../config/languageTabSizes';

const getLanguageTabSize = language => {
  const defaultTabSize = 2;

  return languageTabSizes[language] || defaultTabSize;
};

export default getLanguageTabSize;
