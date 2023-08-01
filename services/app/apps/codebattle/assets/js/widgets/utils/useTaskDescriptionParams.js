import { useMemo } from 'react';
import _ from 'lodash';
import taskDescriptionLanguages from '../config/taskDescriptionLanguages';

const useTaskDescriptionParams = (task, taskLanguage) => useMemo(() => {
    const avaibleLanguages = _.keys(task)
      .filter(key => key.includes('description'))
      .map(key => key.split('description'))
      .map(([, language]) => language.toLowerCase());

    const displayLanguage = _.includes(avaibleLanguages, taskLanguage)
      ? taskLanguage
      : taskDescriptionLanguages.default;

    // TODO: remove russian text from string (create ru/en templates of basic description)
    const taskDescriptionMapping = {
      en: `${task.descriptionEn}\n\n**Examples:**\n${task.examples}`,
      ru: `${task.descriptionRu}\n\n**примеры:**\n${task.examples}`,
    };

    const description = taskDescriptionMapping[taskLanguage];

    return [avaibleLanguages, displayLanguage, description];
  }, [task, taskLanguage]);

export default useTaskDescriptionParams;
