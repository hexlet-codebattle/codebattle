import React, { memo } from 'react';

import _ from 'lodash';
import Task from './Task';

const StairwayGameInfo = ({ currentUserId, currentTaskId, tasks }) => {
    const currentTask = _.find(tasks, { id: currentTaskId }, null);

    if (currentTask === null) {
        throw new Error('invalid currentTaskId');
    }

    return (
      <Task
        task={currentTask}
        currentUserId={currentUserId}
      />
    );
};

export default memo(StairwayGameInfo);
