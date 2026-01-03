import langToSpacesMapping from '../config/langToSpacesMapping';
import languageTabSizes from '../config/languageTabSizes';

const getLanguageTabSize = (language) => {
  const defaultTabSize = 2;

  return languageTabSizes[language] || defaultTabSize;
};

export const shouldReplaceTabsWithSpaces = (language) => langToSpacesMapping[language] || false;

export default getLanguageTabSize;
