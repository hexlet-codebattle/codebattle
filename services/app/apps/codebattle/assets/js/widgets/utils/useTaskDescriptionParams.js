import { useMemo } from 'react';

import includes from 'lodash/includes';
import keys from 'lodash/keys';

import taskDescriptionLanguages from '../config/taskDescriptionLanguages';

const wrapExamplesInCodeBlock = (examples = '') => {
  const trimmed = examples.trim();

  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    return examples;
  }

  return `\`\`\`\n${examples}\n\`\`\``;
};

const useTaskDescriptionParams = (task, taskLanguage) => useMemo(() => {
    const avaibleLanguages = keys(task)
      .filter((key) => key.includes('description'))
      .map((key) => key.split('description'))
      .map(([, language]) => language.toLowerCase());

    const displayLanguage = includes(avaibleLanguages, taskLanguage)
      ? taskLanguage
      : taskDescriptionLanguages.default;

    const examples = wrapExamplesInCodeBlock(task.examples);

    // TODO: remove russian text from string (create ru/en templates of basic description)
    const taskDescriptionMapping = {
      en: `${task.descriptionEn}\n\n**Examples:**\n${examples}`,
      ru: `${task.descriptionRu}\n\n**Примеры:**\n${examples}`,
    };

    const description = taskDescriptionMapping[taskLanguage];

    return [avaibleLanguages, displayLanguage, description];
  }, [task, taskLanguage]);

export default useTaskDescriptionParams;
