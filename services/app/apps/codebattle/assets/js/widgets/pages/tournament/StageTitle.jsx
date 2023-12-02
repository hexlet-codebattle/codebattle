import { memo } from 'react';

import capitalize from 'lodash/capitalize';

import mapStagesToTitle from '../../config/mapStagesToTitle';

function StageTitle({ stage, stagesLimit, hideDescription = false }) {
  if (stage === stagesLimit - 1) {
    return hideDescription ? 'Final' : 'Final stage';
  }

  if (stage === stagesLimit - 2) {
    return hideDescription ? 'Semi-final' : 'Semi-final stage';
  }

  return hideDescription
    ? capitalize(mapStagesToTitle[stage])
    : `Stage ${mapStagesToTitle[stage] || (stage + 1)}`;
}

export default memo(StageTitle);
