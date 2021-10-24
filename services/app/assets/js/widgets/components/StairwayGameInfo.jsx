import React, { memo } from 'react';

import _ from 'lodash';
import Task from './Task';

const StairwayGameInfo = ({ rounds, roundId }) => {
    const task = _.find(rounds, { id: roundId }, null);

    if (task === null) {
        throw new Error('invalid roundId');
    }

    return (
      <Task
        task={task}
      />
    );
};

export default memo(StairwayGameInfo);
