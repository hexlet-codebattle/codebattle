import { memo } from 'react';

import capitalize from 'lodash/capitalize';

import mapStagesToTitle from '../../config/mapStagesToTitle';

interface StageTitleProps {
  stage: number;
  hideDescription?: boolean;
}

function StageTitle({ stage, hideDescription = false }: StageTitleProps) {
  // TODO: fix tmp translation
  //
  // if (stage === stagesLimit - 1) {
  //   return hideDescription ? 'Раунд' : 'Раунд';
  // }
  //
  // if (stage === stagesLimit - 2) {
  //   return hideDescription ? 'Раунд' : '-final stage';
  // }

  return hideDescription
    ? capitalize(mapStagesToTitle[stage as keyof typeof mapStagesToTitle])
    : `Round ${stage + 1}`;
}

export default memo(StageTitle);
