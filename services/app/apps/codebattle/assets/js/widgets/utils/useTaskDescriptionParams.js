import { useMemo } from 'react';

import includes from 'lodash/includes';
import keys from 'lodash/keys';

import taskDescriptionLanguages from '../config/taskDescriptionLanguages';

const wrapExamplesInCodeBlock = (examples) => {
  const safeExamples = typeof examples === 'string' ? examples : '';
  const trimmed = safeExamples.trim();

  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    return safeExamples;
  }

  return `\`\`\`\n${safeExamples}\n\`\`\``;
};

const useTaskDescriptionParams = (task, taskLanguage) => useMemo(() => {
    const safeTask = task || {};
    const normalizedTaskLanguage = taskLanguage || taskDescriptionLanguages.default;
    const avaibleLanguages = keys(safeTask)
      .filter((key) => key.includes('description'))
      .map((key) => key.split('description'))
      .map(([, language]) => language.toLowerCase());

    const displayLanguage = includes(avaibleLanguages, normalizedTaskLanguage)
      ? normalizedTaskLanguage
      : taskDescriptionLanguages.default;

    const examples = wrapExamplesInCodeBlock(safeTask.examples);

    // TODO: remove russian text from string (create ru/en templates of basic description)
    const taskDescriptionMapping = {
      en: `${safeTask.descriptionEn || ''}\n\n**Examples:**\n${examples}`,
      ru: `${safeTask.descriptionRu || ''}\n\n**Примеры:**\n${examples}`,
    };

    const description = taskDescriptionMapping[displayLanguage];

    return [avaibleLanguages, displayLanguage, description];
  }, [task, taskLanguage]);

export default useTaskDescriptionParams;
