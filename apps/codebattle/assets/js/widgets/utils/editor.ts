import langToSpacesMapping from '../config/langToSpacesMapping';
import languageTabSizes from '../config/languageTabSizes';

const getLanguageTabSize = (language: string) => {
  const defaultTabSize = 2;

  return languageTabSizes[language as keyof typeof languageTabSizes] || defaultTabSize;
};

export const shouldReplaceTabsWithSpaces = (language: string) =>
  langToSpacesMapping[language as keyof typeof langToSpacesMapping] || false;

export default getLanguageTabSize;
