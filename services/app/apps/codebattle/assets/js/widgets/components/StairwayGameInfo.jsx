import React, { memo } from 'react';

import _ from 'lodash';
import TaskAssignment from './TaskAssignment';

const StairwayGameInfo = ({ tasks, currentTaskId }) => {
  if (!tasks) {
    return null;
  }

  const task = _.find(tasks, { id: currentTaskId }, null);

  if (!task) {
    return null;
  }

  return <TaskAssignment task={task} />;
};

export default memo(StairwayGameInfo);
