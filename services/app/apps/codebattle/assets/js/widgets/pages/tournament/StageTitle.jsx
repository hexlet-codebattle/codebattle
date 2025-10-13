import { memo } from 'react';

import capitalize from 'lodash/capitalize';

import mapStagesToTitle from '../../config/mapStagesToTitle';

function StageTitle({ stage, hideDescription = false }) {
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
    ? capitalize(mapStagesToTitle[stage])
    : `Round ${(stage + 1)}`;
}

export default memo(StageTitle);
