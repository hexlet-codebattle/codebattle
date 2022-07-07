import languageTabSizes from '../config/languageTabSizes';

export const getLanguageTabSize = language => {
  const defaultTabSize = 2;

  return languageTabSizes[language] || defaultTabSize;
};
