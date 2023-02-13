import languageTabSizes from '../config/languageTabSizes';
import langToSpacesMapping from '../config/langToSpacesMapping';

const getLanguageTabSize = language => {
  const defaultTabSize = 2;

  return languageTabSizes[language] || defaultTabSize;
};

export const shouldReplaceTabsWithSpaces = language => langToSpacesMapping[language] || false;

export default getLanguageTabSize;
